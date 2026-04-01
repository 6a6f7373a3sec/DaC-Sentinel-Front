import React, { useEffect, useState, useCallback } from 'react';
import { api, resolveRuleStatus } from '../services/api';
import { ClientProfile, ClientCoverage, ClientGaps, ClientCompare, GitRepoSource, RuleOverride } from '../services/api';
import { FilterOptions } from '../types';
import {
  Building2, Plus, Edit2, Trash2, Shield, BarChart3, AlertTriangle,
  GitCompare, Loader2, XCircle, ExternalLink, X, ChevronDown, ChevronRight,
  List, Filter, Search, Save, MessageSquare, ChevronLeft, Undo2
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { COLORS } from '../constants';

// ─── Product Status Types & Constants ───────────────────────
export type ServiceStatus = 'implemented' | 'not_implemented' | 'na' | 'planned' | 'in_progress';

export interface ProductStatusEntry {
  status: ServiceStatus;
  services: Record<string, ServiceStatus>;
}

const SERVICE_STATUS_OPTIONS: { value: ServiceStatus; label: string; dot: string }[] = [
  { value: 'implemented',     label: 'Implementado',     dot: 'bg-green-500' },
  { value: 'not_implemented', label: 'No implementado',  dot: 'bg-red-500' },
  { value: 'na',              label: 'N/A',              dot: 'bg-slate-400' },
  { value: 'planned',         label: 'Planificado',      dot: 'bg-blue-500' },
  { value: 'in_progress',     label: 'En progreso',      dot: 'bg-yellow-500' },
];

const STATUS_LABEL: Record<ServiceStatus, string> = Object.fromEntries(
  SERVICE_STATUS_OPTIONS.map(o => [o.value, o.label])
) as Record<ServiceStatus, string>;

// ─── Helpers ────────────────────────────────────────────────
const priorityColors = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  low: { bg: 'bg-brand-green/10', text: 'text-brand-green', border: 'border-brand-green/20', dot: 'bg-brand-green/100' },
};

const filterSummary = (filters: Record<string, any>): string => {
  const parts: string[] = [];
  if (filters.product_status && Object.keys(filters.product_status).length) {
    const ps = Object.entries(filters.product_status as Record<string, ProductStatusEntry>);
    parts.push(ps.map(([p, e]) => {
      const svcCount = Object.keys(e.services || {}).length;
      return `${p} (${STATUS_LABEL[e.status] || e.status}${svcCount ? ` · ${svcCount} svc` : ''})`;
    }).join(', '));
  } else if (filters.products?.length) {
    parts.push(`Productos: ${filters.products.join(', ')}`);
  }
  if (filters.min_level) parts.push(`Nivel ≥ ${filters.min_level}`);
  if (filters.levels?.length) parts.push(`Niveles: ${filters.levels.join(', ')}`);
  if (filters.statuses?.length) parts.push(`Status: ${filters.statuses.join(', ')}`);
  if (filters.categories?.length) parts.push(`Categorías: ${filters.categories.join(', ')}`);
  if (filters.services?.length) parts.push(`Servicios: ${filters.services.join(', ')}`);
  if (filters.tags_include?.length) parts.push(`Tags: ${filters.tags_include.join(', ')}`);
  if (filters.repo_source_ids?.length) parts.push(`${filters.repo_source_ids.length} fuente(s)`);
  return parts.length ? parts.join(' • ') : 'Sin filtros (cobertura global)';
};

