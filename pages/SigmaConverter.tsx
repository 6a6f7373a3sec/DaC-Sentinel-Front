import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../services/api';
import {
  Check, Copy, AlertCircle, Repeat2, ChevronDown,
  FolderOpen, Search, X, ChevronLeft, ChevronRight, Database,
} from 'lucide-react';
import { readConverterHandoff } from '../hooks/useConverterHandoff';
import { Modal } from '../components/Modal';

// ─── Types ────────────────────────────────────────────────────────────────────
type Target   = { name: string; description: string };
type Format   = { name: string; description: string };
type Pipeline = { name: string; targets: string[] };

type ConvertError = { type: string; message: string };

interface RuleSearchItem {
  id: number;
  title: string;
  level: string | null;
  status: string | null;
  logsource_product: string | null;
  logsource_category: string | null;
  tags: string[] | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EXAMPLE_YAML = `title: Suspicious PowerShell Encoded Command
id: a2b4c6d8-0000-0000-0000-000000000001
status: experimental
description: Detects PowerShell execution with base64 encoded commands
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\\\\powershell.exe'
        CommandLine|contains: '-EncodedCommand'
    condition: selection
level: high
tags:
    - attack.execution
    - attack.t1059.001`;

const LEVEL_BADGE: Record<string, string> = {
  critical: 'bg-brand-red/15 text-brand-red border-red-200',
  high:     'bg-orange-50 text-orange-700 border-orange-200',
  medium:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  low:      'bg-brand-green/10 text-brand-green border-brand-green/20',
};

function parseErrorType(detail: string): ConvertError {
  const types = ['YamlParseError', 'UnknownTargetError', 'UnknownPipelineError', 'ConversionError'];
  const found = types.find(t => detail.includes(t));
  return { type: found ?? 'Error', message: detail };
}

// ─── RulePicker (sub-component, same file) ───────────────────────────────────
const RulePicker: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rule: RuleSearchItem) => Promise<void>;
  loadingYaml: boolean;
}> = ({ isOpen, onClose, onSelect, loadingYaml }) => {
  const [q, setQ]               = useState('');
  const [level, setLevel]       = useState('');
  const [product, setProduct]   = useState('');
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 20;

  const [items, setItems]   = useState<RuleSearchItem[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<number | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQ(''); setLevel(''); setProduct(''); setPage(1);
      setItems([]); setTotal(0); setPickerErr(null); setSelectingId(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setPickerErr(null);
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchSigmaRules({
          q: q || undefined,
          page,
          page_size: PAGE_SIZE,
          level: level || undefined,
          product: product || undefined,
        });
        setItems(res.items);
        setTotal(res.total);
      } catch {
        setPickerErr('Error al buscar reglas.');
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen, q, level, product, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSelect = async (rule: RuleSearchItem) => {
    setSelectingId(rule.id);
    await onSelect(rule);
    setSelectingId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar regla del índice" size="lg">
      {/* Search + filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            autoFocus
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por título..."
            className="w-full pl-9 pr-4 py-2 border border-a3sec-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            aria-label="Buscar regla"
          />
          {q && (
            <button
              onClick={() => { setQ(''); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-400"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={level}
            onChange={e => { setLevel(e.target.value); setPage(1); }}
            className="flex-1 p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-deeper"
            aria-label="Filtrar por nivel"
          >
            <option value="">Todos los niveles</option>
            {['critical', 'high', 'medium', 'low'].map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <input
            value={product}
            onChange={e => { setProduct(e.target.value); setPage(1); }}
            placeholder="Producto (windows, linux...)"
            className="flex-1 p-2 border border-a3sec-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            aria-label="Filtrar por producto"
          />
        </div>
      </div>

      {/* Results */}
      <div className="min-h-[320px] max-h-[400px] overflow-y-auto space-y-2 pr-1 border border-a3sec-border rounded-lg bg-a3sec-deeper p-3">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-green" />
          </div>
        ) : pickerErr ? (
          <div className="flex items-center gap-2 text-sm text-red-600 p-4">
            <AlertCircle size={16} /> {pickerErr}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
            <Search size={28} className="opacity-20" />
            No se encontraron reglas.
          </div>
        ) : (
          items.map(rule => {
            const isSelecting = selectingId === rule.id;
            return (
              <button
                key={rule.id}
                type="button"
                disabled={loadingYaml}
                onClick={() => handleSelect(rule)}
                className="w-full text-left p-3 rounded-lg border border-a3sec-border bg-a3sec-surface hover:border-blue-300 hover:shadow-sm transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Seleccionar ${rule.title}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-white group-hover:text-brand-green transition-colors leading-tight flex-1 min-w-0 truncate">
                    {isSelecting ? (
                      <span className="flex items-center gap-1.5 text-brand-green">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 shrink-0" />
                        Cargando YAML...
                      </span>
                    ) : rule.title}
                  </span>
                  {rule.level && (
                    <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${LEVEL_BADGE[rule.level] ?? LEVEL_BADGE.low}`}>
                      {rule.level}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {rule.logsource_product && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {rule.logsource_product}{rule.logsource_category ? ` / ${rule.logsource_category}` : ''}
                    </span>
                  )}
                  {rule.status && (
                    <span className="text-[10px] bg-a3sec-dark text-slate-500 px-1.5 py-0.5 rounded">
                      {rule.status}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
        <span>
          {total > 0
            ? `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total}`
            : '0 resultados'}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="p-1.5 rounded border border-a3sec-border disabled:opacity-30 hover:bg-a3sec-dark"
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-2 py-1 text-xs font-medium">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="p-1.5 rounded border border-a3sec-border disabled:opacity-30 hover:bg-a3sec-dark"
            aria-label="Página siguiente"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const SigmaConverter: React.FC = () => {
  const [targets, setTargets]     = useState<Target[]>([]);
  const [formats, setFormats]     = useState<Format[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const [target, setTarget]             = useState('');
  const [format, setFormat]             = useState('');
  const [selPipelines, setSelPipelines] = useState<string[]>([]);
  const [pipelineYaml, setPipelineYaml] = useState('');
  const [rule, setRule]                 = useState(() => readConverterHandoff() ?? EXAMPLE_YAML);
  const [htmlEscape, setHtmlEscape]     = useState(false);

  // Rule Picker state
  const [selectedRuleId, setSelectedRuleId]     = useState<number | null>(null);
  const [selectedRuleTitle, setSelectedRuleTitle] = useState<string>('');
  const [pickerOpen, setPickerOpen]             = useState(false);
  const [loadingYaml, setLoadingYaml]           = useState(false);
  const [yamlError, setYamlError]               = useState<string | null>(null);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [result, setResult]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<ConvertError | null>(null);
  const [copied, setCopied]   = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Load targets once
  useEffect(() => {
    api.getSigmaTargets()
      .then(t => { setTargets(t); if (t.length) setTarget(t[0].name); })
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, []);

  // Load formats + pipelines when target changes
  useEffect(() => {
    if (!target) return;
    setFormat('');
    setSelPipelines([]);
    Promise.all([
      api.getSigmaFormats(target),
      api.getSigmaPipelines(target),
    ]).then(([f, p]) => {
      setFormats(f);
      setPipelines(p);
      if (f.length) setFormat(f[0].name);
    }).catch(() => {});
  }, [target]);

  const togglePipeline = (name: string) =>
    setSelPipelines(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );

  // Invalidates selectedRuleId when user manually edits YAML
  const handleYamlChange = (value: string) => {
    setRule(value);
    if (selectedRuleId !== null) {
      setSelectedRuleId(null);
      setSelectedRuleTitle('');
    }
  };

  // File upload handler
  const handleLoadFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRule(content);
      setSelectedRuleId(null);
      setSelectedRuleTitle('');
    };
    reader.readAsText(file);
    // Reset to allow re-loading the same file
    e.target.value = '';
  };

  // Rule picker: select handler
  const handleRuleSelected = async (picked: RuleSearchItem) => {
    setLoadingYaml(true);
    setYamlError(null);
    try {
      const { yaml_content, title } = await api.getSigmaRuleYaml(picked.id);
      setRule(yaml_content);
      setSelectedRuleId(picked.id);
      setSelectedRuleTitle(title);
      setPickerOpen(false);
    } catch (err: any) {
      // Close modal so the error is visible in the main UI
      setPickerOpen(false);
      setYamlError(
        err instanceof ApiError && err.status === 422
          ? 'YAML no disponible para esta regla en el filesystem.'
          : err instanceof ApiError && err.status === 404
            ? 'Regla no encontrada.'
            : 'Error al cargar el YAML de la regla.',
      );
    } finally {
      setLoadingYaml(false);
    }
  };

  const handleConvert = useCallback(async () => {
    if (!rule.trim() || !target) return;
    setLoading(true);
    setError(null);
    setResult('');
    try {
      let res: { result: string };
      if (selectedRuleId !== null) {
        // Fast path: server fetches YAML by ID
        res = await api.convertSigmaRuleById({
          rule_id: selectedRuleId,
          target,
          format: format || undefined,
          pipeline: selPipelines.length ? selPipelines : undefined,
          pipeline_yaml: pipelineYaml.trim() || undefined,
          html_escape: htmlEscape,
        });
      } else {
        // Classic path: send raw YAML
        res = await api.convertSigmaRule({
          rule,
          target,
          format: format || undefined,
          pipeline: selPipelines.length ? selPipelines : undefined,
          pipeline_yaml: pipelineYaml.trim() || undefined,
          html_escape: htmlEscape,
        });
      }
      setResult(res.result);
    } catch (e: any) {
      const detail = e?.message ?? 'Conversion failed';
      setError(parseErrorType(detail));
    } finally {
      setLoading(false);
    }
  }, [rule, target, format, selPipelines, pipelineYaml, htmlEscape, selectedRuleId]);

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Repeat2 size={22} className="text-brand-green" /> Sigma Converter
        </h1>
        <p className="text-sm text-slate-500 mt-1">Convierte reglas Sigma a queries para distintos SIEM/plataformas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Config + Input ── */}
        <div className="space-y-4">
          {/* Config card */}
          <div className="bg-a3sec-surface border border-a3sec-border rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Configuración</h2>

            {/* Target */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target (SIEM / Plataforma)</label>
              <div className="relative">
                <select
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  disabled={loadingMeta}
                  className="w-full appearance-none p-2.5 pr-8 border border-a3sec-muted rounded-lg text-sm bg-a3sec-deeper focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50"
                >
                  {loadingMeta
                    ? <option>Cargando...</option>
                    : targets.map(t => <option key={t.name} value={t.name} title={t.description}>{t.name}</option>)
                  }
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Format */}
            {formats.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Formato de salida</label>
                <div className="relative">
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    className="w-full appearance-none p-2.5 pr-8 border border-a3sec-muted rounded-lg text-sm bg-a3sec-deeper focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    {formats.map(f => <option key={f.name} value={f.name} title={f.description}>{f.name}</option>)}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}

            {/* Pipelines */}
            {pipelines.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Pipelines built-in</label>
                <div className="flex flex-wrap gap-2">
                  {pipelines.map(p => {
                    const active = selPipelines.includes(p.name);
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => togglePipeline(p.name)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          active
                            ? 'bg-brand-green text-a3sec-dark text-white border-blue-600'
                            : 'bg-a3sec-surface text-slate-400 border-a3sec-muted hover:border-blue-400'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom pipeline YAML */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Pipeline custom (YAML) <span className="text-slate-400 font-normal">— opcional</span>
              </label>
              <textarea
                rows={3}
                value={pipelineYaml}
                onChange={e => setPipelineYaml(e.target.value)}
                placeholder="Pega tu pipeline YAML aquí (múltiples separados por ---)"
                className="w-full p-2.5 border border-a3sec-muted rounded-lg text-xs font-mono bg-a3sec-deeper focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
              />
            </div>

            {/* HTML Escape toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={htmlEscape}
                onChange={e => setHtmlEscape(e.target.checked)}
                className="rounded"
              />
              HTML Escape en la salida
            </label>
          </div>

          {/* Rule YAML input */}
          <div className="bg-a3sec-surface border border-a3sec-border rounded-xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-2.5 border-b border-a3sec-border bg-a3sec-deeper flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-slate-300 shrink-0">Regla Sigma (YAML)</span>
                {selectedRuleId !== null && (
                  <span className="flex items-center gap-1 text-xs bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-0.5 rounded-full font-medium truncate max-w-[180px]">
                    <Database size={10} className="shrink-0" />
                    <span className="truncate" title={selectedRuleTitle}>{selectedRuleTitle}</span>
                    <button
                      onClick={() => { setSelectedRuleId(null); setSelectedRuleTitle(''); }}
                      className="ml-0.5 text-blue-400 hover:text-brand-green shrink-0"
                      aria-label="Desvincular regla del índice"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Load from file */}
                <button
                  type="button"
                  onClick={handleLoadFile}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-green font-medium transition-colors px-2 py-1 rounded hover:bg-brand-green/10"
                  aria-label="Cargar regla desde archivo .yml/.yaml"
                >
                  <FolderOpen size={13} /> Cargar archivo
                </button>
                {/* Select from index */}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-green font-medium transition-colors px-2 py-1 rounded hover:bg-brand-green/10"
                  aria-label="Seleccionar regla del índice"
                >
                  <Database size={13} /> Del índice
                </button>
                {/* Load example */}
                <button
                  type="button"
                  onClick={() => { setRule(EXAMPLE_YAML); setSelectedRuleId(null); setSelectedRuleTitle(''); }}
                  className="text-xs text-brand-green hover:underline"
                >
                  Ejemplo
                </button>
              </div>
            </div>

            {/* YAML 422 error inline */}
            {yamlError && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100 text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />
                <span>{yamlError}</span>
                <button onClick={() => setYamlError(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={14} /></button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".yml,.yaml"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />

            <textarea
              value={rule}
              onChange={e => handleYamlChange(e.target.value)}
              rows={18}
              spellCheck={false}
              className="w-full p-4 font-mono text-xs text-white bg-a3sec-surface focus:outline-none resize-none"
              placeholder="Pega aquí tu regla Sigma en YAML..."
              aria-label="Regla Sigma en YAML"
            />
          </div>

          <button
            onClick={handleConvert}
            disabled={loading || !target || !rule.trim()}
            className="w-full py-3 bg-brand-green text-a3sec-dark text-white font-semibold rounded-xl hover:bg-brand-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            aria-busy={loading}
          >
            <Repeat2 size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Convirtiendo...' : selectedRuleId !== null ? 'Convertir regla seleccionada' : 'Convertir'}
          </button>
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="flex flex-col">
          <div className="bg-a3sec-surface border border-a3sec-border rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[520px]">
            <div className="px-5 py-3 border-b border-a3sec-border bg-a3sec-deeper flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-slate-300">
                Resultado
                {result && target && (
                  <span className="ml-2 text-xs font-normal text-slate-400">— {target}{format ? ` / ${format}` : ''}</span>
                )}
              </span>
              {result && (
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-green transition-colors"
                  aria-label="Copiar resultado"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </div>

            <div className="flex-1 relative overflow-auto">
              {error ? (
                <div className="p-5">
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">{error.type}</div>
                      <p className="text-sm text-red-800 font-mono break-all">{error.message}</p>
                    </div>
                  </div>
                </div>
              ) : result ? (
                <pre className="p-4 text-xs font-mono text-green-400 bg-slate-900 h-full overflow-auto leading-relaxed whitespace-pre-wrap">
                  <code>{result}</code>
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 p-8">
                  <Repeat2 size={40} className="opacity-30" />
                  <p className="text-sm text-center">Selecciona un target, configura los parámetros y pulsa <strong className="text-slate-400">Convertir</strong>.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rule Picker Modal */}
      <RulePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleRuleSelected}
        loadingYaml={loadingYaml}
      />
    </div>
  );
};