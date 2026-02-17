import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Check, Copy, AlertCircle, Repeat2, ChevronDown } from 'lucide-react';
import { readConverterHandoff } from '../hooks/useConverterHandoff';

type Target   = { name: string; description: string };
type Format   = { name: string; description: string };
type Pipeline = { name: string; targets: string[] };

type ConvertError = { type: string; message: string };

const EXAMPLE_YAML = `title: Suspicious PowerShell Encoded Command
id: a2b4c6d8-0000-0000-0000-000000000001
status: experimental
description: Detects PowerShell execution with base64 encoded commands
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\\powershell.exe'
        CommandLine|contains: '-EncodedCommand'
    condition: selection
level: high
tags:
    - attack.execution
    - attack.t1059.001`;

function parseErrorType(detail: string): ConvertError {
  const types = ['YamlParseError', 'UnknownTargetError', 'UnknownPipelineError', 'ConversionError'];
  const found = types.find(t => detail.includes(t));
  return { type: found ?? 'Error', message: detail };
}

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

  const handleConvert = useCallback(async () => {
    if (!rule.trim() || !target) return;
    setLoading(true);
    setError(null);
    setResult('');
    try {
      const res = await api.convertSigmaRule({
        rule,
        target,
        format: format || undefined,
        pipeline: selPipelines.length ? selPipelines : undefined,
        pipeline_yaml: pipelineYaml.trim() || undefined,
        html_escape: htmlEscape,
      });
      setResult(res.result);
    } catch (e: any) {
      const detail = e?.message ?? 'Conversion failed';
      setError(parseErrorType(detail));
    } finally {
      setLoading(false);
    }
  }, [rule, target, format, selPipelines, pipelineYaml, htmlEscape]);

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
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Repeat2 size={22} className="text-blue-600" /> Sigma Converter
        </h1>
        <p className="text-sm text-slate-500 mt-1">Convierte reglas Sigma a queries para distintos SIEM/plataformas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Config + Input ── */}
        <div className="space-y-4">
          {/* Config card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Configuración</h2>

            {/* Target */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Target (SIEM / Plataforma)</label>
              <div className="relative">
                <select
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  disabled={loadingMeta}
                  className="w-full appearance-none p-2.5 pr-8 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Formato de salida</label>
                <div className="relative">
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    className="w-full appearance-none p-2.5 pr-8 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-xs font-medium text-slate-600 mb-2">Pipelines built-in</label>
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
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
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
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Pipeline custom (YAML) <span className="text-slate-400 font-normal">— opcional</span>
              </label>
              <textarea
                rows={3}
                value={pipelineYaml}
                onChange={e => setPipelineYaml(e.target.value)}
                placeholder="Pega tu pipeline YAML aquí (múltiples separados por ---)"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* HTML Escape toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
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
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Regla Sigma (YAML)</span>
              <button
                type="button"
                onClick={() => setRule(EXAMPLE_YAML)}
                className="text-xs text-blue-600 hover:underline"
              >
                Cargar ejemplo
              </button>
            </div>
            <textarea
              value={rule}
              onChange={e => setRule(e.target.value)}
              rows={18}
              spellCheck={false}
              className="w-full p-4 font-mono text-xs text-slate-800 bg-white focus:outline-none resize-none"
              placeholder="Pega aquí tu regla Sigma en YAML..."
            />
          </div>

          <button
            onClick={handleConvert}
            disabled={loading || !target || !rule.trim()}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Repeat2 size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Convirtiendo...' : 'Convertir'}
          </button>
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="flex flex-col">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[520px]">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-slate-700">
                Resultado
                {result && target && (
                  <span className="ml-2 text-xs font-normal text-slate-400">— {target}{format ? ` / ${format}` : ''}</span>
                )}
              </span>
              {result && (
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
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
    </div>
  );
};