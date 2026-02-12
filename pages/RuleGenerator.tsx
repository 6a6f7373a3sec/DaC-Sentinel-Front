import React, { useMemo, useState } from 'react';
import { api } from '../services/api';
import { GenerateRuleResponse, UserRole } from '../types';
import { Send, FileCheck, GitBranch, RefreshCw, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RuleGenerator: React.FC = () => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateRuleResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [prUrl, setPrUrl] = useState<string | null>(null);

  // Save rule as local (rules/local/*) so it gets indexed without losing SigmaHQ
  const canSaveLocal = !!user?.roles?.includes(UserRole.ADMIN);
  const [localPath, setLocalPath] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);
  const [saveLocalStatus, setSaveLocalStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveLocalMsg, setSaveLocalMsg] = useState<string | null>(null);

  const defaultLocalPath = useMemo(() => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return `ai/generated_${ts}.yml`;
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setProposalStatus('idle');
    setSaveLocalStatus('idle');
    setSaveLocalMsg(null);
    try {
      const data = await api.generateRule(prompt);
      setResult(data);
      setLocalPath((p) => (p?.trim() ? p : defaultLocalPath));
    } catch (error) {
      console.error(error);
      alert('Failed to generate rule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!result) return;
    setProposalStatus('loading');
    try {
      const resp = await api.createProposal(result.yaml_code);
      setPrUrl(resp.pr_url);
      setProposalStatus('success');
    } catch (error) {
      console.error(error);
      setProposalStatus('error');
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.yaml_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveLocal = async () => {
    if (!result) return;
    if (!canSaveLocal) {
      alert('Solo un usuario Admin puede guardar reglas locales.');
      return;
    }
    if (!localPath.trim()) return;

    setSavingLocal(true);
    setSaveLocalStatus('idle');
    setSaveLocalMsg(null);
    try {
      const resp = await api.createLocalRule(localPath.trim(), result.yaml_code, overwrite, true);
      setSaveLocalStatus('success');
      setSaveLocalMsg(resp?.message || 'Regla guardada. Se indexará automáticamente.');
    } catch (e: any) {
      setSaveLocalStatus('error');
      setSaveLocalMsg(e?.message || 'No se pudo guardar la regla.');
    } finally {
      setSavingLocal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Generardor de reglas con IA <span className="text-red-600">(Experimental)</span></h1>
        <p className="text-slate-500">Describe la lógica de detección que necesitas en lenguaje natural y la IA generará una regla Sigma para ti.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Requerimientos de detección</label>
        <textarea
          className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="e.g., Detectar ejecución sospechosa de PowerShell con comandos codificados en base64 relacionados con el reconocimiento de red..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Send className="mr-2" size={18} />}
            Generar regla
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="border-b border-slate-200 p-4 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-semibold text-slate-700">Generated YAML</span>
              <span className={`text-xs px-2 py-1 rounded-full border ${
                result.confidence > 0.8 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
              }`}>
                Confidence: {Math.round(result.confidence * 100)}%
              </span>
            </div>
            <button onClick={copyToClipboard} className="text-slate-500 hover:text-blue-600 transition-colors">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          
          <div className="relative">
            <pre className="p-6 bg-slate-900 text-green-400 overflow-x-auto font-mono text-sm">
              <code>{result.yaml_code}</code>
            </pre>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white space-y-3">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Guardar en reglas locales (ruta relativa a <span className="font-mono">rules/local/</span>)
                </label>
                <input
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="ai/mi_regla.yml"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50"
                  disabled={!canSaveLocal}
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={overwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                      disabled={!canSaveLocal}
                    />
                    Sobrescribir si existe
                  </label>
                  {!canSaveLocal && (
                    <span className="text-xs text-slate-400">(Requiere rol Admin)</span>
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveLocal}
                disabled={!canSaveLocal || savingLocal || !localPath.trim()}
                className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canSaveLocal ? 'Requiere rol Admin' : 'Guardar e indexar'}
              >
                {savingLocal ? <RefreshCw className="animate-spin mr-2" size={18} /> : <FileCheck className="mr-2" size={18} />}
                Guardar
              </button>
            </div>

            {saveLocalMsg && (
              <div className={`text-sm rounded-lg px-3 py-2 border ${
                saveLocalStatus === 'success'
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : saveLocalStatus === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {saveLocalMsg}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <div className="text-sm text-slate-500">
              Tokens used: {result.tokens_used}
            </div>
            {proposalStatus === 'success' ? (
              <a 
                href={prUrl || '#'} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center text-green-600 font-medium hover:underline"
              >
                <GitBranch size={18} className="mr-2" />
                Pull Request Created
              </a>
            ) : (
              <button
                onClick={handleCreateProposal}
                disabled={proposalStatus === 'loading'}
                className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {proposalStatus === 'loading' ? (
                  <RefreshCw className="animate-spin mr-2" size={18} />
                ) : (
                  <FileCheck className="mr-2" size={18} />
                )}
                Create Proposal (PR)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};