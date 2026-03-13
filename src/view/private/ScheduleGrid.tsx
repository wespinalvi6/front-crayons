import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { CalendarDays, Filter, Loader2 } from "lucide-react";

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
  Lunes: 1,
  Martes: 2,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sabado: 6,
  Domingo: 7,
};

function normalizeHora(raw: string) {
  if (!raw) return "";
  return raw.slice(0, 5);
}

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

  useEffect(() => {
    const loadCatalogs = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/horario/catalogos");
        if (!data?.success) {
          setError("No se pudieron cargar catálogos.");
          return;
        }

        const payload = data.data || {};
        const periodosData = payload.periodos || [];
        setPeriodos(periodosData);
        setDocentes(payload.docentes || []);
        setGrados(payload.grados || []);
        setCursos(payload.cursos || []);

        const periodoActivo = periodosData.find((p: PeriodoItem) => p.activo === 1);
        if (periodoActivo) {
          setIdPeriodo(String(periodoActivo.id));
        }
      } catch (e) {
        setError("Error al cargar catálogos.");
      } finally {
        setLoading(false);
      }
    };

    loadCatalogs();
  }, []);

  useEffect(() => {
    const loadAsignacionesDocente = async () => {
      if (!idDocente || !idPeriodo) {
        setAsignacionesDocente([]);
        return;
      }

      try {
        const { data } = await api.get(`/horario/docente/${idDocente}/asignaciones`, {
          params: { id_periodo: idPeriodo },
        });

        if (data?.success) {
          setAsignacionesDocente(data.data || []);
        } else {
          setAsignacionesDocente([]);
        }
      } catch (e) {
        setAsignacionesDocente([]);
      }
    };

    loadAsignacionesDocente();
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
    if (!idDocente) {
      return cursos;
    }

    const base = idGrado
      ? asignacionesDocente.filter((a) => String(a.id_grado) === idGrado)
      : asignacionesDocente;

    const map = new Map<number, string>();
    for (const a of base) {
      if (!map.has(a.id_curso)) map.set(a.id_curso, a.curso);
    }

    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [idDocente, idGrado, asignacionesDocente, cursos]);

  useEffect(() => {
    setIdGrado("");
    setIdCurso("");
  }, [idDocente, idPeriodo]);

  useEffect(() => {
    if (!idCurso) return;
    const exists = cursosFiltrados.some((c) => String(c.id) === idCurso);
    if (!exists) setIdCurso("");
  }, [cursosFiltrados, idCurso]);

  const [searched, setSearched] = useState(false);

  const cargarReporte = async () => {
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const params: Record<string, string> = {};
      if (idPeriodo) params.id_periodo = idPeriodo;
      if (idDocente) params.id_docente = idDocente;
      if (idGrado) params.id_grado = idGrado;
      if (idCurso) params.id_curso = idCurso;

      const { data } = await api.get("/horario/reporte", { params });
      if (!data?.success) {
        setRows([]);
        setError(data?.message || "No se pudo cargar reporte.");
        return;
      }
      setRows(data.data || []);
    } catch (e: any) {
      setRows([]);
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
        map.set(key, {
          key,
          docente: r.docente,
          grado: r.grado,
          curso: r.curso,
          seccion: r.seccion,
          anio: r.anio,
          bloques: [],
        });
      }
      map.get(key)?.bloques.push(r);
    }

    const out = Array.from(map.values());
    for (const g of out) {
      g.bloques.sort((a, b) => {
        const d = (DIA_ORDEN[a.dia_semana] || 99) - (DIA_ORDEN[b.dia_semana] || 99);
        if (d !== 0) return d;
        return normalizeHora(a.hora_inicio).localeCompare(normalizeHora(b.hora_inicio));
      });
    }

    return out;
  }, [rows]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-blue-700" />
        <h1 className="text-xl font-semibold text-slate-900">Horarios Creados</h1>
      </div>

      <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Período</label>
          <select className="w-full h-9 border rounded px-2 text-sm mt-1" value={idPeriodo} onChange={(e) => setIdPeriodo(e.target.value)}>
            <option value="">Todos</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>{p.anio}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Docente</label>
          <select className="w-full h-9 border rounded px-2 text-sm mt-1" value={idDocente} onChange={(e) => setIdDocente(e.target.value)}>
            <option value="">Todos</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre_completo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Grado</label>
          <select className="w-full h-9 border rounded px-2 text-sm mt-1" value={idGrado} onChange={(e) => setIdGrado(e.target.value)}>
            <option value="">Todos</option>
            {gradosFiltrados.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Curso</label>
          <select className="w-full h-9 border rounded px-2 text-sm mt-1" value={idCurso} onChange={(e) => setIdCurso(e.target.value)}>
            <option value="">Todos</option>
            {cursosFiltrados.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={cargarReporte}
            className="w-full h-9 rounded bg-blue-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border rounded p-12 text-center text-slate-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm">Cargando horarios...</p>
        </div>
      ) : !searched ? (
        <div className="bg-white border rounded p-20 text-center text-slate-400 space-y-4">
          <CalendarDays className="w-16 h-16 mx-auto opacity-10" />
          <p className="text-sm">Selecciona los filtros y haz clic en <strong>Filtrar</strong> para visualizar los horarios.</p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white border rounded p-12 text-center text-slate-500">
          No se encontraron horarios con los criterios seleccionados.
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.key} className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                <div><span className="text-slate-500">Docente:</span> <span className="font-semibold">{g.docente}</span></div>
                <div><span className="text-slate-500">Curso:</span> <span className="font-semibold">{g.curso}</span></div>
                <div><span className="text-slate-500">Grado:</span> <span className="font-semibold">{g.grado}</span></div>
                <div><span className="text-slate-500">Sección:</span> <span className="font-semibold">{g.seccion}</span></div>
                <div><span className="text-slate-500">Período:</span> <span className="font-semibold">{g.anio}</span></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2">Día</th>
                      <th className="text-left px-4 py-2">Hora Inicio</th>
                      <th className="text-left px-4 py-2">Hora Fin</th>
                      <th className="text-left px-4 py-2">Aula</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.bloques.map((b) => (
                      <tr key={b.id_horario} className="border-t">
                        <td className="px-4 py-2">{b.dia_semana}</td>
                        <td className="px-4 py-2">{normalizeHora(b.hora_inicio)}</td>
                        <td className="px-4 py-2">{normalizeHora(b.hora_fin)}</td>
                        <td className="px-4 py-2">{b.aula || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
