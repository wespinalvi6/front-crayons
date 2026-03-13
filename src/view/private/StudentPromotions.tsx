import { useState, useMemo, useEffect } from "react";
import api from "@/lib/axios";

const estadoBadge = (estado: string) => {
  if (estado?.toLowerCase() === "activo") return { label: "Activo", bg: "#e8f5e9", color: "#2e7d32" };
  if (estado?.toLowerCase() === "egresado") return { label: "Egresado", bg: "#fff3e0", color: "#e65100" };
  if (estado?.toLowerCase() === "inactivo") return { label: "Sin acceso", bg: "#fce4ec", color: "#c62828" };
  if (estado?.toLowerCase() === "promovido") return { label: "Promovido", bg: "#eff6ff", color: "#2563eb" };
  return { label: estado, bg: "#f5f5f5", color: "#555" };
};

interface Alumno {
  id_matricula: number;
  nombre_completo: string;
  seccion: string;
  promedio: string | number;
  estado: string;
  alumno_estado: string;
  puede_promover: boolean;
  grado?: string;
}

interface Grado {
  id: number;
  nombre: string;
  numero_grado: number;
}

interface Periodo {
  id: number;
  anio: number;
  activo: number;
}

interface HistorialItem {
  fecha: string;
  tipo: string;
  alumnos: (string | undefined)[];
  de: string;
  a: string | null;
}

