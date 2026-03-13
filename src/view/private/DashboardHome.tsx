import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchDebtors,
  fetchSummaryStats,
  fetchRecentPayments,
  type RecentPayment,
  type Debtor,
  type DashboardSummaryData
} from "@/services/dashboardService";
import { SimpleLineChart } from "@/components/charts/SimpleLineChart";
import { SimplePieChart } from "@/components/charts/SimplePieChart";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  AlertCircle,
  Loader2,
  DollarSign
} from "lucide-react";

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function DashboardHome() {
  const [summaryData, setSummaryData] = useState<DashboardSummaryData | null>(null);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      const [summary, paymentsData, debtorsData] = await Promise.all([
        fetchSummaryStats(),
        fetchRecentPayments(),
        fetchDebtors()
      ]);

      if (summary) {
        setSummaryData(summary);
      }

      setRecentPayments(paymentsData);
      setDebtors(debtorsData);

    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-PE').format(num);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-slate-400" />
        <p className="text-sm font-medium">Cargando información del panel...</p>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-slate-500">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Error al cargar datos</h2>
        <p className="text-sm mt-1">Por favor, intente nuevamente más tarde.</p>
      </div>
    );
  }

  const { kpis, distribucion_sexo, tendencia_ingresos, comparativa_pagos } = summaryData;

  const paymentStatusData = [
    { label: "Pagado", value: comparativa_pagos.pagado, color: "#0f172a" }, // Dark slate
    { label: "Pendiente", value: comparativa_pagos.pendiente, color: "#e2e8f0" } // Light slate
  ];

  const monthlyTrendData = tendencia_ingresos.map(item => ({
    label: MONTH_NAMES[item.mes - 1] || item.mes.toString(),
    value: parseFloat(item.total)
  }));

  const ingresosActuales = parseFloat(kpis.ingresos_mensuales);
  const ingresosAnteriores = parseFloat(kpis.ingresos_mes_anterior);
  const crecimiento = ingresosAnteriores > 0
    ? ((ingresosActuales - ingresosAnteriores) / ingresosAnteriores) * 100
    : 0;

  return (
    <div className="flex-1 bg-white p-6 md:p-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resumen General</h1>
          <p className="text-sm text-slate-500 mt-1">Visión global de ingresos, población y estado de pagos.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Actualizado: {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Ingresos Mensuales"
          value={formatCurrency(kpis.ingresos_mensuales)}
          icon={<DollarSign className="h-4 w-4 text-slate-500" />}
          trend={`${crecimiento >= 0 ? '+' : ''}${crecimiento.toFixed(1)}% respecto al mes anterior`}
          trendPositive={crecimiento >= 0}
        />
        <MetricCard
          title="Estudiantes Activos"
          value={formatNumber(kpis.estudiantes_activos)}
          icon={<Users className="h-4 w-4 text-slate-500" />}
          description="Total de población matriculada"
        />
        <MetricCard
          title="Morosidad Total"
          value={formatCurrency(kpis.pagos_pendientes)}
          icon={<AlertCircle className="h-4 w-4 text-slate-500" />}
          description={`${kpis.estudiantes_con_deuda} estudiantes con deuda`}
          highlight="danger"
        />
        <MetricCard
          title="Tasa de Recaudación"
          value={`${kpis.tasa_recaudacion}%`}
          icon={<CreditCard className="h-4 w-4 text-slate-500" />}
          trend={kpis.tasa_recaudacion >= kpis.meta_mensual ? 'Meta mensual alcanzada' : 'Por debajo de la meta'}
          trendPositive={kpis.tasa_recaudacion >= kpis.meta_mensual}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Charts Section */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Tendencia de Ingresos Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full mt-4">
              {monthlyTrendData.length > 0 ? (
                <SimpleLineChart
                  data={monthlyTrendData}
                  height={280}
                  color="#0f172a"
                  showDots={true}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No hay datos suficientes para graficar
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments Status Pie Chart */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Estado de Recaudación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center pt-4">
              <SimplePieChart data={paymentStatusData} size={180} showLegend={false} />
              <div className="w-full mt-8 space-y-3">
                {paymentStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sex Distribution */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Distribución por Sexo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around py-6">
              {distribucion_sexo.map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl font-bold text-slate-900 tracking-tight">
                    {formatNumber(item.cantidad)}
                  </div>
                  <div className="text-sm font-medium text-slate-500 mt-1">
                    {item.sexo === 'M' ? 'Hombres' : 'Mujeres'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Últimos Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {recentPayments.length > 0 ? recentPayments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.studentName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.type}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 ml-4 whitespace-nowrap">
                    +{formatCurrency(p.amount)}
                  </span>
                </div>
              )) : (
                <div className="text-center text-sm text-slate-500 py-4">No hay pagos recientes</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debtors List */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Estudiantes en Mora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {debtors.length > 0 ? debtors.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.studentName}</p>
                    <p className="text-xs text-red-500 font-medium mt-0.5">{d.months} {d.months === 1 ? 'mes' : 'meses'} de atraso</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600 ml-4 whitespace-nowrap">
                    {formatCurrency(d.amount)}
                  </span>
                </div>
              )) : (
                <div className="text-center text-sm text-slate-500 py-4">No hay morosidad registrada</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// Minimalist, high contrast Metric Card
function MetricCard({ title, value, icon, description, trend, trendPositive, highlight }: any) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <span className={`text-2xl font-bold tracking-tight ${highlight === 'danger' ? 'text-red-600' : 'text-slate-900'}`}>
            {value}
          </span>
          
          {trend && (
            <p className={`text-xs flex items-center gap-1 mt-1 font-medium ${trendPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trendPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend}
            </p>
          )}

          {description && !trend && (
            <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
