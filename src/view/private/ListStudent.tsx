import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import axios from "axios";
import EditarDatosButton from "@/components/EditarDatosButton";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface Periodo {
  id: number;
  anio: number;
}

type Apoderado = {
  dni: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  telefono: string | null;
  parentesco: string;
};

type Student = {
  alumno_id: number;
  alumno_dni: string;
  alumno_nombre: string;
  alumno_apellido_paterno: string;
  alumno_apellido_materno: string;
  fecha_nacimiento: string;
  grado: string;
  fecha_matricula: string;
  apoderados: Apoderado[];
};

const EMPTY_ARRAY: any[] = [];

export default function ListStudent() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState("2026");
  const [grade, setGrade] = useState("3");
  const [dniSearch, setDniSearch] = useState("");
  const [showParent, setShowParent] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<{ year: string; grade: string } | null>(null);
  const [updateMessage, setUpdateMessage] = useState<{
    text: string;
    isSuccess: boolean;
  } | null>(null);

  // Queries para datos estáticos (cacheados)
  const { data: yearsAvailable = EMPTY_ARRAY } = useQuery<Periodo[]>({
    queryKey: ['periodosA'],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3000/api/cuotas/periodos", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.success ? response.data.data : [];
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: grados = [] } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ['grados'],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3000/api/grado/lista-grado", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.status ? response.data.data : [];
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: studentsResponse, isLoading: isLoadingStudents, isFetching } = useQuery({
    queryKey: ['studentsList', appliedFilters?.year, appliedFilters?.grade, page, limit],
    queryFn: async () => {
      if (!appliedFilters?.year || !appliedFilters?.grade) return null;
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3000/api/alumno/lista-alumnos/${appliedFilters.year}/${appliedFilters.grade}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, limit }
        }
      );
      if (response.data.success) {
        return { data: response.data.data || [], pagination: response.data.pagination };
      }
      return null;
    },
    enabled: !!appliedFilters,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const students = studentsResponse?.data ?? EMPTY_ARRAY;
  const currentPagination = studentsResponse?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  const loading = isLoadingStudents || isFetching;

  // Función para actualizar un estudiante específico en la lista
  const updateStudentInList = (updatedStudent: any) => {
    // Actualizar la caché localmente
    queryClient.setQueryData(['studentsList', appliedFilters?.year, appliedFilters?.grade, page, limit], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: oldData.data.map((student: any) =>
          student.alumno_id === updatedStudent.alumno_id
            ? {
              ...student,
              alumno_nombre: updatedStudent.nombre,
              alumno_apellido_paterno: updatedStudent.ap_p,
              alumno_apellido_materno: updatedStudent.ap_m,
              fecha_nacimiento: updatedStudent.fecha_nacimiento
            }
            : student
        )
      };
    });

    setUpdateMessage({
      text: `Datos actualizados: ${updatedStudent.nombre} ${updatedStudent.ap_p}`,
      isSuccess: true
    });

    setTimeout(() => {
      setUpdateMessage(null);
    }, 2000);
  };

  // Filtrar estudiantes por DNI (Localmente sobre los datos de la página actual)
  useEffect(() => {
    if (dniSearch.trim() === "") {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter((student: Student) =>
        student.alumno_dni.toLowerCase().includes(dniSearch.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [dniSearch, students]);


  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= currentPagination.totalPages) {
      setPage(newPage);
    }
  };

  // Reset page when year or grade changes (from applied filters)
  useEffect(() => {
    setPage(1);
  }, [appliedFilters]);

  const handleSearch = () => {
    setAppliedFilters({ year, grade });
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-sm font-medium">Año</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32 h-9 bg-white border border-slate-300 rounded px-3 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {yearsAvailable.map((p) => (
                <SelectItem key={p.id} value={p.anio.toString()}>
                  {p.anio}
                </SelectItem>
              ))}
              {yearsAvailable.length === 0 && (
                <SelectItem value="2026">2026</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Grado</label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="w-32 h-9 bg-white border border-slate-300 rounded px-3 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="Grado" />
            </SelectTrigger>
            <SelectContent>
              {grados.map((g) => (
                <SelectItem key={g.id} value={g.id.toString()}>
                  {g.nombre}
                </SelectItem>
              ))}
              {grados.length === 0 && (
                <>
                  <SelectItem value="1">1ro</SelectItem>
                  <SelectItem value="2">2do</SelectItem>
                  <SelectItem value="3">3ro</SelectItem>
                  <SelectItem value="4">4to</SelectItem>
                  <SelectItem value="5">5to</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Buscar por DNI</label>
          <Input
            type="text"
            placeholder="Ingrese DNI..."
            value={dniSearch}
            onChange={(e) => setDniSearch(e.target.value)}
            className="w-48 h-9 bg-white border border-slate-300 rounded px-3 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500"
          />
        </div>
        <Button
          onClick={handleSearch}
          className="mt-2 h-9 bg-slate-900 text-white hover:bg-slate-800"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando...
            </>
          ) : "Buscar"}
        </Button>
      </div>

      {/* Mensaje de actualización */}
      {updateMessage && (
        <div className={`p-4 rounded-md mb-4 ${updateMessage.isSuccess
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-red-100 text-red-700 border border-red-300'
          }`}>
          {updateMessage.text}
        </div>
      )}

      {/* Información de resultados */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          Mostrando {students.length} de {currentPagination.total} estudiantes
          {dniSearch.trim() !== "" && ` (filtrados por DNI: ${dniSearch})`}
        </div>
        <div className="flex items-center gap-2 font-medium">
          Página {currentPagination.page} de {currentPagination.totalPages || 1}
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DNI</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Grado</TableHead>
              <TableHead>Fecha Matrícula</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  {dniSearch.trim() !== ""
                    ? `No se encontraron estudiantes con DNI: ${dniSearch}`
                    : "No hay estudiantes registrados"
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <CardGroup key={student.alumno_id} student={student} showParent={showParent} setShowParent={setShowParent} updateStudentInList={updateStudentInList} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Controles de Paginación */}
      {currentPagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPagination.page - 1)}
            disabled={currentPagination.page === 1 || loading}
          >
            Anterior
          </Button>

          <div className="flex gap-1">
            {Array.from({ length: currentPagination.totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={currentPagination.page === p ? "default" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => handlePageChange(p)}
                disabled={loading}
              >
                {p}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPagination.page + 1)}
            disabled={currentPagination.page === currentPagination.totalPages || loading}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

// Subcomponente para organizar el Fragment/Rows y evitar problemas de Key
function CardGroup({ student, showParent, setShowParent, updateStudentInList }: any) {
  return (
    <>
      <TableRow>
        <TableCell>{student.alumno_dni}</TableCell>
        <TableCell>
          {student.alumno_nombre} {student.alumno_apellido_paterno}{" "}
          {student.alumno_apellido_materno}
        </TableCell>
        <TableCell>{student.grado}</TableCell>
        <TableCell>
          {new Date(student.fecha_matricula).toLocaleDateString()}
        </TableCell>
        <TableCell className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setShowParent(
                showParent === student.alumno_id
                  ? null
                  : student.alumno_id
              )
            }
          >
            {showParent === student.alumno_id
              ? "Ocultar Apoderados"
              : "Ver Apoderados"}
          </Button>
          <EditarDatosButton
            variant="outline"
            size="sm"
            className="text-[#3E328C] border-[#3E328C] hover:bg-[#3E328C] hover:text-white"
            alumnoId={student.alumno_id}
            alumnoData={{
              dni: student.alumno_dni,
              nombre: student.alumno_nombre,
              ap_p: student.alumno_apellido_paterno,
              ap_m: student.alumno_apellido_materno,
              fecha_nacimiento: student.fecha_nacimiento
            }}
            onDataUpdated={updateStudentInList}
          >
            Editar
          </EditarDatosButton>
        </TableCell>
      </TableRow>

      {showParent === student.alumno_id && (
        <TableRow>
          <TableCell
            colSpan={5}
            className="bg-muted px-6 py-4 text-sm"
          >
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Información de Apoderados:</h4>
              {student.apoderados && student.apoderados.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {student.apoderados.map((apoderado: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border shadow-sm">
                      <div className="font-medium text-primary mb-1">{apoderado.parentesco}</div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                        <span className="text-gray-500">Nombre:</span>
                        <span>{apoderado.nombre} {apoderado.apellido_paterno} {apoderado.apellido_materno}</span>

                        <span className="text-gray-500">DNI:</span>
                        <span>{apoderado.dni}</span>

                        <span className="text-gray-500">Teléfono:</span>
                        <span>{apoderado.telefono || "No registrado"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No hay apoderados registrados para este alumno.</div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
