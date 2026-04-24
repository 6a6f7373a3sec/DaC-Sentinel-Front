import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  api,
  ApiError,
  RuleConvertPayload,
  RuleConvertResult,
  RulePipeline,
  RulePipelineCreatePayload,
  SigmaFormatOption,
  SigmaTargetOption,
} from '../services/api';
import { Modal } from './Modal';
import { sanitizePipelineYaml } from '../utils/pipelineSanitizer';

interface RulePipelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleId: number;
  ruleTitle: string;
}

type FeedbackTone = 'success' | 'warning' | 'error';
type FeedbackState = { tone: FeedbackTone; message: string };

const feedbackStyles: Record<FeedbackTone, string> = {
  success: 'bg-brand-green/10 border-brand-green/30 text-brand-green',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  error:   'bg-red-500/10 border-red-500/30 text-red-300',
};

const feedbackIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    if (error.status === 409) return `Conflicto: ${error.message}`;
    if (error.status === 422) return `Validación: ${error.message}`;
    if (error.status === 404) return `No encontrado: ${error.message}`;
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const tryParseVarsJson = (raw: string): Record<string, string> | null => {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
      return parsed as Record<string, string>;
    }
    return null;
  } catch {
    return null;
  }
};

export const RulePipelinesModal: React.FC<RulePipelinesModalProps> = ({ isOpen, onClose, ruleId, ruleTitle }) => {
  // --- Pipeline list state ---
  const [pipelines, setPipelines]           = useState<RulePipeline[]>([]);
  const [targets, setTargets]               = useState<SigmaTargetOption[]>([]);
  const [formats, setFormats]               = useState<SigmaFormatOption[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [loadingPipelines, setLoadingPipelines] = useState(true);
  const [loadingDetailId, setLoadingDetailId]   = useState<number | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [deletingId, setDeletingId]         = useState<number | null>(null);
  const [copied, setCopied]                 = useState(false);
  const [pipelinesError, setPipelinesError] = useState<string | null>(null);
  const [feedback, setFeedback]             = useState<FeedbackState | null>(null);

  // --- Pipeline form state ---
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [pipelineName, setPipelineName] = useState('');
  const [targetBackend, setTargetBackend] = useState('');
  const [targetFormat, setTargetFormat]   = useState('default');
  const [position, setPosition]           = useState('0');
  const [pipelineYaml, setPipelineYaml]   = useState('');
  const [varsJson, setVarsJson]           = useState('');
  const [varsJsonError, setVarsJsonError] = useState<string | null>(null);
  const [removedKeys, setRemovedKeys]     = useState<string[]>([]);

  // --- Conversion state ---
  const [converting, setConverting]             = useState(false);
  const [conversionResult, setConversionResult] = useState<RuleConvertResult | null>(null);
  const [convertBackend, setConvertBackend]     = useState('');
  const [convertFormat, setConvertFormat]       = useState('default');
  const [convertVarsJson, setConvertVarsJson]   = useState('');

  // ------------------------------------------------------------------ loaders

  const loadPipelines = useCallback(async () => {
    setLoadingPipelines(true);
    setPipelinesError(null);
    try {
      const first = await api.listRulePipelines(ruleId, { page: 1, page_size: 100 });
      let items = [...first.items];
      const totalPages = Math.min(
        Math.max(1, Math.ceil((first.total || first.items.length) / (first.page_size || 100))),
        50,
      );
      if (totalPages > 1) {
        const rest = await Promise.allSettled(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            api.listRulePipelines(ruleId, { page: i + 2, page_size: 100 }),
          ),
        );
        for (const r of rest) {
          if (r.status === 'fulfilled') items = items.concat(r.value.items);
        }
      }
      items.sort((a, b) => a.position - b.position || a.pipeline_name.localeCompare(b.pipeline_name));
      setPipelines(items);
    } catch (error) {
      setPipelinesError(getErrorMessage(error, 'Error cargando pipelines de la regla.'));
    } finally {
      setLoadingPipelines(false);
    }
  }, [ruleId]);

  const loadTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const list = await api.getSigmaTargets();
      setTargets(list);
      if (!targetBackend && list[0]) {
        setTargetBackend(list[0].name);
        setConvertBackend(list[0].name);
      }
    } catch {
      setTargets([]);
    } finally {
      setLoadingTargets(false);
    }
  }, [targetBackend]);

  useEffect(() => { loadPipelines(); loadTargets(); }, [loadPipelines, loadTargets]);

  useEffect(() => {
    if (!targetBackend) { setFormats([]); return; }
    let cancelled = false;
    api.getSigmaFormats(targetBackend).then(list => {
      if (cancelled) return;
      setFormats(list);
      setTargetFormat(prev => list.some(f => f.name === prev) ? prev : (list[0]?.name || 'default'));
    }).catch(() => { if (!cancelled) setFormats([]); });
    return () => { cancelled = true; };
  }, [targetBackend]);

  // ------------------------------------------------------------------ form helpers

  const resetForm = useCallback(() => {
    setEditingId(null);
    setPipelineName('');
    setPipelineYaml('');
    setVarsJson('');
    setVarsJsonError(null);
    setRemovedKeys([]);
    setPosition('0');
    setTargetBackend(targets[0]?.name || '');
    setTargetFormat('default');
  }, [targets]);

  const applyPipelineToForm = useCallback((p: RulePipeline) => {
    setEditingId(p.id);
    setPipelineName(p.pipeline_name);
    setTargetBackend(p.target_backend);
    setTargetFormat(p.target_format || 'default');
    setPosition(String(p.position));
    setPipelineYaml(p.pipeline_yaml || '');
    setVarsJson(p.vars ? JSON.stringify(p.vars, null, 2) : '');
    setVarsJsonError(null);
    setRemovedKeys([]);
  }, []);

  const validateVarsJson = (raw: string): boolean => {
    if (!raw.trim()) { setVarsJsonError(null); return true; }
    const parsed = tryParseVarsJson(raw);
    if (!parsed) {
      setVarsJsonError('JSON inválido o no es un objeto plano. Ej: {"index": "win_logs"}');
      return false;
    }
    setVarsJsonError(null);
    return true;
  };

  // ------------------------------------------------------------------ handlers

  const handleRefresh = async () => {
    setFeedback(null);
    await loadPipelines();
  };

  const handleCreateNew = () => {
    setFeedback(null);
    resetForm();
  };

  const handleEdit = async (pipeline: RulePipeline) => {
    setLoadingDetailId(pipeline.id);
    setFeedback(null);
    try {
      const detail = await api.getRulePipeline(ruleId, pipeline.id);
      applyPipelineToForm(detail);
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'No se pudo cargar el pipeline.') });
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleDelete = async (pipeline: RulePipeline) => {
    if (!confirm(`¿Eliminar el pipeline "${pipeline.pipeline_name}"?`)) return;
    setDeletingId(pipeline.id);
    setFeedback(null);
    try {
      await api.deleteRulePipeline(ruleId, pipeline.id);
      if (editingId === pipeline.id) resetForm();
      await loadPipelines();
      setFeedback({ tone: 'success', message: 'Pipeline eliminado correctamente.' });
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'No se pudo eliminar el pipeline.') });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    if (!pipelineName.trim()) {
      setFeedback({ tone: 'error', message: 'El nombre del pipeline es obligatorio.' });
      return;
    }
    if (!targetBackend.trim()) {
      setFeedback({ tone: 'error', message: 'Seleccioná un backend objetivo.' });
      return;
    }
    const numericPosition = Number(position);
    if (!Number.isInteger(numericPosition) || numericPosition < 0) {
      setFeedback({ tone: 'error', message: 'La posición debe ser un entero ≥ 0.' });
      return;
    }
    if (!validateVarsJson(varsJson)) return;

    const sanitized = sanitizePipelineYaml(pipelineYaml);
    if (!sanitized.yaml.trim()) {
      setFeedback({ tone: 'error', message: 'El YAML del pipeline quedó vacío después de normalizarlo.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    setRemovedKeys(sanitized.removedKeys);

    try {
      const parsedVars = varsJson.trim() ? tryParseVarsJson(varsJson) : null;
      const payload: RulePipelineCreatePayload = {
        pipeline_name:  pipelineName.trim(),
        pipeline_yaml:  sanitized.yaml.trim(),
        target_backend: targetBackend.trim(),
        target_format:  (targetFormat || 'default').trim(),
        position:       numericPosition,
        vars:           parsedVars,
      };

      const response = editingId !== null
        ? await api.updateRulePipeline(ruleId, editingId, {
            pipeline_name:  payload.pipeline_name,
            pipeline_yaml:  payload.pipeline_yaml,
            target_backend: payload.target_backend,
            target_format:  payload.target_format,
            position:       payload.position,
            vars:           payload.vars,
          })
        : await api.createRulePipeline(ruleId, payload);

      applyPipelineToForm(response);
      await loadPipelines();
      setFeedback({
        tone:    response.warning ? 'warning' : 'success',
        message: response.warning || (editingId !== null ? 'Pipeline actualizado.' : 'Pipeline creado.'),
      });
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'No se pudo guardar el pipeline.') });
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!convertBackend.trim()) {
      setFeedback({ tone: 'error', message: 'Seleccioná un backend objetivo para la conversión.' });
      return;
    }

    setConverting(true);
    setFeedback(null);
    setConversionResult(null);

    try {
      const parsedVarsOverride = convertVarsJson.trim() ? tryParseVarsJson(convertVarsJson) : undefined;

      const payload: RuleConvertPayload = {
        target_backend: convertBackend.trim(),
        target_format:  convertFormat || 'default',
        ...(parsedVarsOverride ? { vars_override: parsedVarsOverride } : {}),
      };

      const response = await api.convertRule(ruleId, payload);
      setConversionResult(response);
      if (response.warning) {
        setFeedback({ tone: 'warning', message: response.warning });
      }
    } catch (error) {
      setConversionResult(null);
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'No se pudo convertir la regla.') });
    } finally {
      setConverting(false);
    }
  };

  const copyConversionResult = async () => {
    if (!conversionResult?.result) return;
    await navigator.clipboard.writeText(conversionResult.result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedback?.tone === 'error') {
      feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [feedback]);

  const FeedbackIcon = feedback ? feedbackIcons[feedback.tone] : null;

  // ------------------------------------------------------------------ render

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pipelines — ${ruleTitle}`} size="3xl">
      <div className="space-y-6">

        {/* Header info */}
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 p-4 text-sm text-slate-200">
          <div className="flex items-start gap-3">
            <Repeat2 size={18} className="mt-0.5 shrink-0 text-brand-green" />
            <div>
              <div className="font-semibold text-white">Pipelines de la regla</div>
              <p className="mt-1 text-slate-300">
                Cada pipeline es una <strong className="text-white">función pura</strong> aplicable a esta regla Sigma.
                La variación vive en <code className="text-brand-green">vars</code>, no en el pipeline.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && FeedbackIcon && (
          <div ref={feedbackRef} className={`rounded-xl border px-4 py-3 text-sm ${feedbackStyles[feedback.tone]}`}>
            <div className="flex items-start gap-2">
              <FeedbackIcon size={16} className="mt-0.5 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">

          {/* ---- LEFT: Inventory + Conversion ---- */}
          <section className="space-y-4">

            {/* Inventory header */}
            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Inventario</h3>
                  <p className="text-xs text-slate-500 mt-1">{pipelines.length} pipeline(s) configurado(s)</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleRefresh}
                    className="inline-flex items-center gap-2 rounded-lg border border-a3sec-muted px-3 py-2 text-sm font-medium hover:bg-a3sec-deeper">
                    <RefreshCw size={15} /> Refrescar
                  </button>
                  <button type="button" onClick={handleCreateNew}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-green/40 px-3 py-2 text-sm font-medium text-brand-green hover:bg-brand-green/10">
                    <Plus size={15} /> Nuevo pipeline
                  </button>
                </div>
              </div>
            </div>

            {/* Pipeline list */}
            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-4">
              {pipelinesError && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {pipelinesError}
                </div>
              )}

              {loadingPipelines ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 size={18} className="mr-2 animate-spin" /> Cargando pipelines...
                </div>
              ) : pipelines.length === 0 ? (
                <div className="rounded-lg border border-dashed border-a3sec-border px-4 py-8 text-center text-sm text-slate-500">
                  Esta regla no tiene pipelines configurados. Agregá al menos uno para poder convertir.
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelines.map(pipeline => (
                    <div key={pipeline.id}
                      className="rounded-xl border border-a3sec-border bg-a3sec-deeper/70 p-4 transition-colors">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{pipeline.pipeline_name}</h4>
                            <span className="rounded-full border border-a3sec-border px-2 py-0.5 text-[11px] text-slate-400">
                              pos {pipeline.position}
                            </span>
                            {pipeline.vars && Object.keys(pipeline.vars).length > 0 && (
                              <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-300">
                                vars: {Object.keys(pipeline.vars).join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                            <span className="rounded-full border border-a3sec-border px-2 py-0.5">backend: {pipeline.target_backend}</span>
                            <span className="rounded-full border border-a3sec-border px-2 py-0.5">format: {pipeline.target_format}</span>
                            <span className="rounded-full border border-a3sec-border px-2 py-0.5">
                              {formatTimestamp(pipeline.updated_at || pipeline.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button type="button" onClick={() => handleEdit(pipeline)}
                            disabled={loadingDetailId === pipeline.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-a3sec-muted px-3 py-1.5 text-xs font-medium hover:bg-a3sec-surface disabled:opacity-60">
                            {loadingDetailId === pipeline.id ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
                            Editar
                          </button>
                          <button type="button" onClick={() => handleDelete(pipeline)}
                            disabled={deletingId === pipeline.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-60">
                            {deletingId === pipeline.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conversion panel */}
            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Conversión</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Convierte esta regla usando los pipelines configurados.
                </p>
              </div>

              {pipelines.length === 0 && !loadingPipelines ? (
                <div className="rounded-lg border border-dashed border-a3sec-border px-4 py-6 text-center text-sm text-slate-500">
                  Esta regla no tiene pipelines configurados. Agregá al menos uno para poder convertir.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-[1fr,1fr,auto] md:items-end">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Backend</label>
                      <div className="relative">
                        <select value={convertBackend} onChange={e => setConvertBackend(e.target.value)}
                          disabled={loadingTargets}
                          className="w-full appearance-none rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-60">
                          <option value="">Seleccioná...</option>
                          {targets.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Formato</label>
                      <input value={convertFormat} onChange={e => setConvertFormat(e.target.value)}
                        placeholder="default"
                        className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                    </div>

                    <button type="button" onClick={handleConvert}
                      disabled={converting || !convertBackend.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-green/40 px-4 py-2.5 text-sm font-medium text-brand-green hover:bg-brand-green/10 disabled:opacity-60">
                      {converting ? <Loader2 size={15} className="animate-spin" /> : <Repeat2 size={15} />}
                      Convertir
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">vars_override (JSON) — opcional</label>
                    <textarea
                      value={convertVarsJson}
                      onChange={e => setConvertVarsJson(e.target.value)}
                      rows={3}
                      placeholder={'{\n  "index": "win_logs"\n}'}
                      className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  </div>
                </>
              )}

              {conversionResult && (
                <div className="rounded-xl border border-a3sec-border bg-a3sec-deeper/70 p-4 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Resultado</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        rule_id: {conversionResult.rule_id} · backend: {conversionResult.backend} · format: {conversionResult.format} · {conversionResult.pipelines_used} pipeline(s)
                      </p>
                    </div>
                    <button type="button" onClick={copyConversionResult}
                      className="inline-flex items-center gap-2 rounded-lg border border-a3sec-muted px-3 py-1.5 text-xs font-medium hover:bg-a3sec-surface">
                      <Copy size={13} /> {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>

                  {conversionResult.vars_used && Object.keys(conversionResult.vars_used).length > 0 && (
                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">
                      <span className="font-semibold">vars usadas: </span>
                      {Object.entries(conversionResult.vars_used).map(([k, v]) => `${k}=${v}`).join(' · ')}
                    </div>
                  )}

                  <pre className="max-h-72 overflow-auto rounded-lg border border-a3sec-border bg-[#091018] p-3 text-xs text-slate-200 whitespace-pre-wrap break-words">
                    {conversionResult.result}
                  </pre>
                </div>
              )}
            </div>
          </section>

          {/* ---- RIGHT: Form ---- */}
          <section className="space-y-4">
            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    {editingId !== null ? 'Editar pipeline' : 'Nuevo pipeline'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">El YAML se normaliza al schema pySigma antes de persistirse.</p>
                </div>
                {editingId !== null && (
                  <button type="button" onClick={handleCreateNew}
                    className="inline-flex items-center gap-2 rounded-lg border border-a3sec-muted px-3 py-1.5 text-xs font-medium hover:bg-a3sec-deeper">
                    <Plus size={13} /> Nuevo
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Nombre del pipeline</label>
                <input value={pipelineName} onChange={e => setPipelineName(e.target.value)}
                  placeholder="Splunk Windows Sysmon"
                  className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Backend objetivo</label>
                  <div className="relative">
                    <select value={targetBackend} onChange={e => setTargetBackend(e.target.value)}
                      disabled={loadingTargets}
                      className="w-full appearance-none rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-60">
                      <option value="">Seleccioná...</option>
                      {targets.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Formato</label>
                  {formats.length > 0 ? (
                    <div className="relative">
                      <select value={targetFormat} onChange={e => setTargetFormat(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
                        {formats.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  ) : (
                    <input value={targetFormat} onChange={e => setTargetFormat(e.target.value)}
                      placeholder="default"
                      className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Posición</label>
                <input type="number" min={0} step={1} value={position} onChange={e => setPosition(e.target.value)}
                  className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                <p className="mt-1 text-xs text-slate-500">Pipelines de la misma regla se encadenan por `position` ASC.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Pipeline YAML</label>
                <textarea value={pipelineYaml} onChange={e => setPipelineYaml(e.target.value)} rows={10}
                  placeholder={"name: splunk_windows\ntransformations:\n  - id: field_mapping\n    type: field_name_mapping\n    mapping:\n      CommandLine: command_line"}
                  className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-green" />
                {removedKeys.length > 0 && (
                  <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                    YAML normalizado: claves no soportadas eliminadas: {removedKeys.join(', ')}.
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Variables (JSON) — opcional</label>
                <textarea value={varsJson}
                  onChange={e => { setVarsJson(e.target.value); validateVarsJson(e.target.value); }}
                  rows={4}
                  placeholder={'{\n  "index": "win_logs",\n  "sourcetype": "xmlwineventlog"\n}'}
                  className={`w-full rounded-lg border p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-green bg-a3sec-deeper ${varsJsonError ? 'border-red-500/60' : 'border-a3sec-muted'}`} />
                {varsJsonError && (
                  <p className="mt-1 text-xs text-red-300">{varsJsonError}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">Valores por defecto para placeholders <code>{'{{key}}'}</code> en el YAML.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-a3sec-dark text-white hover:bg-brand-green/90 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {editingId !== null ? 'Guardar cambios' : 'Crear pipeline'}
                </button>
                <button type="button" onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-lg border border-a3sec-muted px-4 py-2 text-sm font-medium hover:bg-a3sec-deeper">
                  <RefreshCw size={15} /> Limpiar
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
};
