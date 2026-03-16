import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { CalendarDays, Filter, Loader2, Clock, ChevronDown, ChevronRight } from "lucide-react";

type PeriodoItem = { id: number; anio: number; activo: number };
type DocenteItem = { id: number; nombre_completo: string };
type GradoItem = { id: number; nombre: string };
type CursoItem = { id: number; nombre: string };
type AsignacionDocente = {
  id_asignacion: number;
  id_curso: number;
  curso: string;
  id_grado: number;
  grado: string;
  id_seccion: number | null;
  seccion: string | null;
};

type ReporteRow = {
  id_periodo: number;
  anio: number;
  id_asignacion: number;
  id_docente: number;
  docente: string;
  id_curso: number;
  curso: string;
  id_grado: number;
  grado: string;
  id_seccion: number | null;
  seccion: string;
  id_horario: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string | null;
};

type Grupo = {
  key: string;
  docente: string;
  grado: string;
  curso: string;
  seccion: string;
  anio: number;
  bloques: ReporteRow[];
};

const DIA_ORDEN: Record<string, number> = {
  Lunes: 1, Martes: 2, Miercoles: 3, Jueves: 4, Viernes: 5, Sabado: 6, Domingo: 7,
};

const DIA_COLORS: Record<string, { bg: string; color: string }> = {
  Lunes: { bg: "#dbeafe", color: "#1d4ed8" },
  Martes: { bg: "#dcfce7", color: "#15803d" },
  Miercoles: { bg: "#fef9c3", color: "#a16207" },
  Jueves: { bg: "#ede9fe", color: "#6d28d9" },
  Viernes: { bg: "#ffedd5", color: "#c2410c" },
  Sabado: { bg: "#fce7f3", color: "#9d174d" },
  Domingo: { bg: "#f1f5f9", color: "#475569" },
};

