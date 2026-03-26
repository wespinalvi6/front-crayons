import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/axios";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Calendar, Clock, BookOpen, MapPin, User, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface HorarioItem {
    id_horario: number;
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    aula: string | null;
    id_asignacion: number;
    curso: string;
    grado: string;
    seccion: string;
}

// --- CONFIGURACIÓN DE MATRIX (Igual que en ver-horarios) ---
type Subject = { id: string; name: string; bgColor: string; textColor: string };

type ClassBlock = {
    dayIndex: number;
    startPeriod: number;
    span: number;
    subjectId: string;
    grado: string;
    seccion: string;
    aula: string | null;
    cursoTitle: string;
};

// Paleta de colores para cursos
const COLORS = [
    { bg: "bg-blue-400", text: "text-black" },
    { bg: "bg-green-600", text: "text-white" },
    { bg: "bg-emerald-500", text: "text-white" },
    { bg: "bg-yellow-300", text: "text-black" },
    { bg: "bg-purple-600", text: "text-white" },
    { bg: "bg-red-600", text: "text-white" },
    { bg: "bg-orange-200", text: "text-orange-900" },
    { bg: "bg-pink-300", text: "text-black" },
    { bg: "bg-teal-400", text: "text-black" },
    { bg: "bg-indigo-400", text: "text-white" },
    { bg: "bg-cyan-600", text: "text-white" },
    { bg: "bg-lime-400", text: "text-black" },
];

function getSubjectColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    const c = COLORS[index];
    return { bgColor: c.bg, textColor: c.text };
}

const DAYS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
const DIA_A_INDEX: Record<string, number> = {
    Lunes: 0,
    Martes: 1,
    Miercoles: 2,
    Jueves: 3,
    Viernes: 4,
};

const TIME_PERIODS = [
    { id: 1, time: "08:00" },
    { id: 2, time: "08:30" },
    { id: 3, time: "09:00" },
    { id: 4, time: "09:30" },
    // 10:00 - 10:30 RECREO
    { id: 5, time: "10:30" },
    { id: 6, time: "11:00" },
    { id: 7, time: "11:30" },
    { id: 8, time: "12:00" },
    { id: 9, time: "12:30" },
    { id: 10, time: "13:00" },
    { id: 11, time: "13:30" },
];
const START_MINUTES = 8 * 60; // 08:00

