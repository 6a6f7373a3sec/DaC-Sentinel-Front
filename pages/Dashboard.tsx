import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { PieChart, Pie, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Sector } from 'recharts';
import { AlertCircle, CheckCircle, ShieldAlert, FileText } from 'lucide-react';
import { COLORS } from '../constants';

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
    <div className={`p-3 rounded-full ${color} bg-opacity-10 mr-4`}>
      <Icon className={color.replace('bg-', 'text-')} size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getSummary();
        console.log('Dashboard summary:', data);
        setSummary(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Transform data for charts
  const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'informational'] as const;
  const severityRank = new Map(SEVERITY_ORDER.map((s, i) => [s, i]));

  // Transform data for charts
  const levelData = Object.entries(summary.by_level)
    .map(([name, value]) => {
      const key = String(name).toLowerCase().trim(); // normaliza para ordenar/colorear
      return { name, key, value: Number(value) };
    })
    .sort((a, b) => {
      const ra = severityRank.has(a.key as any) ? severityRank.get(a.key as any)! : 999;
      const rb = severityRank.has(b.key as any) ? severityRank.get(b.key as any)! : 999;
      if (ra !== rb) return ra - rb;
      return a.key.localeCompare(b.key); // fallback para desconocidos
    });

  //const statusData = Object.entries(summary.by_status).map(([name, value]) => ({ name, value }));
  const productData = Object.entries(summary.by_product)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const renderSeveritySector = (props: any) => {
    const { index, ...rest } = props;
    //console.log('Rendering sector:', props);
    return (
      <Sector
        {...rest}
        fill={COLORS.severity[levelData[index]?.key ?? 'low'] || COLORS.chart[index % COLORS.chart.length]}
      />
    );
  };

  const renderLevelLegend = () => (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
      {levelData.map((item, index) => (
        <div key={item.name} className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: COLORS.severity[item.key] || COLORS.chart[index % COLORS.chart.length] }}
          />
          <span className="text-slate-600">{item.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de reglas" value={summary.total_rules} icon={FileText} color="bg-blue-600" />
        <StatCard title="Cobertura de ataque" value={`${summary.attack_coverage.percentage}%`} icon={ShieldAlert} color="bg-indigo-600" />
        <StatCard title="Reglas activas" value={summary.by_status['stable'] || 0} icon={CheckCircle} color="bg-green-600" />
        <StatCard title="Experimental" value={summary.by_status['experimental'] || 0} icon={AlertCircle} color="bg-yellow-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Reglas por nivel de severidad</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={levelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  shape={renderSeveritySector}
                />
                <Tooltip />
                <Legend content={renderLevelLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Top Data Sources (Productos)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};