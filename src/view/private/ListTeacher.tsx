import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { Download, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Curso {
  id_asignacion?: number;
  curso: string;
  grado: string;
}

interface Docente {
  docente_id: number;
  dni: string;
  nombre_completo: string;
  fecha_registro: string;
  cursos: Curso[];
}

interface ApiResponse {
  success: boolean;
  data: Docente[];
  anio: string;
}

const EMPTY_ARRAY: any[] = [];

export default function ListTeacher() {
  const queryClient = useQueryClient();
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>("");
  const [appliedAnio, setAppliedAnio] = useState<string>("");

  // Obtener periodos disponibles
  const { data: anios = EMPTY_ARRAY, isLoading: isLoadingAnios } = useQuery<string[]>({
    queryKey: ['periodosA_anios'],
    queryFn: async () => {
      const periodsRes = await axios.get('http://localhost:3000/api/cuotas/periodos');
      const data = periodsRes.data;
      if (data) {
        const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        const availableYears = list.map((p: any) => p.anio?.toString()).filter(Boolean);
        return Array.from(new Set(availableYears)).sort((a: any, b: any) => Number(b) - Number(a)) as string[];
      }
      return [];
    },
    staleTime: 60 * 60 * 1000,
  });

  // Autoseleccionar el primer año
  useEffect(() => {
    if (anios.length > 0 && !anioSeleccionado) {
      setAnioSeleccionado(anios[0]);
    }
  }, [anios, anioSeleccionado]);

  // Obtener docentes del año seleccionado
  const { data: docentes = EMPTY_ARRAY, isLoading } = useQuery<Docente[]>({
    queryKey: ['docentesList', appliedAnio],
    queryFn: async () => {
      if (!appliedAnio) return [];
      const { data } = await axios.get<ApiResponse>(
        `http://localhost:3000/api/docente/lista-docentes/${appliedAnio}`
      );
      return data.success ? data.data : [];
    },
    enabled: !!appliedAnio,
  });

  const handleSearch = () => {
    setAppliedAnio(anioSeleccionado);
  };

  const handleEliminar = (dni: string) => {
    const confirm = window.confirm("¿Deseas eliminar este docente?");
    if (confirm) {
      queryClient.setQueryData(['docentesList', appliedAnio], (old: Docente[] | undefined) => {
        return old ? old.filter((d) => d.dni !== dni) : [];
      });
    }
  };

  const handleExportar = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/docente/exportar/${anioSeleccionado}`,
        {
          responseType: 'blob',
          params: {
            orden: 'desc'
          }
        }
      );

      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `docentes_${anioSeleccionado}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Error al exportar los datos");
    }
  };

  if (isLoadingAnios || (!anioSeleccionado && anios.length > 0)) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Lista de Docentes</h2>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleExportar}
            variant="outline"
            className="flex items-center gap-2 h-9"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Año:</span>
            <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
              <SelectTrigger className="w-[100px] h-9 bg-white border border-slate-300 rounded px-3 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue placeholder="Selecciona año" />
              </SelectTrigger>
              <SelectContent>
                {anios.map((anio) => (
                  <SelectItem key={anio} value={anio}>
                    {anio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSearch}
              className="h-9 bg-slate-900 text-white hover:bg-slate-800"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : "Buscar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th className="px-4 py-2">DNI</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Fecha de Registro</th>
              <th className="px-4 py-2">Cursos</th>
              <th className="px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-6 text-muted-foreground whitespace-nowrap"
                >
                  <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Cargando datos...
                </td>
              </tr>
            ) : docentes.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-6 text-muted-foreground"
                >
                  No hay docentes registrados.
                </td>
              </tr>
            ) : (
              docentes.map((docente) => (
                <tr
                  key={docente.docente_id}
                  className="border-t hover:bg-muted/50"
                >
                  <td className="px-4 py-2">{docente.dni}</td>
                  <td className="px-4 py-2">{docente.nombre_completo}</td>
                  <td className="px-4 py-2">
                    {new Date(docente.fecha_registro).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 space-x-1">
                    {docente.cursos.map((curso: Curso, idx: number) => (
                      <Badge
                        key={curso.id_asignacion || `${curso.curso}-${curso.grado}-${idx}`}
                        variant="secondary"
                      >
                        {curso.curso} ({curso.grado})
                      </Badge>
                    ))}
                  </td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleEliminar(docente.dni)}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