export default function MySchedule() {
    const [horarios, setHorarios] = useState<HorarioItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHorario = async () => {
            try {
                const { data } = await api.get("/horario/docente/mi-horario-semanal");
                if (data.success) {
                    setHorarios(data.data || []);
                }
            } catch (error) {
                console.error("Error fetching schedule:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHorario();
    }, []);

    const { SUBJECTS, SCHEDULE_DATA } = useMemo(() => {
        const sMap: Record<string, Subject> = {};
        const schedule: ClassBlock[] = [];

        horarios.forEach((r) => {
            const dayIndex = DIA_A_INDEX[r.dia_semana];
            if (dayIndex === undefined || dayIndex > 4) return; // Solo Lun-Vie

            const [hInicioStr, mInicioStr] = String(r.hora_inicio).split(":");
            const [hFinStr, mFinStr] = String(r.hora_fin).split(":");

            const startMinTotal = parseInt(hInicioStr) * 60 + parseInt(mInicioStr);
            const endMinTotal = parseInt(hFinStr) * 60 + parseInt(mFinStr);

            const startPeriod = Math.floor((startMinTotal - START_MINUTES) / 30);
            const span = Math.ceil((endMinTotal - startMinTotal) / 30);

            const cursoId = r.curso;
            if (!sMap[cursoId]) {
                const color = getSubjectColor(cursoId);
                sMap[cursoId] = {
                    id: cursoId,
                    name: r.curso,
                    bgColor: color.bgColor,
                    textColor: color.textColor,
                };
            }

            schedule.push({
                dayIndex,
                startPeriod,
                span,
                subjectId: cursoId,
                grado: r.grado,
                seccion: r.seccion,
                aula: r.aula,
                cursoTitle: r.curso,
            });
        });

        return { SUBJECTS: sMap, SCHEDULE_DATA: schedule };
    }, [horarios]);

    // Construir matriz
    const grid = useMemo(() => {
        const matrix: any[][] = Array.from({ length: Math.max(TIME_PERIODS.length, 12) }, () => Array(DAYS.length).fill(null));

        SCHEDULE_DATA.forEach((block) => {
            const { dayIndex, startPeriod, span, subjectId } = block;
            const subject = SUBJECTS[subjectId];

            if (!subject || startPeriod < 0 || startPeriod >= matrix.length) return;

            matrix[startPeriod][dayIndex] = { type: "cell", span, subject, block };

            for (let i = 1; i < span; i++) {
                if (startPeriod + i < matrix.length) {
                    matrix[startPeriod + i][dayIndex] = { type: "covered" };
                }
            }
        });
        return matrix;
    }, [SCHEDULE_DATA, SUBJECTS]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            {/* Topbar */}
            <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="text-slate-400 hover:text-slate-600 transition-colors" />
                    <div className="h-4 w-px bg-slate-200 mx-2" />
                    <div>
                        <h1 className="text-sm font-semibold text-slate-900">Mi Horario Semanal</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Calendar size={12} className="text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Periodo Académico 2026</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                        <p className="text-sm font-medium text-slate-600">Cargando tu horario...</p>
                    </div>
                ) : horarios.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm mt-8 text-center px-4">
                        <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">Aún no tienes bloques de horario asignados en este periodo.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto shadow-xl rounded-lg border-2 border-gray-400 bg-white">
                            <table className="w-full table-fixed border-collapse min-w-[900px]">
                                <thead>
                                    <tr>
                                        <th className="w-20 bg-white border-b border-gray-200 py-3 font-bold text-gray-500 uppercase text-right pr-4">
                                            Hora
                                        </th>
                                        {DAYS.map((day) => (
                                            <th
                                                key={day}
                                                className="bg-gray-100 border-b-2 border-r-2 border-white py-3 font-black text-gray-800 tracking-wider"
                                            >
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {TIME_PERIODS.map((period, periodIndex) => {
                                        const showRecreo = periodIndex === 4;

                                        return (
                                            <React.Fragment key={period.id}>
                                                {showRecreo && (
                                                    <tr className="bg-white">
                                                        <td className="bg-white border-b border-gray-200 text-right pr-4 text-sm font-bold text-slate-500 align-middle py-4 w-20">
                                                            10:00
                                                        </td>
                                                        <td
                                                            colSpan={5}
                                                            className="border-b-2 border-gray-400 text-center py-2 font-black tracking-[0.8em] text-gray-700 bg-gray-50 uppercase"
                                                        >
                                                            Recreo
                                                        </td>
                                                    </tr>
                                                )}

                                                <tr>
                                                    <td className="bg-white border-b border-gray-200 text-right pr-4 text-sm font-bold text-slate-500 align-top pt-4 w-20">
                                                        {period.time}
                                                    </td>

                                                    {DAYS.map((_, dayIndex) => {
                                                        const cellData = grid[periodIndex]?.[dayIndex];

                                                        if (cellData?.type === "covered") return null;

                                                        if (cellData?.type === "cell") {
                                                            const bData = cellData.block as ClassBlock;
                                                            return (
                                                                <td
                                                                    key={`${periodIndex}-${dayIndex}`}
                                                                    rowSpan={cellData.span}
                                                                    className={`border-b-2 border-r-2 border-gray-400 p-3 text-center transition-colors hover:brightness-110 ${cellData.subject.bgColor} ${cellData.subject.textColor}`}
                                                                >
                                                                    <div className="flex flex-col items-center justify-center h-full space-y-1">
                                                                        <span className="font-bold text-sm md:text-base leading-tight">
                                                                            {cellData.subject.name}
                                                                        </span>
                                                                        <span className="text-xs opacity-90 font-medium">
                                                                            {bData.grado} {bData.seccion}
                                                                        </span>
                                                                        {bData.aula && (
                                                                            <span className="text-[10px] opacity-80 mt-1 flex items-center justify-center gap-1">
                                                                                <MapPin size={10} />
                                                                                {bData.aula}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            );
                                                        }

                                                        return (
                                                            <td
                                                                key={`${periodIndex}-${dayIndex}`}
                                                                className="border-b-2 border-r-2 border-gray-400 bg-white group-hover:bg-slate-50/50 transition-colors"
                                                            ></td>
                                                        );
                                                    })}
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-none shadow-none bg-blue-50/50">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Total Cursos</p>
                                        <p className="text-xl font-black text-slate-900">{new Set(horarios.map((h) => h.id_asignacion)).size}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-none bg-emerald-50/50">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Horas Semanales</p>
                                        <p className="text-xl font-black text-slate-900">{horarios.length}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-none bg-amber-50/50">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Rol Asignado</p>
                                        <p className="text-xl font-black text-slate-900 leading-tight">Docente Titular</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