export default function PromocionAlumnos() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [gradoOrigenId, setGradoOrigenId] = useState<string>("");
  const [seccionFiltro, setSeccionFiltro] = useState<string>("Todas");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [periodoActual, setPeriodoActual] = useState<Periodo | null>(null);
  const [periodoSiguiente, setPeriodoSiguiente] = useState<Periodo | null>(null);
  const [todoPeriodos, setTodoPeriodos] = useState<Periodo[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null); // null | "seleccion" | "grado" | "egreso" | "individual"
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [tab, setTab] = useState<string>("promover"); // "promover" | "historial" | "egresados"

  const [esUltimoGrado, setEsUltimoGrado] = useState<boolean>(false);
  const [nombreGradoActual, setNombreGradoActual] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [idIndividual, setIdIndividual] = useState<number | null>(null);

  // Cargar Catálogos (Grados y Periodos)
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [gradosRes, catalogoRes] = await Promise.all([
          api.get("/grado/lista-grado"),
          api.get("/horario/catalogos")
        ]);

        if (gradosRes.data.status) {
          setGrados(gradosRes.data.data);
          if (gradosRes.data.data.length > 0) {
            setGradoOrigenId(String(gradosRes.data.data[0].id));
          }
        }

        if (catalogoRes.data.success) {
          const rawPeriodos: Periodo[] = catalogoRes.data.data.periodos || [];
          const ordenados = [...rawPeriodos].sort((a, b) => a.anio - b.anio);
          setTodoPeriodos(ordenados);

          const actual = ordenados.find((p: Periodo) => p.activo === 1);
          if (actual) {
            setPeriodoActual(actual);
            const idx = ordenados.findIndex(p => p.id === actual.id);
            setPeriodoSiguiente(ordenados[idx + 1] || null);
          }
        }
      } catch (error) {
      }
    };
    fetchCatalogos();
  }, []);

  // Cargar Alumnos del Grado seleccionado
  const fetchAlumnosGrado = async () => {
    if (!gradoOrigenId || !periodoActual) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/promocion/alumnos-estado`, {
        params: {
          periodId: periodoActual.id,
          gradoId: gradoOrigenId
        }
      });

      if (data.status) {
        setAlumnos(data.data || []);
        setEsUltimoGrado(data.esUltimoGrado);
        setNombreGradoActual(data.nombreGrado);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumnosGrado();
  }, [gradoOrigenId, periodoActual]);

  const gradoDestinoNombre = useMemo(() => {
    if (esUltimoGrado) return null;
    const currentIdx = grados.findIndex(g => String(g.id) === gradoOrigenId);
    if (currentIdx !== -1 && currentIdx < grados.length - 1) {
      return grados[currentIdx + 1].nombre;
    }
    return "Siguiente Grado";
  }, [gradoOrigenId, grados, esUltimoGrado]);

  const alumnosFiltrados = useMemo(() => {
    return alumnos.filter(
      (a) => {
        const matchesSeccion = seccionFiltro === "Todas" || a.seccion === seccionFiltro;
        // En la pestaña promover, solo mostramos los que no han sido procesados (Promovido)
        const isNotProcessed = a.estado !== "Promovido";
        return matchesSeccion && isNotProcessed;
      }
    );
  }, [alumnos, seccionFiltro]);

  const secciones = useMemo(() => {
    const s = [...new Set(alumnos.map((a) => a.seccion))];
    return ["Todas", ...s.sort()];
  }, [alumnos]);

  const egresados = useMemo(() => alumnos.filter((a) => a.alumno_estado?.toLowerCase() === "egresado"), [alumnos]);

  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === alumnosFiltrados.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(alumnosFiltrados.map((a) => a.id_matricula));
    }
  };

  const ejecutarPromocionIndividual = async (idMatricula: number) => {
    if (!periodoSiguiente && !esUltimoGrado) {
      alert("No se ha definido un periodo siguiente para la promoción.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/promocion/promover-individual/${idMatricula}`, {
        periodIdSiguiente: periodoSiguiente?.id || null
      });

      if (data.success || data.status) {
        // Actualizamos localmente o volvemos a cargar
        await fetchAlumnosGrado();
        const alumno = alumnos.find(a => a.id_matricula === idMatricula);
        const ahora = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
        setHistorial(prev => [
          {
            fecha: ahora,
            tipo: esUltimoGrado ? "Egreso" : "Promoción",
            alumnos: [alumno?.nombre_completo],
            de: nombreGradoActual,
            a: esUltimoGrado ? "Egresado" : gradoDestinoNombre,
          },
          ...prev
        ]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
      setConfirmando(null);
    }
  };

  const ejecutarProcesarMasivo = async () => {
    if (!periodoActual || (!periodoSiguiente && !esUltimoGrado)) {
      alert("No se han definido periodos para procesar promociones o repeticiones.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/promocion/procesar-masivo`, {
        periodIdActual: periodoActual.id,
        periodIdSiguiente: periodoSiguiente?.id || null,
        gradoId: parseInt(gradoOrigenId),
        idsPromovidos: seleccionados // Solo los marcados pasarán al siguiente grado
      });

      if (data.success || data.status) {
        await fetchAlumnosGrado();
        setHistorial(prev => [
          {
            fecha: new Date().toLocaleDateString("es-PE"),
            tipo: esUltimoGrado ? "Egreso/Repetición" : "Promoción/Repetición",
            alumnos: [`Todo el grado ${nombreGradoActual}`],
            de: nombreGradoActual,
            a: esUltimoGrado ? "Egreso/Mismo Grado" : `Siguiente Grado / Mismo Grado`,
          },
          ...prev
        ]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
      setConfirmando(null);
    }
  };


  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f4f5f7", minHeight: "100vh", color: "#1a1d23" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e4e9", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 0" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb" }} />
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Sistema Escolar</span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Promoción de Alumnos</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <select
                  value={periodoActual?.id || ""}
                  onChange={(e) => {
                    const p = todoPeriodos.find(x => String(x.id) === e.target.value);
                    if (p) {
                      setPeriodoActual(p);
                      const idx = todoPeriodos.findIndex(x => x.id === p.id);
                      setPeriodoSiguiente(todoPeriodos[idx + 1] || null);
                      setSeleccionados([]);
                    }
                  }}
                  style={{
                    appearance: "none",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 6,
                    padding: "5px 32px 5px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1d4ed8",
                    cursor: "pointer",
                    outline: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231d4ed8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                    backgroundSize: "16px"
                  }}
                >
                  {todoPeriodos.map((p) => (
                    <option key={p.id} value={p.id}>Año Escolar {p.anio}</option>
                  ))}
                </select>
              </div>
              {periodoActual && (
                <div style={{ color: "#9ca3af", fontSize: 13, fontWeight: 500 }}>
                  {periodoSiguiente ? `- Destino Próximo` : ""}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginTop: 16 }}>
            {[
              { key: "promover", label: "Promover Alumnos" },
              { key: "historial", label: `Historial (${historial.length})` },
              { key: "egresados", label: `Egresados (${egresados.length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "10px 18px",
                  fontSize: 14, fontWeight: 600, color: tab === t.key ? "#1d4ed8" : "#6b7280",
                  borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>

        {/* Resumen de grados */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
          {grados.map((g) => (
            <div
              key={g.id}
              style={{
                flex: "0 0 160px", background: "#fff", border: String(g.id) === gradoOrigenId && tab === "promover" ? "1.5px solid #2563eb" : "1px solid #e2e4e9",
                borderRadius: 8, padding: "12px 16px", cursor: "pointer",
                transition: "all 0.15s",
              }}
              onClick={() => { setGradoOrigenId(String(g.id)); setSeleccionados([]); setTab("promover"); }}
            >
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Grado</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: String(g.id) === gradoOrigenId && tab === "promover" ? "#2563eb" : "#111827" }}>{g.nombre}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                Periodo {periodoActual?.anio || "..."}
              </div>
            </div>
          ))}
        </div>

        {/* TAB: PROMOVER */}
        {tab === "promover" && (
          <>
            {/* Barra de acción */}
            <div style={{ background: "#fff", border: "1px solid #e2e4e9", borderRadius: 10, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, display: "block", marginBottom: 4 }}>GRADO ORIGEN</label>
                  <select
                    value={gradoOrigenId}
                    onChange={(e) => { setGradoOrigenId(e.target.value); setSeleccionados([]); }}
                    style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 14, fontWeight: 600, color: "#111827", background: "#f9fafb", outline: "none" }}
                  >
                    {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>

                <div style={{ color: "#9ca3af", fontSize: 18, paddingTop: 18 }}>-</div>

                <div>
                  <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, display: "block", marginBottom: 4 }}>DESTINO</label>
                  {esUltimoGrado ? (
                    <div style={{ border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 14px", fontSize: 14, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff" }}>
                      Egreso
                    </div>
                  ) : (
                    <select
                      value={periodoSiguiente?.id || ""}
                      onChange={(e) => {
                        const p = todoPeriodos.find(x => String(x.id) === e.target.value);
                        setPeriodoSiguiente(p || null);
                      }}
                      style={{ border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 10px", fontSize: 14, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", outline: "none" }}
                    >
                      {todoPeriodos
                        .filter(p => !periodoActual || p.anio > periodoActual.anio)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {gradoDestinoNombre} · {p.anio}
                          </option>
                        ))
                      }
                      {todoPeriodos.filter(p => !periodoActual || p.anio >= periodoActual.anio).length === 0 && (
                        <option value="">No hay periodos disponibles</option>
                      )}
                    </select>
                  )}
                </div>

                <div style={{ borderLeft: "1px solid #e2e4e9", paddingLeft: 16, marginLeft: 4 }}>
                  <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, display: "block", marginBottom: 4 }}>SECCIÓN</label>
                  <select
                    value={seccionFiltro}
                    onChange={(e) => { setSeccionFiltro(e.target.value); setSeleccionados([]); }}
                    style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 14, color: "#374151", background: "#f9fafb", outline: "none" }}
                  >
                    {secciones.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {seleccionados.length > 0 && (
                  <>
                    {!esUltimoGrado ? (
                      <button
                        onClick={() => setConfirmando("seleccion")}
                        style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                      >
                        Promover {seleccionados.length} seleccionado{seleccionados.length > 1 ? "s" : ""}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmando("egreso")}
                        style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                      >
                        Egresar {seleccionados.length} seleccionado{seleccionados.length > 1 ? "s" : ""}
                      </button>
                    )}
                  </>
                )}
                {alumnosFiltrados.length > 0 && !esUltimoGrado && (
                  <button
                    onClick={() => setConfirmando("grado")}
                    style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Procesar todo {nombreGradoActual}
                  </button>
                )}
                {alumnosFiltrados.length > 0 && esUltimoGrado && (
                  <button
                    onClick={() => { setConfirmando("grado"); }}
                    style={{ background: "#fff5f5", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Egresar todos de {nombreGradoActual}
                  </button>
                )}
              </div>
            </div>

            {/* Aviso 5to */}
            {esUltimoGrado && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16 }}>Aviso</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#9a3412" }}>{nombreGradoActual} — Egreso al finalizar {periodoActual?.anio}</div>
                  <div style={{ fontSize: 12, color: "#c2410c", marginTop: 2 }}>Al egresar, los alumnos ya no figurarán como activos para el próximo ciclo. Esta acción no se puede deshacer fácilmente.</div>
                </div>
              </div>
            )}

            {/* Tabla */}
            <div style={{ background: "#fff", border: "1px solid #e2e4e9", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #e2e4e9" }}>
                    <th style={{ padding: "11px 16px", textAlign: "left", width: 40 }}>
                      <input
                        type="checkbox"
                        checked={alumnosFiltrados.length > 0 && seleccionados.length === alumnosFiltrados.length}
                        onChange={toggleTodos}
                        style={{ cursor: "pointer", accentColor: "#2563eb" }}
                      />
                    </th>
                    <th style={{ padding: "11px 8px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>#</th>
                    <th style={{ padding: "11px 8px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Alumno</th>
                    <th style={{ padding: "11px 8px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sección</th>
                    <th style={{ padding: "11px 8px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Promedio</th>
                    <th style={{ padding: "11px 8px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estado</th>
                    <th style={{ padding: "11px 16px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: 14 }}>
                        Cargando alumnos...
                      </td>
                    </tr>
                  ) : alumnosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                        No hay alumnos activos en {nombreGradoActual} {seccionFiltro !== "Todas" ? `· Sección ${seccionFiltro}` : ""} para {periodoActual?.anio}
                      </td>
                    </tr>
                  ) : (
                    alumnosFiltrados.map((a, i) => {
                      const badge = estadoBadge(a.estado);
                      const sel = seleccionados.includes(a.id_matricula);
                      const promedio = parseFloat(String(a.promedio || 0));
                      return (
                        <tr key={a.id_matricula} style={{ borderBottom: "1px solid #f0f1f3", background: sel ? "#eff6ff" : "transparent", transition: "background 0.1s" }}>
                          <td style={{ padding: "11px 16px" }}>
                            <input type="checkbox" checked={sel} onChange={() => toggleSeleccion(a.id_matricula)} style={{ cursor: "pointer", accentColor: "#2563eb" }} />
                          </td>
                          <td style={{ padding: "11px 8px", fontSize: 13, color: "#9ca3af", fontFamily: "'DM Mono', monospace" }}>{String(i + 1).padStart(2, "0")}</td>
                          <td style={{ padding: "11px 8px" }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.nombre_completo}</div>
                          </td>
                          <td style={{ padding: "11px 8px" }}>
                            <span style={{ background: "#f1f5f9", borderRadius: 4, padding: "3px 8px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Sec. {a.seccion}</span>
                          </td>
                          <td style={{ padding: "11px 8px" }}>
                            <span style={{
                              fontWeight: 700, fontSize: 14,
                              color: promedio >= 9 ? "#16a34a" : promedio >= 7 ? "#d97706" : "#dc2626"
                            }}>{promedio.toFixed(1)}</span>
                          </td>
                          <td style={{ padding: "11px 8px" }}>
                            <span style={{ background: badge.bg, color: badge.color, borderRadius: 4, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{badge.label}</span>
                          </td>
                          <td style={{ padding: "11px 16px", textAlign: "right" }}>
                            {esUltimoGrado ? (
                              <button
                                onClick={() => { setIdIndividual(a.id_matricula); setConfirmando("individual"); }}
                                style={{ background: "none", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}
                                disabled={!a.puede_promover}
                              >
                                Egresar
                              </button>
                            ) : (
                              <button
                                onClick={() => { setIdIndividual(a.id_matricula); setConfirmando("individual"); }}
                                style={{ background: "none", border: "1px solid #bfdbfe", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#2563eb", cursor: "pointer" }}
                                disabled={!a.puede_promover}
                              >
                                Promover
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {alumnosFiltrados.length > 0 && (
                <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f1f3", background: "#f8f9fb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{alumnosFiltrados.length} alumnos · {seleccionados.length} seleccionados</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Periodo {periodoActual?.anio}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB: HISTORIAL */}
        {tab === "historial" && (
          <div style={{ background: "#fff", border: "1px solid #e2e4e9", borderRadius: 10, overflow: "hidden" }}>
            {historial.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay movimientos registrados aún</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #e2e4e9" }}>
                    {["Fecha", "Tipo", "De", "A", "Alumnos"].map((h) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f1f3" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>{h.fecha}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: h.tipo === "Egreso" ? "#fff5f5" : "#eff6ff",
                          color: h.tipo === "Egreso" ? "#dc2626" : "#2563eb",
                          borderRadius: 4, padding: "3px 8px", fontSize: 11, fontWeight: 600
                        }}>{h.tipo}</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14 }}>{h.de}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14, color: h.a === "Egresado" ? "#dc2626" : "#16a34a" }}>{h.a}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151" }}>
                        {h.alumnos.length > 2 ? `${h.alumnos[0]}, ${h.alumnos[1]} y ${h.alumnos.length - 2} más` : h.alumnos.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB: EGRESADOS */}
        {tab === "egresados" && (
          <div style={{ background: "#fff", border: "1px solid #e2e4e9", borderRadius: 10, overflow: "hidden" }}>
            {egresados.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay alumnos egresados todavía</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #e2e4e9" }}>
                    {["Alumno", "Último grado", "Sección", "Promedio", "Acceso al sistema"].map((h) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {egresados.map((a) => (
                    <tr key={a.id_matricula} style={{ borderBottom: "1px solid #f0f1f3" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.nombre_completo}</td>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "#374151" }}>{a.grado === "5to" ? "5to" : a.grado}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: "#f1f5f9", borderRadius: 4, padding: "3px 8px", fontSize: 12, fontWeight: 600, color: "#475569" }}>Sec. {a.seccion}</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14, color: "#d97706" }}>{parseFloat(String(a.promedio || 0)).toFixed(1)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: "#fce4ec", color: "#c62828", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                          Sin acceso {periodoSiguiente?.anio}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {confirmando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                {confirmando === "egreso" || (confirmando === "individual" && esUltimoGrado) ? "Confirmar Egreso" : "Confirmar Promoción"}
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                {confirmando === "egreso" || (confirmando === "individual" && esUltimoGrado) ? (
                  <>
                    Vas a egresar <strong style={{ color: "#111827" }}>{confirmando === "individual" ? "al alumno" : `${seleccionados.length} alumnos`}</strong> de {nombreGradoActual}.<br />
                    <span style={{ color: "#dc2626", fontWeight: 500 }}>Los alumnos finalizados ya no podrán registrarse en el siguiente ciclo escolar.</span>
                  </>
                ) : confirmando === "grado" ? (
                  <>
                    Vas a procesar <strong style={{ color: "#111827" }}>todo el grado</strong> de <strong>{nombreGradoActual}</strong>.<br />
                    • <strong style={{ color: "#16a34a" }}>{seleccionados.length}</strong> {esUltimoGrado ? "egresarán" : `pasarán a ${gradoDestinoNombre}`}.<br />
                    • <strong style={{ color: "#d97706" }}>{alumnosFiltrados.length - seleccionados.length}</strong> {esUltimoGrado ? "permanecerán en el sistema" : `repitirán ${nombreGradoActual}`} {periodoSiguiente ? `para ${periodoSiguiente.anio}` : ""}.
                  </>
                ) : (
                  <>
                    Vas a promover <strong style={{ color: "#111827" }}>{confirmando === "individual" ? "al alumno" : `${seleccionados.length} alumnos`}</strong> de{" "}
                    <strong>{nombreGradoActual}</strong> a <strong style={{ color: "#2563eb" }}>{gradoDestinoNombre} · {periodoSiguiente?.anio}</strong>.
                  </>
                )}
              </div>
            </div>

            <div style={{ background: "#f8f9fb", borderRadius: 8, padding: "12px 14px", marginBottom: 20, maxHeight: 150, overflowY: "auto" }}>
              {(confirmando === "grado" ? alumnosFiltrados : confirmando === "individual" ? alumnos.filter(a => a.id_matricula === idIndividual) : alumnos.filter((a) => seleccionados.includes(a.id_matricula))).map((a) => {
                const isPromoted = confirmando === "grado" ? seleccionados.includes(a.id_matricula) : true;
                return (
                  <div key={a.id_matricula} style={{ fontSize: 13, color: "#374151", padding: "4px 0", borderBottom: "1px solid #f0f1f3", display: "flex", justifyContent: "space-between" }}>
                    <span>{a.nombre_completo}</span>
                    <span style={{ fontWeight: 600, color: isPromoted ? "#16a34a" : "#d97706", fontSize: 11 }}>
                      {confirmando === "grado" ? (isPromoted ? (esUltimoGrado ? "EGRESO" : "PASA") : "REPITE") : (esUltimoGrado ? "EGRESO" : "PASA")}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setConfirmando(null); }}
                style={{ background: "#f3f4f6", border: "none", borderRadius: 7, padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151" }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmando === "grado") {
                    ejecutarProcesarMasivo();
                  } else if (confirmando === "individual") {
                    if (idIndividual !== null) ejecutarPromocionIndividual(idIndividual);
                  } else {
                    // Para selección múltiple, podríamos iterar o el API podría soportarlo. 
                    // El usuario pidió masivo (todo el grado) e individual.
                    // Para selección múltiple usaremos el individual por ahora si es uno solo, o avisar.
                    if (seleccionados.length === 1) {
                      ejecutarPromocionIndividual(seleccionados[0]);
                    } else if (seleccionados.length > 1) {
                      // Si el API de masivo no soporta lista de IDs, podríamos tener que iterar.
                      // Pero el usuario proporcionó endpoints específicos.
                      alert("La promoción de múltiples seleccionados se procesará individualmente.");
                      Promise.all(seleccionados.map(id => ejecutarPromocionIndividual(id))).then(() => setConfirmando(null));
                    }
                  }
                }}
                disabled={loading}
                style={{
                  background: (confirmando === "egreso" || (confirmando === "individual" && esUltimoGrado)) ? "#dc2626" : "#2563eb",
                  color: "#fff", border: "none", borderRadius: 7, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer"
                }}
              >
                {loading ? "Procesando..." : (confirmando === "egreso" || (confirmando === "individual" && esUltimoGrado)) ? "Sí, egresar" : "Confirmar Proceso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