function normalizeHora(raw: string) {
  if (!raw) return "";
  return raw.slice(0, 5);
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ─── Fila expandible por asignación ────────────────────────────────────────
function GrupoRow({ g, index }: { g: Grupo; index: number }) {
  const [open, setOpen] = useState(false);
  const initials = getInitials(g.docente);

  return (
    <div
      style={{
        border: "1px solid",
        borderColor: open ? "#bfdbfe" : "#e2e4e9",
        borderRadius: 7,
        overflow: "hidden",
        transition: "border-color 0.15s",
        background: "#fff",
      }}
    >
      {/* Fila compacta — siempre visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: open ? "#f0f6ff" : "#fff",
          border: "none",
          cursor: "pointer",
          padding: "11px 14px",
          display: "grid",
          gridTemplateColumns: "28px 36px 1fr 90px 90px 70px 28px",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
          transition: "background 0.12s",
        }}
      >
        {/* Número */}
        <span style={{ fontSize: 11, color: "#c4c9d4", fontFamily: "'DM Mono', monospace" }}>
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: open ? "#dbeafe" : "#f1f5f9",
          color: open ? "#1d4ed8" : "#64748b",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, flexShrink: 0, transition: "all 0.15s",
        }}>
          {initials}
        </div>

        {/* Docente */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {g.docente}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
            {g.curso}
          </div>
        </div>

        {/* Grado */}
        <span style={{
          background: "#f1f5f9", color: "#475569", borderRadius: 5,
          padding: "2px 8px", fontSize: 11, fontWeight: 600,
          textAlign: "center",
        }}>
          {g.grado}
        </span>

        {/* Sección */}
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
          {g.seccion || "Sin sección"}
        </span>

        {/* Bloques badge */}
        <span style={{
          background: open ? "#dbeafe" : "#f8f9fb",
          color: open ? "#2563eb" : "#6b7280",
          borderRadius: 5, padding: "2px 8px",
          fontSize: 11, fontWeight: 600, textAlign: "center",
          transition: "all 0.15s",
        }}>
          {g.bloques.length} bloque{g.bloques.length !== 1 ? "s" : ""}
        </span>

        {/* Chevron */}
        <div style={{ color: "#6b7280", display: "flex", justifyContent: "center", transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>
          <ChevronDown style={{ width: 15, height: 15 }} />
        </div>
      </button>

      {/* Panel expandido — bloques */}
      {open && (
        <div style={{ borderTop: "1px solid #e8edf5", padding: "10px 14px 12px", background: "#f8faff" }}>
          {/* Mini cabecera de columnas */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "120px 100px 100px 1fr",
            padding: "5px 8px 5px",
            marginBottom: 4,
          }}>
            {["Día", "Inicio", "Fin", "Aula"].map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {h}
              </span>
            ))}
          </div>

          {/* Filas de bloques */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {g.bloques.map((b) => {
              const diaColor = DIA_COLORS[b.dia_semana] || { bg: "#f1f5f9", color: "#475569" };
              return (
                <div
                  key={b.id_horario}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 100px 100px 1fr",
                    alignItems: "center",
                    background: "#fff",
                    border: "1px solid #edf0f5",
                    borderRadius: 6,
                    padding: "7px 8px",
                  }}
                >
                  <span style={{
                    background: diaColor.bg, color: diaColor.color,
                    borderRadius: 4, padding: "2px 8px",
                    fontSize: 11, fontWeight: 600, display: "inline-block",
                  }}>
                    {b.dia_semana}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock style={{ width: 11, height: 11, color: "#6b7280" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "'DM Mono', monospace" }}>
                      {normalizeHora(b.hora_inicio)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock style={{ width: 11, height: 11, color: "#6b7280" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "'DM Mono', monospace" }}>
                      {normalizeHora(b.hora_fin)}
                    </span>
                  </div>

                  <span style={{ fontSize: 12, color: b.aula ? "#374151" : "#c4c9d4" }}>
                    {b.aula || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function ScheduleGrid() {
  const [periodos, setPeriodos] = useState<PeriodoItem[]>([]);
  const [docentes, setDocentes] = useState<DocenteItem[]>([]);
  const [grados, setGrados] = useState<GradoItem[]>([]);
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [asignacionesDocente, setAsignacionesDocente] = useState<AsignacionDocente[]>([]);

  const [idPeriodo, setIdPeriodo] = useState<string>("");
  const [idDocente, setIdDocente] = useState<string>("");
  const [idGrado, setIdGrado] = useState<string>("");
  const [idCurso, setIdCurso] = useState<string>("");

  const [rows, setRows] = useState<ReporteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const loadCatalogs = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/horario/catalogos");
        if (!data?.success) { setError("No se pudieron cargar catálogos."); return; }
        const payload = data.data || {};
        const periodosData = payload.periodos || [];
        setPeriodos(periodosData);
        setDocentes(payload.docentes || []);
        setGrados(payload.grados || []);
        setCursos(payload.cursos || []);
        const periodoActivo = periodosData.find((p: PeriodoItem) => p.activo === 1);
        if (periodoActivo) setIdPeriodo(String(periodoActivo.id));
      } catch {
        setError("Error al cargar catálogos.");
      } finally {
        setLoading(false);
      }
    };
    loadCatalogs();
  }, []);

  useEffect(() => {
    const loadAsignaciones = async () => {
      if (!idDocente || !idPeriodo) { setAsignacionesDocente([]); return; }
      try {
        const { data } = await api.get(`/horario/docente/${idDocente}/asignaciones`, {
          params: { id_periodo: idPeriodo },
        });
        setAsignacionesDocente(data?.success ? data.data || [] : []);
      } catch {
        setAsignacionesDocente([]);
      }
    };
    loadAsignaciones();
  }, [idDocente, idPeriodo]);

  const gradosFiltrados = useMemo(() => {
    if (!idDocente) return grados;
    const map = new Map<number, string>();
    for (const a of asignacionesDocente) {
      if (!map.has(a.id_grado)) map.set(a.id_grado, a.grado);
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [idDocente, asignacionesDocente, grados]);

  const cursosFiltrados = useMemo(() => {
    if (!idDocente) return cursos;
    const base = idGrado
      ? asignacionesDocente.filter((a) => String(a.id_grado) === idGrado)
      : asignacionesDocente;
    const map = new Map<number, string>();
    for (const a of base) {
      if (!map.has(a.id_curso)) map.set(a.id_curso, a.curso);
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [idDocente, idGrado, asignacionesDocente, cursos]);

  useEffect(() => { setIdGrado(""); setIdCurso(""); }, [idDocente, idPeriodo]);
  useEffect(() => {
    if (idCurso && !cursosFiltrados.some((c) => String(c.id) === idCurso)) setIdCurso("");
  }, [cursosFiltrados, idCurso]);

  const cargarReporte = async () => {
    setLoading(true);
    setError("");
    setSearched(true);
    setRows([]);
    try {
      const params: Record<string, string> = {};
      if (idPeriodo) params.id_periodo = idPeriodo;
      if (idDocente) params.id_docente = idDocente;
      if (idGrado) params.id_grado = idGrado;
      if (idCurso) params.id_curso = idCurso;
      const { data } = await api.get("/horario/reporte", { params });
      if (!data?.success) {
        setError(data?.message || "No se pudo cargar reporte.");
        return;
      }
      setRows(data.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error al consultar horarios.");
    } finally {
      setLoading(false);
    }
  };

  const grupos = useMemo(() => {
    const map = new Map<string, Grupo>();
    for (const r of rows) {
      const key = `${r.id_asignacion}`;
      if (!map.has(key)) {
        map.set(key, { key, docente: r.docente, grado: r.grado, curso: r.curso, seccion: r.seccion, anio: r.anio, bloques: [] });
      }
      map.get(key)?.bloques.push(r);
    }
    const out = Array.from(map.values());
    for (const g of out) {
      g.bloques.sort((a, b) => {
        const d = (DIA_ORDEN[a.dia_semana] || 99) - (DIA_ORDEN[b.dia_semana] || 99);
        return d !== 0 ? d : normalizeHora(a.hora_inicio).localeCompare(normalizeHora(b.hora_inicio));
      });
    }
    return out;
  }, [rows]);

  const selectStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #e2e4e9", borderRadius: 6,
    padding: "6px 8px", fontSize: 13, color: "#374151",
    background: "#f9fafb", outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#4b5563",
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "block", marginBottom: 5,
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 1000, margin: "0 auto", padding: "28px 24px", color: "#1a1d23" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Encabezado */}
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Gestión académica
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarDays style={{ width: 20, height: 20, color: "#2563eb" }} />
          Horarios Creados
        </h1>
      </div>

      {/* Filtros */}
      <div style={{
        background: "#fff", border: "1px solid #e2e4e9", borderRadius: 8,
        padding: "14px 16px", marginBottom: 18,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 110px", gap: 12, alignItems: "end",
      }}>
        <div>
          <label style={labelStyle}>Período</label>
          <select style={selectStyle} value={idPeriodo} onChange={(e) => setIdPeriodo(e.target.value)}>
            <option value="">Todos</option>
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.anio}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Docente</label>
          <select style={selectStyle} value={idDocente} onChange={(e) => setIdDocente(e.target.value)}>
            <option value="">Todos</option>
            {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre_completo}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Grado</label>
          <select style={selectStyle} value={idGrado} onChange={(e) => setIdGrado(e.target.value)}>
            <option value="">Todos</option>
            {gradosFiltrados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Curso</label>
          <select style={selectStyle} value={idCurso} onChange={(e) => setIdCurso(e.target.value)}>
            <option value="">Todos</option>
            {cursosFiltrados.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <button
          onClick={cargarReporte}
          style={{
            background: "#2563eb", color: "#fff", border: "none", borderRadius: 7,
            padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Filter style={{ width: 13, height: 13 }} />
          Filtrar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Cabecera de columnas (solo cuando hay resultados) */}
      {searched && !loading && grupos.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "28px 36px 1fr 90px 90px 70px 28px",
          gap: 10,
          padding: "7px 14px",
          marginBottom: 6,
        }}>
          {["", "", "Docente · Curso", "Grado", "Sección", "Bloques", ""].map((h, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 700, color: "#4b5563",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>{h}</span>
          ))}
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div style={{ background: "#fff", border: "1px solid #e2e4e9", borderRadius: 8, padding: "48px", textAlign: "center", color: "#374151" }}>
          <Loader2 style={{ width: 22, height: 22, display: "block", margin: "0 auto 8px", color: "#2563eb" }} className="animate-spin" />
          <p style={{ fontSize: 13, fontWeight: 500 }}>Cargando horarios...</p>
        </div>
      ) : !searched ? (
        <div style={{ background: "#fff", border: "1px solid #e2e4e9", borderRadius: 8, padding: "56px 32px", textAlign: "center" }}>
          <CalendarDays style={{ width: 36, height: 36, color: "#cbd5e1", display: "block", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>
            Selecciona los filtros y haz clic en <strong style={{ color: "#111827" }}>Filtrar</strong> para ver los horarios.
          </p>
        </div>
      ) : grupos.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e2e4e9", borderRadius: 8, padding: "40px", textAlign: "center", color: "#374151", fontSize: 13, fontWeight: 500 }}>
          No se encontraron horarios con los criterios seleccionados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {grupos.map((g, i) => (
            <GrupoRow key={g.key} g={g} index={i} />
          ))}

          {/* Totalizador */}
          <div style={{ padding: "6px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
              Haz clic en una fila para ver sus bloques
            </span>
            <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 500 }}>
              {grupos.length} asignación{grupos.length !== 1 ? "es" : ""} · {rows.length} bloque{rows.length !== 1 ? "s" : ""} totales
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