// ─── Main Page ──────────────────────────────────────────────
export const Clients: React.FC = () => {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [formModal, setFormModal] = useState<{ open: boolean; editing: ClientProfile | null }>({ open: false, editing: null });
  const [coverageModal, setCoverageModal] = useState<ClientProfile | null>(null);
  const [rulesModal, setRulesModal] = useState<ClientProfile | null>(null);
  const [gapsModal, setGapsModal] = useState<ClientProfile | null>(null);
  const [compareModal, setCompareModal] = useState<ClientProfile | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const res = await api.listClients();
      setClients(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleDelete = async (c: ClientProfile) => {
    if (!confirm(`¿Eliminar el perfil "${c.name}"?`)) return;
    try {
      await api.deleteClient(c.id);
      await loadClients();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Perfiles de Cliente</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona la cobertura MITRE ATT&CK por cliente</p>
        </div>
        <button
          onClick={() => setFormModal({ open: true, editing: null })}
          className="flex items-center px-4 py-2 bg-brand-green text-a3sec-dark text-white rounded-lg hover:bg-brand-green/90 text-sm font-medium"
        >
          <Plus size={16} className="mr-2" /> Nuevo Perfil
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="bg-a3sec-surface rounded-xl shadow-sm border border-a3sec-border p-12 text-center">
          <Building2 className="mx-auto mb-4 text-slate-300" size={48} />
          <p className="text-slate-500">No hay perfiles de cliente todavía.</p>
          <p className="text-xs text-slate-400 mt-1">Crea un perfil para ver la cobertura MITRE filtrada por tecnología.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map(client => (
            <div key={client.id} className="bg-a3sec-surface rounded-xl shadow-sm border border-a3sec-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{client.name}</h3>
                    {!client.is_active && (
                      <span className="text-xs bg-a3sec-dark text-slate-500 px-2 py-0.5 rounded-full">Inactivo</span>
                    )}
                  </div>
                  {client.description && <p className="text-sm text-slate-500 mb-2">{client.description}</p>}
                  {/* Product status badges */}
                  {client.filters.product_status && Object.keys(client.filters.product_status).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Object.entries(client.filters.product_status as Record<string, ProductStatusEntry>).map(([p, e]) => {
                        const opt = SERVICE_STATUS_OPTIONS.find(o => o.value === e.status);
                        const svcCount = Object.keys(e.services || {}).length;
                        return (
                          <span key={p} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-a3sec-deeper border border-a3sec-border rounded-full">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt?.dot || 'bg-slate-400'}`} />
                            <span className="text-slate-300 font-medium">{p}</span>
                            {svcCount > 0 && <span className="text-slate-500 text-[10px]">{svcCount} svc</span>}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mb-2">{filterSummary(client.filters)}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="font-semibold text-slate-300">{client.rule_count.toLocaleString()} reglas</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    onClick={() => setRulesModal(client)}
                    className="px-3 py-1.5 text-xs font-medium border border-brand-green/40 text-brand-green rounded-lg hover:bg-brand-green/10 flex items-center gap-1"
                    aria-label={`Ver reglas de ${client.name}`}
                  >
                    <List size={14} /> Reglas
                  </button>
                  <button
                    onClick={() => setCoverageModal(client)}
                    className="px-3 py-1.5 text-xs font-medium border border-a3sec-muted rounded-lg hover:bg-a3sec-deeper flex items-center gap-1"
                    aria-label={`Ver cobertura de ${client.name}`}
                  >
                    <BarChart3 size={14} /> Cobertura
                  </button>
                  <button
                    onClick={() => setGapsModal(client)}
                    className="px-3 py-1.5 text-xs font-medium border border-a3sec-muted rounded-lg hover:bg-a3sec-deeper flex items-center gap-1"
                    aria-label={`Ver gaps de ${client.name}`}
                  >
                    <AlertTriangle size={14} /> Gaps
                  </button>
                  <button
                    onClick={() => setCompareModal(client)}
                    className="px-3 py-1.5 text-xs font-medium border border-a3sec-muted rounded-lg hover:bg-a3sec-deeper flex items-center gap-1"
                    aria-label={`Comparar ${client.name}`}
                  >
                    <GitCompare size={14} /> Comparar
                  </button>
                  <button
                    onClick={() => setFormModal({ open: true, editing: client })}
                    className="p-1.5 text-slate-400 hover:text-brand-green border border-a3sec-border rounded-lg hover:bg-brand-green/10"
                    aria-label={`Editar ${client.name}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    className="p-1.5 text-slate-400 hover:text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    aria-label={`Eliminar ${client.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {formModal.open && (
        <ClientFormModal
          editing={formModal.editing}
          onClose={() => setFormModal({ open: false, editing: null })}
          onSaved={() => { setFormModal({ open: false, editing: null }); loadClients(); }}
        />
      )}
      {coverageModal && (
        <CoverageModal client={coverageModal} onClose={() => setCoverageModal(null)} />
      )}
      {rulesModal && (
        <RulesModal client={rulesModal} onClose={() => setRulesModal(null)} />
      )}
      {gapsModal && (
        <GapsModal client={gapsModal} onClose={() => setGapsModal(null)} />
      )}
      {compareModal && (
        <CompareModal client={compareModal} onClose={() => setCompareModal(null)} />
      )}
    </div>
  );
};

// ─── Product Status Editor (self-contained) ─────────────────
const ProductStatusEditor: React.FC<{
  value: Record<string, ProductStatusEntry>;
  onChange: (v: Record<string, ProductStatusEntry>) => void;
  availableProducts: string[];
}> = ({ value, onChange, availableProducts }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [productInput, setProductInput] = useState('');
  const [serviceInputs, setServiceInputs] = useState<Record<string, string>>({});
  const [suggested, setSuggested] = useState<Record<string, string[]>>({});
  const [loadingSvc, setLoadingSvc] = useState<Record<string, boolean>>({});

  const fetchServices = useCallback(async (product: string) => {
    if (suggested[product]) return;
    setLoadingSvc(prev => ({ ...prev, [product]: true }));
    try {
      const res = await api.searchRules({ product, page_size: 200 });
      const svcs = new Set<string>();
      for (const r of res.rules) {
        const svc = (r as any).logsource_service;
        if (svc) svcs.add(svc);
      }
      setSuggested(prev => ({ ...prev, [product]: [...svcs].sort() }));
    } catch { /* silently degrade */ } finally {
      setLoadingSvc(prev => ({ ...prev, [product]: false }));
    }
  }, [suggested]);

  const toggleExpand = (p: string) => {
    const next = expanded === p ? null : p;
    setExpanded(next);
    if (next) fetchServices(next);
  };

  const addProduct = (raw: string) => {
    const key = raw.trim().toLowerCase();
    if (!key || value[key]) return;
    onChange({ ...value, [key]: { status: 'not_implemented', services: {} } });
    setProductInput('');
    setExpanded(key);
    fetchServices(key);
  };

  const removeProduct = (p: string) => {
    const next = { ...value };
    delete next[p];
    onChange(next);
    if (expanded === p) setExpanded(null);
  };

  const updateProductStatus = (p: string, s: ServiceStatus) =>
    onChange({ ...value, [p]: { ...value[p], status: s } });

  const addService = (product: string, raw: string) => {
    const key = raw.trim().toLowerCase();
    if (!key || value[product]?.services[key]) return;
    const entry = value[product];
    onChange({ ...value, [product]: { ...entry, services: { ...entry.services, [key]: 'not_implemented' } } });
  };

  const removeService = (product: string, svc: string) => {
    const entry = value[product];
    const svcs = { ...entry.services };
    delete svcs[svc];
    onChange({ ...value, [product]: { ...entry, services: svcs } });
  };

  const updateServiceStatus = (product: string, svc: string, s: ServiceStatus) => {
    const entry = value[product];
    onChange({ ...value, [product]: { ...entry, services: { ...entry.services, [svc]: s } } });
  };

  return (
    <div className="space-y-2">
      {Object.entries(value).map(([product, entry]) => {
        const isOpen = expanded === product;
        const svcCount = Object.keys((entry as ProductStatusEntry).services).length;
        const statusOpt = SERVICE_STATUS_OPTIONS.find(o => o.value === (entry as ProductStatusEntry).status);
        return (
          <div key={product} className="border border-a3sec-muted rounded-lg overflow-hidden">
            {/* Product header */}
            <div className="flex items-center gap-2 p-2.5 bg-a3sec-deeper">
              <button type="button" onClick={() => toggleExpand(product)}
                className="text-slate-400 hover:text-white transition-colors" aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Colapsar' : 'Expandir'} ${product}`}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusOpt?.dot || 'bg-slate-400'}`} />
              <span className="text-sm font-semibold text-white flex-1">{product}</span>
              {svcCount > 0 && <span className="text-[10px] text-slate-500">{svcCount} svc</span>}
              <select value={(entry as ProductStatusEntry).status}
                onChange={e => updateProductStatus(product, e.target.value as ServiceStatus)}
                className="text-xs py-1 px-2 bg-a3sec-surface border border-a3sec-muted rounded text-slate-300">
                {SERVICE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" onClick={() => removeProduct(product)}
                className="text-slate-500 hover:text-red-500 transition-colors" aria-label={`Quitar ${product}`}>
                <X size={14} />
              </button>
            </div>

            {/* Services panel */}
            {isOpen && (
              <div className="p-3 space-y-2 border-t border-a3sec-border">
                {/* Existing services */}
                {Object.entries((entry as ProductStatusEntry).services).map(([svc, svcStatus]) => {
                  const svcOpt = SERVICE_STATUS_OPTIONS.find(o => o.value === svcStatus);
                  return (
                    <div key={svc} className="flex items-center gap-2 group">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${svcOpt?.dot || 'bg-slate-400'}`} />
                      <span className="text-xs text-slate-300 flex-1 font-mono">{svc}</span>
                      <select value={svcStatus}
                        onChange={e => updateServiceStatus(product, svc, e.target.value as ServiceStatus)}
                        className="text-[11px] py-0.5 px-1.5 bg-a3sec-surface border border-a3sec-muted rounded text-slate-300">
                        {SERVICE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button type="button" onClick={() => removeService(product, svc)}
                        className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Quitar ${svc}`}>
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}

                {/* Loading */}
                {loadingSvc[product] && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                    <Loader2 size={12} className="animate-spin" /> Cargando servicios...
                  </div>
                )}

                {/* Suggested services */}
                {(() => {
                  const pending = (suggested[product] || []).filter(s => !(entry as ProductStatusEntry).services[s]);
                  if (!pending.length) return null;
                  return (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sugeridos desde reglas</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pending.map(s => (
                          <button key={s} type="button" onClick={() => addService(product, s)}
                            className="text-[11px] px-2 py-0.5 bg-a3sec-surface border border-a3sec-muted rounded-full hover:border-brand-green hover:text-brand-green transition-colors text-slate-400">
                            + {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Free-text service input */}
                <div className="flex gap-1.5 pt-1">
                  <input
                    className="flex-1 p-1.5 text-xs border border-a3sec-muted rounded bg-a3sec-surface text-slate-300 placeholder:text-slate-600"
                    value={serviceInputs[product] || ''}
                    onChange={e => setServiceInputs(prev => ({ ...prev, [product]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addService(product, serviceInputs[product] || '');
                        setServiceInputs(prev => ({ ...prev, [product]: '' }));
                      }
                    }}
                    placeholder="Agregar servicio manualmente..."
                  />
                  <button type="button"
                    onClick={() => { addService(product, serviceInputs[product] || ''); setServiceInputs(prev => ({ ...prev, [product]: '' })); }}
                    disabled={!(serviceInputs[product] || '').trim()}
                    className="px-2 text-xs bg-a3sec-surface border border-a3sec-muted rounded hover:bg-a3sec-muted disabled:opacity-40 text-slate-400">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add product */}
      <div className="flex gap-2">
        <input
          className="flex-1 p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-surface text-slate-300 placeholder:text-slate-600"
          value={productInput}
          onChange={e => setProductInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProduct(productInput); } }}
          placeholder="Agregar producto (ej: aws, windows, linux)..."
          list="ps-product-opts"
        />
        <datalist id="ps-product-opts">
          {availableProducts.filter(p => !value[p]).map(p => <option key={p} value={p} />)}
        </datalist>
        <button type="button" onClick={() => addProduct(productInput)} disabled={!productInput.trim()}
          className="px-3 py-2 text-sm bg-a3sec-dark border border-a3sec-muted rounded-lg hover:bg-a3sec-muted disabled:opacity-40 text-slate-300">
          Agregar
        </button>
      </div>
    </div>
  );
};

// ─── Client Form Modal (Create / Edit) ─────────────────────
const ClientFormModal: React.FC<{
  editing: ClientProfile | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ editing, onClose, onSaved }) => {
  const [name, setName] = useState(editing?.name || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filter fields
  const [productStatus, setProductStatus] = useState<Record<string, ProductStatusEntry>>(() => {
    if (editing?.filters?.product_status) return editing.filters.product_status;
    // Migrate legacy products[] → product_status
    const legacy: string[] = editing?.filters?.products || [];
    return Object.fromEntries(legacy.map(p => [p, { status: 'implemented' as ServiceStatus, services: {} }]));
  });
  const [minLevel, setMinLevel] = useState<string>(editing?.filters?.min_level || '');
  const [statuses, setStatuses] = useState<string[]>(editing?.filters?.statuses || []);
  const [repoSourceIds, setRepoSourceIds] = useState<number[]>(editing?.filters?.repo_source_ids || []);

  // Dynamic options
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [repos, setRepos] = useState<GitRepoSource[]>([]);

  useEffect(() => {
    api.getFilters().then(setFilterOptions).catch(() => {});
    api.listRepos().then(r => setRepos(r.items)).catch(() => {});
  }, []);

  const availableProducts = filterOptions?.products || [];
  const statusOptions = ['stable', 'test', 'experimental', 'deprecated'];
  const levelOptions = ['', 'low', 'medium', 'high', 'critical'];

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');

    const filters: Record<string, any> = { v: 2 };
    const productKeys = Object.keys(productStatus);
    if (productKeys.length) {
      filters.products = productKeys;              // backward-compat para backend actual
      filters.product_status = productStatus;       // estructura granular
    }
    if (minLevel) filters.min_level = minLevel;
    if (statuses.length) filters.statuses = statuses;
    if (repoSourceIds.length) filters.repo_source_ids = repoSourceIds;

    try {
      if (editing) {
        await api.updateClient(editing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          filters,
        });
      } else {
        await api.createClient({
          name: name.trim(),
          description: description.trim() || undefined,
          filters,
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={editing ? `Editar — ${editing.name}` : 'Nuevo Perfil de Cliente'}
      size="xl"
    >
      <div className="space-y-5">
        {/* Name & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del cliente</label>
            <input
              className="w-full p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-surface"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Acme Corp" required autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Descripción (opcional)</label>
            <input
              className="w-full p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-surface"
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Entorno enterprise con Windows + Azure"
            />
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-a3sec-border pt-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Filtros de Reglas</h4>

          {/* Products & Services — Granular Status */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Productos y Servicios</label>
            <ProductStatusEditor
              value={productStatus}
              onChange={setProductStatus}
              availableProducts={availableProducts}
            />
          </div>

          {/* Min Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nivel mínimo</label>
              <select
                className="w-full p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-surface"
                value={minLevel} onChange={e => setMinLevel(e.target.value)}
              >
                <option value="">Sin filtro de nivel</option>
                {levelOptions.filter(Boolean).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Statuses */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Estados aceptados</label>
              <div className="flex flex-wrap gap-3 mt-1">
                {statusOptions.map(s => (
                  <label key={s} className="flex items-center gap-1.5 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={statuses.includes(s)}
                      onChange={e => {
                        setStatuses(e.target.checked ? [...statuses, s] : statuses.filter(x => x !== s));
                      }}
                      className="rounded border-a3sec-muted"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Repo Sources */}
          {repos.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Fuentes Git (repos)</label>
              <div className="space-y-1">
                {repos.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-sm text-slate-300 p-1">
                    <input
                      type="checkbox"
                      checked={repoSourceIds.includes(r.id)}
                      onChange={e => {
                        setRepoSourceIds(
                          e.target.checked ? [...repoSourceIds, r.id] : repoSourceIds.filter(x => x !== r.id)
                        );
                      }}
                      className="rounded border-a3sec-muted"
                    />
                    {r.name} <span className="text-xs text-slate-400">({r.rule_count.toLocaleString()} reglas)</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
            <XCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-a3sec-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 border border-a3sec-muted rounded-lg hover:bg-a3sec-deeper">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-brand-green text-a3sec-dark rounded-lg hover:bg-a3sec-surface disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Coverage Modal (enhanced with product dashboard) ───────
const CoverageModal: React.FC<{ client: ClientProfile; onClose: () => void }> = ({ client, onClose }) => {
  const [data, setData] = useState<ClientCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'mitre' | 'products'>('mitre');

  // Load ALL client rules to classify by status
  const [allRules, setAllRules] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  const productStatus: Record<string, ProductStatusEntry> = client.filters?.product_status || {};
  const overrides: Record<string, RuleOverride> = client.filters?.rule_overrides || {};

  useEffect(() => {
    api.getClientCoverage(client.id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [client.id]);

  // Lazy-load all rules when "products" tab is selected
  useEffect(() => {
    if (tab !== 'products' || allRules.length > 0 || loadingRules) return;
    const fetchAll = async () => {
      setLoadingRules(true);
      try {
        let page = 1;
        let items: any[] = [];
        let hasMore = true;
        while (hasMore) {
          const res = await api.getClientRules(client.id, page, 100);
          items = items.concat(res.items);
          hasMore = items.length < res.total;
          page++;
          if (page > 50) break; // safety
        }
        setAllRules(items);
      } catch { /* degrade gracefully */ } finally {
        setLoadingRules(false);
      }
    };
    fetchAll();
  }, [tab, client.id, allRules.length, loadingRules]);

  // Classify rules
  const classifiedRules = allRules.map(r => ({
    ...r,
    resolved: resolveRuleStatus(
      { logsource_product: r.product, logsource_service: r.service || r.logsource_service },
      productStatus,
      overrides,
      r.id,
    ),
  }));

  // Product-level stats
  const productStats = Object.entries(productStatus).map(([product, entry]) => {
    const rules = classifiedRules.filter(r => (r.product || '').toLowerCase() === product);
    const byStatus = rules.reduce((acc, r) => {
      acc[r.resolved.status] = (acc[r.resolved.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const svcStats = Object.entries(entry.services).map(([svc, svcStatus]) => {
      const svcRules = rules.filter(r => (r.service || r.logsource_service || '').toLowerCase() === svc);
      return { name: svc, status: svcStatus, ruleCount: svcRules.length };
    });
    return { product, entry, totalRules: rules.length, byStatus, svcStats };
  });

  const STATUS_COLORS: Record<ServiceStatus, string> = {
    implemented: '#22c55e',
    not_implemented: '#ef4444',
    na: '#94a3b8',
    planned: '#3b82f6',
    in_progress: '#eab308',
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Cobertura — ${client.name}`} size="2xl">
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      ) : data ? (
        <div className="space-y-5">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-a3sec-deeper rounded-lg w-fit">
            {([['mitre', 'MITRE ATT&CK'], ['products', 'Por Producto']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  tab === key
                    ? 'bg-a3sec-surface text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'mitre' ? (
            <>
              {/* Original MITRE stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-brand-green/10 border border-brand-green/20 rounded-lg text-center">
                  <div className="text-2xl font-bold text-brand-green">{data.coverage_percentage.toFixed(1)}%</div>
                  <div className="text-xs text-brand-green font-medium">Cobertura</div>
                </div>
                <div className="p-3 bg-green-900/20 border border-green-800/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{data.covered_techniques}</div>
                  <div className="text-xs text-green-500 font-medium">Cubiertas</div>
                </div>
                <div className="p-3 bg-a3sec-deeper border border-a3sec-border rounded-lg text-center">
                  <div className="text-2xl font-bold text-slate-300">{data.total_techniques}</div>
                  <div className="text-xs text-slate-500 font-medium">Total</div>
                </div>
                <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-400">{data.uncovered_count}</div>
                  <div className="text-xs text-red-500 font-medium">Sin cubrir</div>
                </div>
              </div>

              {/* By Tactic */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Cobertura por Táctica</h4>
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {Object.entries(data.by_tactic)
                    .sort((a: [string, any], b: [string, any]) => (b[1].percentage || 0) - (a[1].percentage || 0))
                    .map(([tactic, info]: [string, any]) => (
                    <div key={tactic} className="flex items-center gap-3">
                      <div className="w-40 text-xs text-slate-400 truncate font-medium" title={tactic}>
                        {tactic.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                      <div className="flex-1 bg-a3sec-dark rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(info.percentage || 0, 1)}%`,
                            backgroundColor: (info.percentage || 0) > 50 ? COLORS.success : (info.percentage || 0) > 25 ? COLORS.warning : COLORS.danger,
                          }}
                        />
                      </div>
                      <div className="w-20 text-right text-xs font-semibold text-slate-400">
                        {(info.percentage || 0).toFixed(0)}% <span className="font-normal">({info.covered}/{info.total})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* ─── Products Tab ─── */
            <div className="space-y-4">
              {loadingRules ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-slate-400 mr-2" size={20} />
                  <span className="text-sm text-slate-500">Clasificando reglas...</span>
                </div>
              ) : productStats.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-8">
                  No hay productos configurados con status granular.
                  <br />
                  <span className="text-xs text-slate-600">Edita el perfil para agregar productos con servicios.</span>
                </div>
              ) : (
                <>
                  {/* Global status legend */}
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                    {SERVICE_STATUS_OPTIONS.map(o => (
                      <span key={o.value} className="inline-flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${o.dot}`} /> {o.label}
                      </span>
                    ))}
                  </div>

                  {productStats.map(ps => {
                    const statusOpt = SERVICE_STATUS_OPTIONS.find(o => o.value === ps.entry.status);
                    return (
                      <div key={ps.product} className="border border-a3sec-border rounded-lg overflow-hidden">
                        {/* Product header */}
                        <div className="flex items-center gap-3 p-3 bg-a3sec-deeper">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusOpt?.dot || 'bg-slate-400'}`} />
                          <span className="text-sm font-bold text-white flex-1">{ps.product}</span>
                          <span className="text-xs text-slate-500">{statusOpt?.label}</span>
                          <span className="text-xs font-semibold text-slate-300">{ps.totalRules} reglas</span>
                        </div>

                        {/* Stacked bar */}
                        {ps.totalRules > 0 && (
                          <div className="px-3 pt-2 pb-1">
                            <div className="flex rounded-full h-4 overflow-hidden bg-a3sec-dark">
                              {SERVICE_STATUS_OPTIONS.map(o => {
                                const count = ps.byStatus[o.value] || 0;
                                const pct = (count / ps.totalRules) * 100;
                                if (pct === 0) return null;
                                return (
                                  <div
                                    key={o.value}
                                    className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                                    style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[o.value] }}
                                    title={`${o.label}: ${count} (${pct.toFixed(0)}%)`}
                                  />
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 mb-1">
                              {SERVICE_STATUS_OPTIONS.map(o => {
                                const count = ps.byStatus[o.value] || 0;
                                if (count === 0) return null;
                                return (
                                  <span key={o.value} className="text-[10px] text-slate-500">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5" style={{ backgroundColor: STATUS_COLORS[o.value] }} />
                                    {count} {o.label.toLowerCase()}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Services breakdown */}
                        {ps.svcStats.length > 0 && (
                          <div className="px-3 pb-3 space-y-1">
                            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Servicios</span>
                            {ps.svcStats.map(svc => {
                              const svcOpt = SERVICE_STATUS_OPTIONS.find(o => o.value === svc.status);
                              return (
                                <div key={svc.name} className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${svcOpt?.dot || 'bg-slate-400'}`} />
                                  <span className="text-xs text-slate-300 font-mono flex-1">{svc.name}</span>
                                  <span className="text-[10px] text-slate-500">{svcOpt?.label}</span>
                                  <span className="text-[10px] text-slate-600">{svc.ruleCount} reglas</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};

// ─── Rules Modal (with granular status + override) ──────────
const RulesModal: React.FC<{ client: ClientProfile; onClose: () => void }> = ({ client, onClose }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Overrides — stored in filters.rule_overrides
  const [overrides, setOverrides] = useState<Record<string, RuleOverride>>(
    () => client.filters?.rule_overrides || {}
  );
  const [pendingOverrides, setPendingOverrides] = useState<Record<string, RuleOverride>>({});
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [overrideNote, setOverrideNote] = useState<Record<string, string>>({});

  const productStatus: Record<string, ProductStatusEntry> = client.filters?.product_status || {};
  const allOverrides = { ...overrides, ...pendingOverrides };

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getClientRules(client.id, page, pageSize);
      setRules(res.items);
      setTotal(res.total);
      setTotalPages(Math.ceil(res.total / pageSize));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [client.id, page]);

  useEffect(() => { loadRules(); }, [loadRules]);

  // Classify each rule
  const classifiedRules = rules.map(r => {
    const resolved = resolveRuleStatus(
      { logsource_product: r.product, logsource_service: r.service || r.logsource_service },
      productStatus,
      allOverrides,
      r.id,
    );
    return { ...r, resolved };
  });

  // Client-side filtering
  const filteredRules = classifiedRules.filter(r => {
    if (statusFilter !== 'all' && r.resolved.status !== statusFilter) return false;
    if (productFilter !== 'all' && (r.product || '').toLowerCase() !== productFilter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!(r.title || '').toLowerCase().includes(q) && !(r.attack_ids || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const setOverride = (ruleId: string | number, status: ServiceStatus) => {
    const key = String(ruleId);
    setPendingOverrides(prev => ({
      ...prev,
      [key]: { status, note: overrideNote[key] || '', updated_at: new Date().toISOString() },
    }));
  };

  const removeOverride = (ruleId: string | number) => {
    const key = String(ruleId);
    setPendingOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    // Also remove from saved overrides
    setOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const saveOverrides = async () => {
    setSavingOverrides(true);
    try {
      const merged = { ...overrides, ...pendingOverrides };
      await api.updateClient(client.id, {
        filters: { ...client.filters, rule_overrides: merged },
      });
      setOverrides(merged);
      setPendingOverrides({});
    } catch (e: any) {
      alert(e.message || 'Error guardando overrides');
    } finally {
      setSavingOverrides(false);
    }
  };

  const hasPending = Object.keys(pendingOverrides).length > 0;
  const productKeys = Object.keys(productStatus);

  // Stats
  const stats = classifiedRules.reduce((acc, r) => {
    acc[r.resolved.status] = (acc[r.resolved.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Reglas — ${client.name}`} size="2xl">
      <div className="space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-2">
          {SERVICE_STATUS_OPTIONS.map(opt => {
            const count = stats[opt.value] || 0;
            const isActive = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(isActive ? 'all' : opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? 'ring-2 ring-offset-1 ring-offset-a3sec-dark ring-brand-green border-brand-green text-white'
                    : 'border-a3sec-muted text-slate-400 hover:text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                {opt.label} <span className="text-slate-500">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Filters row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-a3sec-muted rounded-lg bg-a3sec-surface text-slate-300 placeholder:text-slate-600"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar por título o ATT&CK ID..."
            />
          </div>
          {productKeys.length > 1 && (
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="text-xs py-1.5 px-2 bg-a3sec-surface border border-a3sec-muted rounded-lg text-slate-300"
            >
              <option value="all">Todos los productos</option>
              {productKeys.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>

        {/* Rules list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        ) : (
          <>
            <div className="max-h-[50vh] overflow-y-auto space-y-1.5 pr-1">
              {filteredRules.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-8">
                  No hay reglas que coincidan con los filtros
                </div>
              ) : (
                filteredRules.map(r => {
                  const opt = SERVICE_STATUS_OPTIONS.find(o => o.value === r.resolved.status);
                  const isOverridden = r.resolved.source === 'override';
                  const hasPendingOv = pendingOverrides[String(r.id)] !== undefined;
                  return (
                    <div
                      key={r.id}
                      className={`p-3 rounded-lg border transition-all ${
                        hasPendingOv
                          ? 'border-brand-green/50 bg-brand-green/5'
                          : isOverridden
                          ? 'border-blue-500/30 bg-blue-500/5'
                          : 'border-a3sec-border bg-a3sec-deeper'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status dot */}
                        <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${opt?.dot || 'bg-slate-400'}`} />

                        {/* Rule info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white truncate">{r.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-a3sec-dark rounded text-slate-500 font-mono shrink-0">
                              {r.product}
                              {(r.service || r.logsource_service) ? ` / ${r.service || r.logsource_service}` : ''}
                            </span>
                            {r.level && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                r.level === 'critical' ? 'bg-red-900/50 text-red-300' :
                                r.level === 'high' ? 'bg-red-800/30 text-red-400' :
                                r.level === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                                'bg-slate-700/50 text-slate-400'
                              }`}>
                                {r.level}
                              </span>
                            )}
                          </div>
                          {r.attack_ids && (
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {r.attack_ids}
                            </div>
                          )}
                          {/* Source indicator */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-600">
                              {r.resolved.source === 'override' ? '✎ Override manual' :
                               r.resolved.source === 'service' ? `↳ Servicio: ${r.service || r.logsource_service}` :
                               r.resolved.source === 'product' ? `↳ Producto: ${r.product}` :
                               '↳ Default'}
                            </span>
                            {isOverridden && allOverrides[String(r.id)]?.note && (
                              <span className="text-[10px] text-slate-500 italic flex items-center gap-0.5">
                                <MessageSquare size={9} /> {allOverrides[String(r.id)].note}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Override controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={allOverrides[String(r.id)]?.status || r.resolved.status}
                            onChange={e => setOverride(r.id, e.target.value as ServiceStatus)}
                            className={`text-[11px] py-1 px-1.5 rounded border text-slate-300 ${
                              hasPendingOv
                                ? 'bg-brand-green/10 border-brand-green/40'
                                : 'bg-a3sec-surface border-a3sec-muted'
                            }`}
                          >
                            {SERVICE_STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {(isOverridden || hasPendingOv) && (
                            <button
                              onClick={() => removeOverride(r.id)}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                              title="Quitar override (volver a status automático)"
                              aria-label="Quitar override"
                            >
                              <Undo2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Note input (shown when pending) */}
                      {hasPendingOv && (
                        <div className="mt-2 ml-5">
                          <input
                            className="w-full p-1.5 text-[11px] border border-a3sec-muted rounded bg-a3sec-surface text-slate-300 placeholder:text-slate-600"
                            value={overrideNote[String(r.id)] || ''}
                            onChange={e => setOverrideNote(prev => ({ ...prev, [String(r.id)]: e.target.value }))}
                            placeholder="Nota (opcional): ej. 'Implementado en Sentinel'"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2 border-t border-a3sec-border">
              <span className="text-xs text-slate-500">
                {filteredRules.length} de {total} reglas
                {statusFilter !== 'all' && ` (filtro: ${STATUS_LABEL[statusFilter]})`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-slate-400 px-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Save overrides bar */}
        {hasPending && (
          <div className="flex items-center justify-between p-3 bg-brand-green/10 border border-brand-green/30 rounded-lg">
            <span className="text-xs text-brand-green font-medium">
              {Object.keys(pendingOverrides).length} override(s) pendiente(s)
            </span>
            <button
              onClick={saveOverrides}
              disabled={savingOverrides}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-green text-a3sec-dark rounded-lg hover:bg-brand-green/90 disabled:opacity-50"
            >
              {savingOverrides ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {savingOverrides ? 'Guardando...' : 'Guardar overrides'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── Gaps Modal (with N/A awareness) ────────────────────────
const GapsModal: React.FC<{ client: ClientProfile; onClose: () => void }> = ({ client, onClose }) => {
  const [data, setData] = useState<ClientGaps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [hideNA, setHideNA] = useState(false);

  const productStatus: Record<string, ProductStatusEntry> = client.filters?.product_status || {};
  const hasGranular = Object.keys(productStatus).length > 0;

  // Collect all services marked N/A
  const naServices = new Set<string>();
  const naProducts = new Set<string>();
  for (const [product, entry] of Object.entries(productStatus)) {
    if (entry.status === 'na') naProducts.add(product);
    for (const [svc, svcStatus] of Object.entries(entry.services)) {
      if (svcStatus === 'na') naServices.add(`${product}:${svc}`);
    }
  }

  useEffect(() => {
    api.getClientGaps(client.id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [client.id]);

  const allGaps = data ? Object.values(data.gaps_by_tactic).flat() : [];
  const uniqueGaps = data ? [...new Map(allGaps.map((g: any) => [g.id, g])).values()] : [];
  const filteredGaps = uniqueGaps.filter((g: any) => {
    if (priorityFilter !== 'all' && g.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <Modal isOpen={true} onClose={onClose} title={`Gaps MITRE — ${client.name}`} size="2xl">
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      ) : data ? (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-slate-300">{data.total_gaps} gaps totales:</span>
            {(['high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(priorityFilter === p ? 'all' : p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  priorityFilter === p
                    ? `${priorityColors[p].bg} ${priorityColors[p].text} ${priorityColors[p].border} ring-2 ring-offset-1 ring-offset-a3sec-dark ring-slate-300`
                    : `${priorityColors[p].bg} ${priorityColors[p].text} ${priorityColors[p].border} opacity-80 hover:opacity-100`
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${priorityColors[p].dot}`} />
                {data.priority_summary[p]} {p}
              </button>
            ))}
            {priorityFilter !== 'all' && (
              <button onClick={() => setPriorityFilter('all')} className="text-xs text-slate-500 underline hover:text-slate-300">
                Mostrar todos
              </button>
            )}
          </div>

          {/* N/A awareness info */}
          {hasGranular && (naProducts.size > 0 || naServices.size > 0) && (
            <div className="flex items-center justify-between p-2.5 bg-a3sec-deeper border border-a3sec-border rounded-lg">
              <span className="text-xs text-slate-500">
                {naProducts.size > 0 && `${naProducts.size} producto(s) N/A`}
                {naProducts.size > 0 && naServices.size > 0 && ' · '}
                {naServices.size > 0 && `${naServices.size} servicio(s) N/A`}
                {' — estos gaps podrían no aplicar a tu entorno'}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={hideNA}
                  onChange={e => setHideNA(e.target.checked)}
                  className="rounded border-a3sec-muted"
                />
                Atenuar N/A
              </label>
            </div>
          )}

          {/* Gap list */}
          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
            {filteredGaps
              .sort((a: any, b: any) => {
                const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
                return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
              })
              .map((gap: any) => {
                const pc = priorityColors[gap.priority as keyof typeof priorityColors] || priorityColors.low;
                // Determine if this gap is "N/A-only" — heuristic: if all client products are N/A
                const isNARelated = hasGranular && [...naProducts].length === Object.keys(productStatus).length;
                const dimmed = hideNA && isNARelated;
                return (
                  <div
                    key={gap.id}
                    className={`p-3 rounded-lg border transition-opacity ${pc.border} ${pc.bg} ${dimmed ? 'opacity-30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${pc.text}`}>{gap.id}</span>
                          <span className="text-sm font-medium text-white">{gap.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          {gap.total_subtechniques > 0 && (
                            <span>{gap.covered_subtechniques}/{gap.total_subtechniques} sub-técnicas cubiertas</span>
                          )}
                          <span>Tácticas: {gap.tactics.join(', ')}</span>
                        </div>
                      </div>
                      <a
                        href={gap.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-brand-green shrink-0"
                        aria-label={`Ver ${gap.id} en MITRE`}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            {filteredGaps.length === 0 && (
              <div className="text-center text-sm text-slate-500 py-6">
                No hay gaps con prioridad "{priorityFilter}"
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

// ─── Compare Modal ──────────────────────────────────────────
const CompareModal: React.FC<{ client: ClientProfile; onClose: () => void }> = ({ client, onClose }) => {
  const [data, setData] = useState<ClientCompare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getClientCompare(client.id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [client.id]);

  return (
    <Modal isOpen={true} onClose={onClose} title={`${client.name} vs Global`} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          {/* Comparison bars */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-brand-green/10 border border-blue-100 rounded-lg">
              <div className="text-3xl font-bold text-brand-green">{data.client_coverage.toFixed(1)}%</div>
              <div className="text-xs text-brand-green font-medium mt-1">Cliente</div>
            </div>
            <div className="p-4 bg-a3sec-deeper border border-a3sec-border rounded-lg">
              <div className="text-3xl font-bold text-slate-300">{data.global_coverage.toFixed(1)}%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Global</div>
            </div>
            <div className={`p-4 rounded-lg border ${
              data.delta >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
            }`}>
              <div className={`text-3xl font-bold ${data.delta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%
              </div>
              <div className={`text-xs font-medium mt-1 ${data.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>Delta</div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-a3sec-deeper rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Técnicas compartidas</span>
              <span className="font-semibold text-white">{data.shared_techniques}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Disponibles pero fuera de filtros</span>
              <span className="font-semibold text-white">{data.only_in_global_count}</span>
            </div>
          </div>

          {/* Recommendation */}
          {data.recommendation && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-2">
              <Shield className="text-amber-600 mt-0.5 shrink-0" size={18} />
              <p className="text-sm text-amber-800">{data.recommendation}</p>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};