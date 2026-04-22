import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, Loader2, RefreshCw } from 'lucide-react';
import { api, ExportJobSummary, ExportJobsResponse, SystemSettingsReloadResponse } from '../services/api';

const extractJobs = (response: ExportJobsResponse | ExportJobSummary[] | null): ExportJobSummary[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.items ?? response.jobs ?? [];
};

const formatValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const AdminOpsTab: React.FC = () => {
  const [jobsResponse, setJobsResponse] = useState<ExportJobsResponse | ExportJobSummary[] | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [reloading, setReloading] = useState(false);
  const [reloadResult, setReloadResult] = useState<SystemSettingsReloadResponse | null>(null);
  const [reloadError, setReloadError] = useState('');

  const jobs = useMemo(() => extractJobs(jobsResponse), [jobsResponse]);

  const loadJobs = async () => {
    setJobsLoading(true);
    setJobsError('');
    try {
      setJobsResponse(await api.listExportJobs());
    } catch (err: any) {
      setJobsError(err?.message || 'No se pudieron cargar los export jobs');
      setJobsResponse(null);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const handleReload = async () => {
    setReloading(true);
    setReloadError('');
    try {
      setReloadResult(await api.reloadSettings());
    } catch (err: any) {
      setReloadError(err?.message || 'No se pudo recargar settings');
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <section className="bg-a3sec-surface rounded-xl shadow border border-a3sec-border overflow-hidden">
          <div className="p-4 border-b border-a3sec-border flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-a3sec-deeper">
            <div>
              <h3 className="font-semibold text-slate-300">Export Jobs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Jobs activos o recientes de exportación</p>
            </div>
            <button
              onClick={loadJobs}
              disabled={jobsLoading}
              className="flex items-center px-3 py-2 bg-brand-green text-a3sec-dark text-white text-sm rounded-lg hover:bg-brand-green/90 disabled:opacity-50"
            >
              <RefreshCw size={16} className={`mr-2 ${jobsLoading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>
          </div>

          {jobsLoading ? (
            <div className="p-8 text-slate-400 flex items-center justify-center">
              <Loader2 size={18} className="mr-2 animate-spin" /> Cargando jobs...
            </div>
          ) : jobsError ? (
            <div className="p-6 text-sm text-red-300 bg-red-500/10 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{jobsError}</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Database className="mx-auto mb-3 text-slate-300" size={40} />
              <p className="text-sm">No hay export jobs recientes.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobs.map((job, index) => (
                <div key={job.job_id || job.id || index} className="p-4 hover:bg-a3sec-deeper transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white">Job {formatValue(job.job_id || job.id)}</div>
                      <div className="text-xs text-slate-500">Estado: {formatValue(job.status)}</div>
                      <div className="text-xs text-slate-500">Creado: {formatValue(job.created_at)}</div>
                      <div className="text-xs text-slate-500">Actualizado: {formatValue(job.updated_at)}</div>
                      {job.download_url && (
                        <div className="text-xs text-brand-green break-all">Download: {formatValue(job.download_url)}</div>
                      )}
                    </div>
                    <div className="md:max-w-[50%]">
                      <pre className="max-h-40 overflow-auto rounded-lg border border-a3sec-border bg-a3sec-dark p-3 text-[11px] text-slate-300 whitespace-pre-wrap break-words">
                        {JSON.stringify(job, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-a3sec-surface rounded-xl shadow border border-a3sec-border overflow-hidden">
          <div className="p-4 border-b border-a3sec-border flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-a3sec-deeper">
            <div>
              <h3 className="font-semibold text-slate-300">Runtime Settings Reload</h3>
              <p className="text-xs text-slate-500 mt-0.5">Recarga la configuración actual desde variables de entorno</p>
            </div>
            <button
              onClick={handleReload}
              disabled={reloading}
              className="flex items-center px-3 py-2 bg-brand-green text-a3sec-dark text-white text-sm rounded-lg hover:bg-brand-green/90 disabled:opacity-50"
            >
              <RefreshCw size={16} className={`mr-2 ${reloading ? 'animate-spin' : ''}`} />
              Recargar settings
            </button>
          </div>

          <div className="p-4 space-y-4">
            {reloadError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{reloadError}</span>
              </div>
            )}

            {reloadResult ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 p-3 text-sm text-slate-200">
                  <div className="font-semibold text-white">Settings reloaded</div>
                  <div className="mt-1 text-xs text-slate-300">{reloadResult.reloaded_at}</div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(reloadResult.snapshot || {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-a3sec-border bg-a3sec-deeper p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">{key}</div>
                      <div className="mt-1 text-sm text-white break-words">{formatValue(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                Ejecutá la recarga para ver el snapshot actualizado.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
