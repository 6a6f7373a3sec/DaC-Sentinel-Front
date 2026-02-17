import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { MitreMatrixResponse, RuleDetail, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, X, ExternalLink, ShieldAlert, FileText, ArrowLeft, Copy, Check, Filter, Repeat2 } from 'lucide-react';
import { writeConverterHandoff } from '../hooks/useConverterHandoff';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PanelData {
  tech: { id: string; name: string; description?: string; url?: string; rule_count: number };
  techDetail: any | null;
  rules: any[];
  loadingRules: boolean;
}

const LEVEL_COLOR: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-100',
  high:     'bg-orange-50 text-orange-700 border-orange-100',
  medium:   'bg-yellow-50 text-yellow-700 border-yellow-100',
  low:      'bg-blue-50 text-blue-700 border-blue-100',
};

// ─── Rule Detail View (sub-panel) ─────────────────────────────────────────────
const RuleDetailView: React.FC<{
  ruleId: string;
  techName: string;
  onBack: () => void;
}> = ({ ruleId, techName, onBack }) => {
  const [rule, setRule] = useState<RuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getRuleDetails(ruleId)
      .then(setRule)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ruleId]);

  const copyYaml = () => {
    if (!rule?.yaml_content) return;
    navigator.clipboard.writeText(rule.yaml_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <button
          onClick={onBack}
          aria-label="Volver a la técnica"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors"
        >
          <ArrowLeft size={14} />
          <span className="truncate max-w-[140px]">{techName}</span>
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-xs text-slate-700 font-semibold truncate flex-1">
          {loading ? '...' : rule?.title}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
        </div>
      ) : !rule ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          No se pudo cargar la regla.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">{rule.title}</h3>
            <div className="flex flex-wrap gap-2">
              {rule.level && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${LEVEL_COLOR[rule.level] ?? LEVEL_COLOR.low}`}>
                  {rule.level}
                </span>
              )}
              {rule.status && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                  {rule.status}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'ID', value: rule.id },
              { label: 'Author', value: rule.author },
              { label: 'Date', value: rule.rule_date },
              { label: 'Log Source', value: [rule.logsource_product, rule.logsource_service].filter(Boolean).join(' / ') },
            ].map(({ label, value }) => value ? (
              <div key={label} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">{label}</div>
                <div className="font-mono text-slate-700 break-all leading-snug">{value}</div>
              </div>
            ) : null)}
          </div>

          {rule.description && (
            <div className="bg-slate-50 rounded-lg border border-slate-100 p-3">
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Description</div>
              <p className="text-xs text-slate-700 leading-relaxed">{rule.description}</p>
            </div>
          )}

          {rule.yaml_content && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                  <FileText size={11} /> YAML
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      writeConverterHandoff(rule.yaml_content);
                      window.location.hash = '#/converter';
                    }}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors"
                    aria-label="Convertir regla"
                  >
                    <Repeat2 size={12} /> Convertir
                  </button>
                  <button
                    onClick={copyYaml}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors"
                    aria-label="Copiar YAML"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <pre className="bg-slate-900 text-green-400 text-[11px] font-mono p-3 rounded-lg overflow-x-auto leading-relaxed max-h-64 custom-scrollbar">
                <code>{rule.yaml_content}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Technique Detail Drawer ──────────────────────────────────────────────────
const TechniqueDrawer: React.FC<{
  data: PanelData | null;
  onClose: () => void;
  activeProduct: string;
}> = ({ data, onClose, activeProduct }) => {
  const [selectedRule, setSelectedRule] = useState<{ id: string } | null>(null);

  useEffect(() => { setSelectedRule(null); }, [data?.tech.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedRule) setSelectedRule(null);
      else onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, selectedRule]);

  const isOpen = !!data;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => { if (selectedRule) setSelectedRule(null); else onClose(); }}
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={data?.tech.name ?? 'Technique detail'}
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {data && (
          <>
            <div className="flex items-start justify-between p-5 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {data.tech.id}
                  </span>
                  {data.tech.rule_count > 0 && (
                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">
                      {data.tech.rule_count} {data.tech.rule_count === 1 ? 'rule' : 'rules'}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{data.tech.name}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              {/* LIST VIEW */}
              <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${selectedRule ? '-translate-x-full' : 'translate-x-0'}`}>
                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                  {data.techDetail?.description && (
                    <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <ShieldAlert size={13} /> Description
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed line-clamp-6">
                        {data.techDetail.description}
                      </p>
                      {(data.techDetail.url || data.tech.url) && (
                        <a
                          href={data.techDetail.url ?? data.tech.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-3 text-xs text-indigo-600 hover:underline font-medium"
                        >
                          Ver en MITRE ATT&CK <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}

                  <div>
                    {(() => {
                      const filtered = activeProduct
                        ? data.rules.filter((r: any) =>
                            (r.logsource_product ?? '').toLowerCase() === activeProduct.toLowerCase()
                          )
                        : data.rules;

                      return (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                              <FileText size={13} /> Reglas asociadas
                            </h3>
                            {activeProduct && !data.loadingRules && (
                              <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                                {filtered.length} / {data.rules.length} para {activeProduct}
                              </span>
                            )}
                          </div>

                          {data.loadingRules ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                            </div>
                          ) : filtered.length === 0 ? (
                            <div className="text-sm text-slate-400 text-center py-8 bg-slate-50 rounded-lg border border-slate-100">
                              {activeProduct
                                ? `Sin reglas para "${activeProduct}" en esta técnica.`
                                : 'Sin reglas de detección para esta técnica.'}
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              {filtered.map((rule: any) => (
                                <li key={rule.id}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRule({ id: rule.id })}
                                    className="w-full text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all group"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
                                        {rule.title}
                                      </span>
                                      {rule.level && (
                                        <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${LEVEL_COLOR[rule.level] ?? LEVEL_COLOR.low}`}>
                                          {rule.level}
                                        </span>
                                      )}
                                    </div>
                                    {rule.logsource_product && (
                                      <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                                        {rule.logsource_product}{rule.logsource_service ? ` / ${rule.logsource_service}` : ''}
                                      </span>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* DETAIL VIEW */}
              <div className={`absolute inset-0 bg-white transition-transform duration-300 ease-in-out ${selectedRule ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedRule && (
                  <RuleDetailView
                    ruleId={selectedRule.id}
                    techName={data.tech.name}
                    onBack={() => setSelectedRule(null)}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const MitreMatrix: React.FC = () => {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState<MitreMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<PanelData | null>(null);
  const [activeProduct, setActiveProduct] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [coveredTechIds, setCoveredTechIds] = useState<Set<string> | null>(null);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [productInput, setProductInput] = useState('');

  useEffect(() => {
    api.getFilters()
      .then(f => setProducts(f.products ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeProduct) {
      setCoveredTechIds(null);
      return;
    }
    let cancelled = false;
    setLoadingFilter(true);
    setCoveredTechIds(null);

    const PAGE_SIZE = 100;
    const techPattern = /T\d{4}(?:\.\d{3})?/i;
    const ids = new Set<string>();

    const extractIds = (rules: any[]) => {
      rules.forEach((r: any) => {
        const rawTags: string[] = r.attack_ids ?? r.tags ?? [];
        rawTags.forEach((tag: string) => {
          const match = tag.match(techPattern);
          if (match) {
            const full = match[0].toUpperCase();
            ids.add(full);
            ids.add(full.split('.')[0]);
          }
        });
      });
    };

    const fetchAllPages = async () => {
      // First page
      const first = await api.searchRules({ product: activeProduct, page: 1, page_size: PAGE_SIZE });
      if (cancelled) return;
      extractIds(first.rules ?? []);

      const totalPages = first.total_pages ?? 1;
      if (totalPages > 1) {
        // Remaining pages in parallel (cap at 20 pages = 2000 rules max)
        const remaining = Array.from(
          { length: Math.min(totalPages - 1, 19) },
          (_, i) => api.searchRules({ product: activeProduct, page: i + 2, page_size: PAGE_SIZE })
        );
        const results = await Promise.allSettled(remaining);
        if (cancelled) return;
        results.forEach(r => {
          if (r.status === 'fulfilled') extractIds(r.value.rules ?? []);
        });
      }

      setCoveredTechIds(new Set(ids));
    };

    fetchAllPages()
      .catch(() => { if (!cancelled) setCoveredTechIds(new Set()); })
      .finally(() => { if (!cancelled) setLoadingFilter(false); });

    return () => { cancelled = true; };
  }, [activeProduct]);

  const getCellStyle = useCallback((techId: string, ruleCount: number): string => {
    if (ruleCount === 0) return 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50';
    if (!activeProduct || coveredTechIds === null) return 'bg-green-100 border-green-300 text-green-900 hover:bg-green-200';
    const covered = coveredTechIds.has(techId.toUpperCase());
    if (covered) return 'bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200';
    return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
  }, [activeProduct, coveredTechIds]);

  const fetchData = async () => {
    try {
      const data = await api.getMitreMatrix();
      setMatrix(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdate = async () => {
    if (!confirm('This will trigger a background job to update MITRE definitions. Continue?')) return;
    setUpdating(true);
    try {
      await api.updateMitre();
      alert('Update job started.');
    } catch (e) {
      alert('Failed to start update');
    } finally {
      setUpdating(false);
    }
  };

  const handleTechClick = useCallback(async (tech: { id: string; name: string; rule_count: number }) => {
    setSelectedId(tech.id);
    setPanelData({ tech, techDetail: null, rules: [], loadingRules: true });

    try {
      const [techDetail, rulesResp] = await Promise.allSettled([
        api.getMitreTechnique(tech.id),
        api.getRulesByAttackTechnique(tech.id, 1, 50),
      ]);

      setPanelData({
        tech,
        techDetail: techDetail.status === 'fulfilled' ? techDetail.value : null,
        rules: rulesResp.status === 'fulfilled' ? (rulesResp.value?.rules ?? []) : [],
        loadingRules: false,
      });
    } catch {
      setPanelData(prev => prev ? { ...prev, loadingRules: false } : null);
    }
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setPanelData(null);
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Matrix...</div>;
  if (!matrix) return <div className="p-8 text-center text-red-500">Failed to load Matrix</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MITRE ATT&amp;CK Matrix</h1>
          <p className="text-sm text-slate-500">Enterprise v-{matrix.version}</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {products.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <div className="relative">
                <input
                  list="mitre-products-list"
                  value={productInput}
                  onChange={e => setProductInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const match = products.find(p => p.toLowerCase() === productInput.toLowerCase());
                      setActiveProduct(match ?? '');
                      if (!match) setProductInput('');
                    }
                    if (e.key === 'Escape') { setActiveProduct(''); setProductInput(''); }
                  }}
                  onBlur={() => {
                    const match = products.find(p => p.toLowerCase() === productInput.toLowerCase());
                    if (match) { setActiveProduct(match); setProductInput(match); }
                    else { setActiveProduct(''); setProductInput(''); }
                  }}
                  placeholder="Filtrar por producto..."
                  className={`pl-3 pr-8 py-1.5 text-xs rounded-lg border transition-colors w-48 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    activeProduct ? 'border-blue-400 bg-blue-50 font-semibold text-blue-700' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                />
                <datalist id="mitre-products-list">
                  {products.map(p => <option key={p} value={p} />)}
                </datalist>
                {activeProduct && !loadingFilter && (
                  <button
                    onClick={() => { setActiveProduct(''); setProductInput(''); }}
                    aria-label="Limpiar filtro"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-700"
                  >
                    <X size={12} />
                  </button>
                )}
                {loadingFilter && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
            {activeProduct ? (
              <>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-400 inline-block" /> Para {activeProduct}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-300 inline-block" /> Otras reglas</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200 inline-block" /> Sin cobertura</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-400 inline-block" /> Cubierta</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200 inline-block" /> No cubierta</span>
              </>
            )}
          </div>

          {user?.roles.includes(UserRole.ADMIN) && (
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex items-center px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm transition-colors"
            >
              <RefreshCw size={14} className={`mr-2 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Updating...' : 'Sync MITRE Data'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto border border-slate-300 rounded-lg bg-slate-50 shadow-inner custom-scrollbar">
        <div className="flex min-w-max">
          {matrix.tactics.map((tactic) => {
            const techniques = matrix.techniques_by_tactic[tactic.id] || [];
            return (
              <div key={tactic.id} className="w-48 flex-shrink-0 border-r border-slate-300 last:border-r-0">
                <div className="bg-slate-200 p-3 text-center border-b border-slate-300 sticky top-0 z-10 font-bold text-slate-800 text-sm h-16 flex items-center justify-center shadow-sm">
                  {tactic.name}
                </div>
                <div className="p-2 space-y-2">
                  {techniques.map((tech) => {
                    const isSelected = selectedId === tech.id;
                    return (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => handleTechClick(tech)}
                        className={`w-full text-left p-2 text-xs border rounded cursor-pointer transition-all focus:outline-none
                          ${getCellStyle(tech.id, tech.rule_count)}
                          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md' : 'hover:shadow-sm'}`}
                        aria-pressed={isSelected}
                        aria-label={`${tech.name} — ${tech.rule_count} rules`}
                      >
                        <div className="font-semibold mb-1 truncate">{tech.name}</div>
                        {tech.rule_count > 0 && (
                          <div className="text-[10px] font-bold text-green-700">{tech.rule_count} Rules</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TechniqueDrawer data={panelData} onClose={handleClose} activeProduct={activeProduct} />
    </div>
  );
};