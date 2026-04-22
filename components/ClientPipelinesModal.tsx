import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ClientBatchConversionResult,
  ClientPipeline,
  ClientPipelineCreatePayload,
  ClientProfile,
  ClientRuleConversionResult,
  ClientRuleItem,
  SigmaFormatOption,
  SigmaTargetOption,
} from '../services/api';
import { Modal } from './Modal';
import { sanitizePipelineYaml } from '../utils/pipelineSanitizer';

interface ClientPipelinesModalProps {
  client: ClientProfile;
  onClose: () => void;
}

type FeedbackTone = 'success' | 'warning' | 'error';
type FeedbackState = { tone: FeedbackTone; message: string };

const feedbackStyles: Record<FeedbackTone, string> = {
  success: 'bg-brand-green/10 border-brand-green/30 text-brand-green',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  error: 'bg-red-500/10 border-red-500/30 text-red-300',
};

const feedbackIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
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

export const ClientPipelinesModal: React.FC<ClientPipelinesModalProps> = ({ client, onClose }) => {
  const [rules, setRules] = useState<ClientRuleItem[]>([]);
  const [pipelines, setPipelines] = useState<ClientPipeline[]>([]);
  const [targets, setTargets] = useState<SigmaTargetOption[]>([]);
  const [formats, setFormats] = useState<SigmaFormatOption[]>([]);

  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [loadingPipelines, setLoadingPipelines] = useState(true);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [convertingRuleId, setConvertingRuleId] = useState<number | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const [rulesError, setRulesError] = useState<string | null>(null);
  const [pipelinesError, setPipelinesError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [filterRuleId, setFilterRuleId] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formRuleId, setFormRuleId] = useState('');
  const [pipelineName, setPipelineName] = useState('');
  const [targetBackend, setTargetBackend] = useState('');
  const [targetFormat, setTargetFormat] = useState('default');
  const [position, setPosition] = useState('0');
  const [pipelineYaml, setPipelineYaml] = useState('');
  const [removedKeys, setRemovedKeys] = useState<string[]>([]);

  const [convertRuleId, setConvertRuleId] = useState('');
  const [conversionResult, setConversionResult] = useState<ClientRuleConversionResult | null>(null);
  const [batchResult, setBatchResult] = useState<ClientBatchConversionResult | null>(null);

  const ruleMap = useMemo(
    () => new Map<number, ClientRuleItem>(rules.map(rule => [rule.id, rule])),
    [rules],
  );

  const getRuleLabel = useCallback((ruleId: number) => {
    const rule = ruleMap.get(ruleId);
    return rule ? rule.title : `Regla #${ruleId} · fuera del filtro actual`;
  }, [ruleMap]);

  const getRuleMeta = useCallback((ruleId: number) => {
    const rule = ruleMap.get(ruleId);
    if (!rule) return 'No visible en el filtro actual del cliente';
    return [rule.product, rule.logsource_service || rule.service, rule.level]
      .filter(Boolean)
      .join(' · ');
  }, [ruleMap]);

  const availableRuleIds = useMemo(() => {
    const ids = new Set<number>();
    rules.forEach(rule => ids.add(rule.id));
    pipelines.forEach(pipeline => ids.add(pipeline.rule_id));
    return [...ids].sort((a, b) => getRuleLabel(a).localeCompare(getRuleLabel(b)));
  }, [getRuleLabel, pipelines, rules]);

  const sortedPipelines = useMemo(
    () => [...pipelines].sort((a, b) => {
      const byRule = getRuleLabel(a.rule_id).localeCompare(getRuleLabel(b.rule_id));
      if (byRule !== 0) return byRule;
      if (a.position !== b.position) return a.position - b.position;
      return a.pipeline_name.localeCompare(b.pipeline_name);
    }),
    [getRuleLabel, pipelines],
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setPipelineName('');
    setPosition('0');
    setPipelineYaml('');
    setRemovedKeys([]);
    setFormRuleId(filterRuleId || (availableRuleIds[0] ? String(availableRuleIds[0]) : ''));
    setTargetBackend(targets[0]?.name || '');
    setTargetFormat('default');
  }, [availableRuleIds, filterRuleId, targets]);

  const applyPipelineToForm = useCallback((pipeline: ClientPipeline) => {
    setEditingId(pipeline.id);
    setFormRuleId(String(pipeline.rule_id));
    setPipelineName(pipeline.pipeline_name);
    setTargetBackend(pipeline.target_backend);
    setTargetFormat(pipeline.target_format || 'default');
    setPosition(String(pipeline.position));
    setPipelineYaml(pipeline.pipeline_yaml || '');
    setRemovedKeys([]);
  }, []);

  const loadRules = useCallback(async () => {
    setLoadingRules(true);
    setRulesError(null);
    try {
      const firstPage = await api.getClientRules(client.id, { page: 1, page_size: 100 });
      let items = [...firstPage.items];
      const totalPages = Math.min(firstPage.total_pages ?? 1, 50);

      if (totalPages > 1) {
        const requests = Array.from(
          { length: totalPages - 1 },
          (_, index) => api.getClientRules(client.id, { page: index + 2, page_size: 100 }),
        );
        const results = await Promise.allSettled(requests);
        for (const result of results) {
          if (result.status === 'fulfilled') items = items.concat(result.value.items);
        }
      }

      items.sort((a, b) => a.title.localeCompare(b.title));
      setRules(items);
    } catch (error) {
      setRulesError(getErrorMessage(error, 'Error cargando reglas del cliente.'));
    } finally {
      setLoadingRules(false);
    }
  }, [client.id]);

  const loadTargets = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const targetList = await api.getSigmaTargets();
      setTargets(targetList);
      if (!targetBackend && targetList[0]) setTargetBackend(targetList[0].name);
    } catch {
      setTargets([]);
    } finally {
      setLoadingTargets(false);
    }
  }, [targetBackend]);

  const loadPipelines = useCallback(async () => {
    setLoadingPipelines(true);
    setPipelinesError(null);
    try {
      const ruleId = filterRuleId ? Number(filterRuleId) : undefined;
      const firstPage = await api.listClientPipelines(client.id, {
        rule_id: ruleId,
        page: 1,
        page_size: 100,
      });
      let items = [...firstPage.items];
      const totalPages = Math.min(
        Math.max(1, Math.ceil((firstPage.total || firstPage.items.length) / (firstPage.page_size || 100))),
        50,
      );

      if (totalPages > 1) {
        const requests = Array.from(
          { length: totalPages - 1 },
          (_, index) => api.listClientPipelines(client.id, {
            rule_id: ruleId,
            page: index + 2,
            page_size: 100,
          }),
        );
        const results = await Promise.allSettled(requests);
        for (const result of results) {
          if (result.status === 'fulfilled') items = items.concat(result.value.items);
        }
      }

      setPipelines(items);
    } catch (error) {
      setPipelinesError(getErrorMessage(error, 'Error cargando pipelines del cliente.'));
    } finally {
      setLoadingPipelines(false);
    }
  }, [client.id, filterRuleId]);

  useEffect(() => {
    loadRules();
    loadTargets();
  }, [loadRules, loadTargets]);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    if (!targetBackend) {
      setFormats([]);
      return;
    }

    let cancelled = false;
    api.getSigmaFormats(targetBackend)
      .then(formatList => {
        if (cancelled) return;
        setFormats(formatList);
        setTargetFormat(prev => {
          if (prev && formatList.some(format => format.name === prev)) return prev;
          return formatList[0]?.name || prev || 'default';
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFormats([]);
      });

    return () => { cancelled = true; };
  }, [targetBackend]);

  useEffect(() => {
    if (!formRuleId && availableRuleIds[0]) setFormRuleId(filterRuleId || String(availableRuleIds[0]));
  }, [availableRuleIds, filterRuleId, formRuleId]);

  useEffect(() => {
    if (!convertRuleId && availableRuleIds[0]) setConvertRuleId(filterRuleId || String(availableRuleIds[0]));
  }, [availableRuleIds, convertRuleId, filterRuleId]);

  const handleRefresh = async () => {
    setFeedback(null);
    await Promise.all([loadRules(), loadPipelines()]);
  };

  const handleCreateNew = () => {
    setFeedback(null);
    resetForm();
  };

  const handleEdit = async (pipeline: ClientPipeline) => {
    setLoadingDetailId(pipeline.id);
    setFeedback(null);
    try {
      const detail = await api.getClientPipeline(client.id, pipeline.id);
      applyPipelineToForm(detail);
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'No se pudo cargar el pipeline.') });
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleDelete = async (pipeline: ClientPipeline) => {
    if (!confirm(`¿Eliminar el pipeline "${pipeline.pipeline_name}"?`)) return;
    setDeletingId(pipeline.id);
    setFeedback(null);
    try {
      await api.deleteClientPipeline(client.id, pipeline.id);
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
    if (!formRuleId) {
      setFeedback({ tone: 'error', message: 'Seleccioná una regla antes de guardar.' });
      return;
    }
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
      setFeedback({ tone: 'error', message: 'La posición debe ser un entero mayor o igual a 0.' });
      return;
    }

    const sanitized = sanitizePipelineYaml(pipelineYaml);
    if (!sanitized.yaml.trim()) {
      setFeedback({ tone: 'error', message: 'El YAML del pipeline quedó vacío después de normalizarlo.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    setRemovedKeys(sanitized.removedKeys);

    try {
      const payload: ClientPipelineCreatePayload = {
        rule_id: Number(formRuleId),
        pipeline_name: pipelineName.trim(),
        pipeline_yaml: sanitized.yaml.trim(),
        target_backend: targetBackend.trim(),
        target_format: (targetFormat || 'default').trim(),
        position: numericPosition,
      };

      const response = editingId !== null
        ? await api.updateClientPipeline(client.id, editingId, {
            pipeline_name: payload.pipeline_name,
            pipeline_yaml: payload.pipeline_yaml,
            target_backend: payload.target_backend,
            target_format: payload.target_format,
            position: payload.position,
          })
        : await api.createClientPipeline(client.id, payload);

      setFilterRuleId(String(response.rule_id));
      applyPipelineToForm(response);
      await loadPipelines();
      setFeedback({
        tone: response.warning ? 'warning' : 'success',
        message: response.warning || (editingId !== null ? 'Pipeline actualizado.' : 'Pipeline creado.'),
      });
    } catch (error) {
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'No se pudo guardar el pipeline.') });
    } finally {
      setSaving(false);
    }
  };

  const handleConvertRule = async () => {
    if (!convertRuleId) {
      setFeedback({ tone: 'error', message: 'Seleccioná una regla para convertir.' });
      return;
    }

    const ruleId = Number(convertRuleId);
    setConvertingRuleId(ruleId);
    setFeedback(null);
    setBatchResult(null);

    try {
      const response = await api.convertClientRule(client.id, ruleId);
      setConversionResult(response);
      if (response.warning) {
        setFeedback({ tone: 'warning', message: response.warning });
      }
    } catch (error) {
      setConversionResult(null);
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'No se pudo convertir la regla.') });
    } finally {
      setConvertingRuleId(null);
    }
  };

  const handleConvertAll = async () => {
    setBatchRunning(true);
    setFeedback(null);
    setConversionResult(null);

    try {
      const response = await api.convertAllClientRules(client.id);
      setBatchResult(response);
      setFeedback({
        tone: response.error_count > 0 ? 'warning' : 'success',
        message: response.error_count > 0
          ? `Conversión batch completada con ${response.error_count} error(es).`
          : `Conversión batch completada. ${response.success_count} regla(s) convertida(s).`,
      });
    } catch (error) {
      setBatchResult(null);
      setFeedback({ tone: 'error', message: getErrorMessage(error, 'No se pudo ejecutar la conversión batch.') });
    } finally {
      setBatchRunning(false);
    }
  };

  const copyConversionResult = async () => {
    if (!conversionResult?.result) return;
    await navigator.clipboard.writeText(conversionResult.result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const FeedbackIcon = feedback ? feedbackIcons[feedback.tone] : null;

  return (
    <Modal isOpen={true} onClose={onClose} title={`Pipelines por Cliente — ${client.name}`} size="3xl">
      <div className="space-y-6">
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 p-4 text-sm text-slate-200">
          <div className="flex items-start gap-3">
            <Repeat2 size={18} className="mt-0.5 shrink-0 text-brand-green" />
            <div>
              <div className="font-semibold text-white">Pipelines persistidos por cliente/regla</div>
              <p className="mt-1 text-slate-300">
                Estos pipelines son <strong className="text-white">distintos</strong> de los pipelines globales del Sigma Converter.
                Acá queda persistida la asociación <code className="text-brand-green">(cliente, regla) → pipeline YAML</code>.
              </p>
            </div>
          </div>
        </div>

        {feedback && FeedbackIcon && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${feedbackStyles[feedback.tone]}`}>
            <div className="flex items-start gap-2">
              <FeedbackIcon size={16} className="mt-0.5 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <section className="space-y-4">
            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-4 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-400">Filtrar inventario por regla</label>
                  <div className="relative">
                    <select
                      value={filterRuleId}
                      onChange={e => setFilterRuleId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    >
                      <option value="">Todas las reglas</option>
                      {availableRuleIds.map(ruleId => (
                        <option key={ruleId} value={ruleId}>{getRuleLabel(ruleId)}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 rounded-lg border border-a3sec-muted px-3 py-2 text-sm font-medium hover:bg-a3sec-deeper"
                  >
                    <RefreshCw size={15} /> Refrescar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-green/40 px-3 py-2 text-sm font-medium text-brand-green hover:bg-brand-green/10"
                  >
                    <Plus size={15} /> Nuevo pipeline
                  </button>
                </div>
              </div>

              {rulesError && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                  {rulesError}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Inventario</h3>
                  <p className="text-xs text-slate-500 mt-1">Pipelines encontrados: {sortedPipelines.length}</p>
                </div>
              </div>

              {pipelinesError && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {pipelinesError}
                </div>
              )}

              {loadingPipelines ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 size={18} className="mr-2 animate-spin" /> Cargando pipelines...
                </div>
              ) : sortedPipelines.length === 0 ? (
                <div className="rounded-lg border border-dashed border-a3sec-border px-4 py-8 text-center text-sm text-slate-500">
                  No hay pipelines persistidos para este cliente{filterRuleId ? ' con ese filtro' : ''}.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedPipelines.map(pipeline => (
                    <div key={pipeline.id} className="rounded-xl border border-a3sec-border bg-a3sec-deeper/70 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{pipeline.pipeline_name}</h4>
                            <span className="rounded-full border border-a3sec-border px-2 py-0.5 text-[11px] text-slate-400">
                              pos {pipeline.position}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-300">{getRuleLabel(pipeline.rule_id)}</div>
                          <div className="mt-1 text-xs text-slate-500">{getRuleMeta(pipeline.rule_id)}</div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                            <span className="rounded-full border border-a3sec-border px-2 py-1">backend: {pipeline.target_backend}</span>
                            <span className="rounded-full border border-a3sec-border px-2 py-1">format: {pipeline.target_format}</span>
                            <span className="rounded-full border border-a3sec-border px-2 py-1">actualizado: {formatTimestamp(pipeline.updated_at || pipeline.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setConvertRuleId(String(pipeline.rule_id))}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-green/40 px-3 py-1.5 text-xs font-medium text-brand-green hover:bg-brand-green/10"
                          >
                            <Repeat2 size={13} /> Usar en conversión
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(pipeline)}
                            disabled={loadingDetailId === pipeline.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-a3sec-muted px-3 py-1.5 text-xs font-medium hover:bg-a3sec-surface disabled:opacity-60"
                          >
                            {loadingDetailId === pipeline.id ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(pipeline)}
                            disabled={deletingId === pipeline.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                          >
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

            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Conversión por cliente</h3>
                <p className="mt-1 text-xs text-slate-500">Usa los pipelines persistidos del combo (cliente, regla). El backend define el orden por `position`.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr,auto,auto] md:items-end">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Regla a convertir</label>
                  <div className="relative">
                    <select
                      value={convertRuleId}
                      onChange={e => setConvertRuleId(e.target.value)}
                      disabled={loadingRules && !availableRuleIds.length}
                      className="w-full appearance-none rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-60"
                    >
                      <option value="">Seleccioná una regla...</option>
                      {availableRuleIds.map(ruleId => (
                        <option key={ruleId} value={ruleId}>{getRuleLabel(ruleId)}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConvertRule}
                  disabled={convertingRuleId !== null || !convertRuleId}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-green/40 px-4 py-2.5 text-sm font-medium text-brand-green hover:bg-brand-green/10 disabled:opacity-60"
                >
                  {convertingRuleId !== null ? <Loader2 size={15} className="animate-spin" /> : <Repeat2 size={15} />}
                  Convertir regla
                </button>

                <button
                  type="button"
                  onClick={handleConvertAll}
                  disabled={batchRunning}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-a3sec-muted px-4 py-2.5 text-sm font-medium hover:bg-a3sec-deeper disabled:opacity-60"
                >
                  {batchRunning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  Convertir todo
                </button>
              </div>

              {conversionResult && (
                <div className="rounded-xl border border-a3sec-border bg-a3sec-deeper/70 p-4 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Resultado de conversión</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {getRuleLabel(conversionResult.rule_id)} · backend {conversionResult.backend} · format {conversionResult.format} · {conversionResult.pipelines_used} pipeline(s)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyConversionResult}
                      className="inline-flex items-center gap-2 rounded-lg border border-a3sec-muted px-3 py-1.5 text-xs font-medium hover:bg-a3sec-surface"
                    >
                      <Copy size={13} /> {copied ? 'Copiado' : 'Copiar resultado'}
                    </button>
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-lg border border-a3sec-border bg-[#091018] p-3 text-xs text-slate-200 whitespace-pre-wrap break-words">
                    {conversionResult.result}
                  </pre>
                </div>
              )}

              {batchResult && (
                <div className="rounded-xl border border-a3sec-border bg-a3sec-deeper/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-a3sec-border px-2 py-1">total: {batchResult.total_rules}</span>
                    <span className="rounded-full border border-brand-green/30 px-2 py-1 text-brand-green">ok: {batchResult.success_count}</span>
                    <span className="rounded-full border border-red-500/30 px-2 py-1 text-red-300">error: {batchResult.error_count}</span>
                  </div>

                  <div className="space-y-2">
                    {batchResult.results.map(result => (
                      <div key={`${result.rule_id}-${result.title}`} className="rounded-lg border border-a3sec-border bg-a3sec-dark px-3 py-2 text-sm">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div className="font-medium text-white">{result.title || `Regla #${result.rule_id}`}</div>
                          <div className={`text-xs ${result.error ? 'text-red-300' : 'text-brand-green'}`}>
                            {result.error ? 'Error parcial' : 'OK'}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">rule_id: {result.rule_id}</div>
                        {result.error ? (
                          <p className="mt-2 text-xs text-red-300">{result.error}</p>
                        ) : (
                          <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-a3sec-border bg-[#091018] p-2 text-[11px] text-slate-200 whitespace-pre-wrap break-words">
                            {result.result}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    {editingId !== null ? 'Editar pipeline' : 'Nuevo pipeline'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    El YAML se normaliza al schema pySigma antes de persistirse.
                  </p>
                </div>
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="inline-flex items-center gap-2 rounded-lg border border-a3sec-muted px-3 py-1.5 text-xs font-medium hover:bg-a3sec-deeper"
                  >
                    <Plus size={13} /> Nuevo
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Regla</label>
                <div className="relative">
                  <select
                    value={formRuleId}
                    onChange={e => setFormRuleId(e.target.value)}
                    disabled={editingId !== null || (loadingRules && !availableRuleIds.length)}
                    className="w-full appearance-none rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-60"
                  >
                    <option value="">Seleccioná una regla...</option>
                    {availableRuleIds.map(ruleId => (
                      <option key={ruleId} value={ruleId}>{getRuleLabel(ruleId)}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                {formRuleId && <p className="mt-1 text-xs text-slate-500">{getRuleMeta(Number(formRuleId))}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Nombre del pipeline</label>
                <input
                  value={pipelineName}
                  onChange={e => setPipelineName(e.target.value)}
                  placeholder="Splunk Windows Sysmon"
                  className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Backend objetivo</label>
                  <div className="relative">
                    <select
                      value={targetBackend}
                      onChange={e => setTargetBackend(e.target.value)}
                      disabled={loadingTargets}
                      className="w-full appearance-none rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-60"
                    >
                      <option value="">Seleccioná un backend...</option>
                      {targets.map(target => (
                        <option key={target.name} value={target.name}>{target.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Formato</label>
                  {formats.length > 0 ? (
                    <div className="relative">
                      <select
                        value={targetFormat}
                        onChange={e => setTargetFormat(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                      >
                        {formats.map(format => (
                          <option key={format.name} value={format.name}>{format.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  ) : (
                    <input
                      value={targetFormat}
                      onChange={e => setTargetFormat(e.target.value)}
                      placeholder="default"
                      className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Posición</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
                <p className="mt-1 text-xs text-slate-500">Si hay múltiples pipelines para la misma regla, se encadenan por `position`.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Pipeline YAML</label>
                <textarea
                  value={pipelineYaml}
                  onChange={e => setPipelineYaml(e.target.value)}
                  rows={14}
                  placeholder={"name: acme_sysmon\ntransformations:\n  - id: field_name_mapping\n    mapping:\n      CommandLine: command_line"}
                  className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
                {removedKeys.length > 0 && (
                  <div className="mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                    YAML normalizado: se eliminaron claves root no soportadas por pySigma: {removedKeys.join(', ')}.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-a3sec-dark text-white hover:bg-brand-green/90 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {editingId !== null ? 'Guardar cambios' : 'Crear pipeline'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-lg border border-a3sec-muted px-4 py-2 text-sm font-medium hover:bg-a3sec-deeper"
                >
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
