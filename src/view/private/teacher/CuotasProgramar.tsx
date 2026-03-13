import React, { useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Loader2 } from "lucide-react";

import { useQuery, useQueryClient } from '@tanstack/react-query';

// Interface matching the user's data structure
interface FeeSchedule {
  id: number;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  costo_matricula: string | number; // API returns string, we might want to handle both
  costo_cuota_mensual: string | number;
  numero_cuotas: number;
  activo: number; // 0 or 1
  created_at?: string;
  updated_at?: string;
}

interface FeeFormData {
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  costo_matricula: number;
  costo_cuota_mensual: number;
  numero_cuotas: number;
  activo: boolean;
}

const initialFormData: FeeFormData = {
  anio: new Date().getFullYear(),
  fecha_inicio: "",
  fecha_fin: "",
  costo_matricula: 0,
  costo_cuota_mensual: 0,
  numero_cuotas: 10,
  activo: true,
};

const EMPTY_ARRAY: any[] = [];

export default function CuotasProgramar() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FeeFormData>(initialFormData);

  // Fetch fees using React Query
  const { data: fees = EMPTY_ARRAY } = useQuery<FeeSchedule[]>({
    queryKey: ['periodosCuotas'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:3000/api/cuotas/periodos');
      if (response.data.success) {
        return response.data.data.sort((a: FeeSchedule, b: FeeSchedule) => b.anio - a.anio);
      }
      return [];
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'number' ? Number(value) : value
      };

      // Si cambia el año, actualizar las fechas de inicio y fin para que el calendario se posicione en ese año
      if (name === 'anio' && value) {
        const year = value;
        // Solo actualizar si las fechas están vacías o no coinciden con el año
        if (!prev.fecha_inicio || !prev.fecha_inicio.startsWith(year)) {
          newData.fecha_inicio = `${year}-01-01`;
        }
        if (!prev.fecha_fin || !prev.fecha_fin.startsWith(year)) {
          newData.fecha_fin = `${year}-12-31`;
        }
      }

      return newData;
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, activo: checked }));
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (fee: FeeSchedule) => {
    setEditingId(fee.id);
    setFormData({
      anio: fee.anio,
      fecha_inicio: fee.fecha_inicio.split('T')[0], // Ensure YYYY-MM-DD
      fecha_fin: fee.fecha_fin.split('T')[0],
      costo_matricula: Number(fee.costo_matricula),
      costo_cuota_mensual: Number(fee.costo_cuota_mensual),
      numero_cuotas: fee.numero_cuotas,
      activo: fee.activo === 1
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar este periodo?")) {
      // API Call to delete would go here when endpoint is available
      // await axios.delete(`http://localhost:3000/api/cuotas/${id}`);
      // For now, optimistic update for UX if we had the endpoint
      // setFees(prev => prev.filter(f => f.id !== id));
      alert("Funcionalidad de eliminar pendiente de endpoint");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        activo: formData.activo ? 1 : 0
      };

      if (editingId) {
        // Edit logic would go here when endpoint is available
        // await axios.put(`http://localhost:3000/api/cuotas/${editingId}`, payload);
        alert("Funcionalidad de editar pendiente de endpoint");
      } else {
        // Create Logic
        const response = await axios.post('http://localhost:3000/api/cuotas/agregar-periodo', payload);
        if (response.status === 200 || response.status === 201) {
          alert("Creado correctamente");
          // Invalidar caché para refetch de la tabla
          queryClient.invalidateQueries({ queryKey: ['periodosCuotas'] });
        }
      }
      setIsDialogOpen(false);
    } catch (error) {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Programación de Cuotas</h2>
          <p className="text-sm text-muted-foreground">Administra los costos de matrícula y pensiones por año académico.</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Periodo
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg">Periodos Académicos</CardTitle>
          <CardDescription>Lista de configuraciones de pagos por año.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-slate-50/50">
                <TableHead className="w-[100px]">Año</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Mensualidad</TableHead>
                <TableHead>N° Cuotas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-bold text-slate-700">{fee.anio}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1 text-slate-600">
                        <span className="font-semibold w-10">Inicio:</span>
                        <span>{fee.fecha_inicio.split('T')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <span className="font-semibold w-10">Fin:</span>
                        <span>{fee.fecha_fin.split('T')[0]}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">S/. {Number(fee.costo_matricula).toFixed(2)}</TableCell>
                  <TableCell className="font-medium text-slate-700">S/. {Number(fee.costo_cuota_mensual).toFixed(2)}</TableCell>
                  <TableCell className="text-center">{fee.numero_cuotas}</TableCell>
                  <TableCell>
                    {fee.activo === 1 ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 shadow-none font-medium">Activo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 font-medium">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditDialog(fee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(fee.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {fees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    No hay periodos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingId ? 'Editar Periodo' : 'Nuevo Periodo'}</DialogTitle>
            <DialogDescription>
              Configure los detalles del año académico y los costos asociados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="anio" className="font-semibold text-slate-700">Año Académico</Label>
                <Input
                  id="anio"
                  name="anio"
                  type="number"
                  placeholder="2025"
                  value={formData.anio}
                  onChange={handleInputChange}
                  required
                  className="font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_cuotas" className="font-semibold text-slate-700">N° de Cuotas</Label>
                <Input
                  id="numero_cuotas"
                  name="numero_cuotas"
                  type="number"
                  value={formData.numero_cuotas || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fecha_inicio" className="font-semibold text-slate-700">Fecha Inicio</Label>
                <Input
                  id="fecha_inicio"
                  name="fecha_inicio"
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_fin" className="font-semibold text-slate-700">Fecha Fin</Label>
                <Input
                  id="fecha_fin"
                  name="fecha_fin"
                  type="date"
                  value={formData.fecha_fin}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="costo_matricula" className="font-semibold text-slate-700">Matrícula (S/.)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">S/.</span>
                  <Input
                    id="costo_matricula"
                    name="costo_matricula"
                    type="number"
                    step="0.01"
                    value={formData.costo_matricula || ''}
                    onChange={handleInputChange}
                    required
                    className="pl-9 bg-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costo_cuota_mensual" className="font-semibold text-slate-700">Mensualidad (S/.)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">S/.</span>
                  <Input
                    id="costo_cuota_mensual"
                    name="costo_cuota_mensual"
                    type="number"
                    step="0.01"
                    value={formData.costo_cuota_mensual || ''}
                    onChange={handleInputChange}
                    required
                    className="pl-9 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
              <Label htmlFor="activo" className="flex flex-col space-y-1 cursor-pointer">
                <span className="font-semibold text-slate-900">Estado Activo</span>
                <span className="font-normal text-xs text-muted-foreground">Habilitar este periodo para matrículas nuevas</span>
              </Label>
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={handleSwitchChange}
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-11">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-semibold">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Guardar Cambios' : 'Crear Periodo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
