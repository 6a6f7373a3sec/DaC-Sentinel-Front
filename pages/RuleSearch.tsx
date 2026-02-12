import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { RuleListItem, SearchResponse, RuleDetail, FilterOptions } from '../types';
import { Search, Filter, ChevronLeft, ChevronRight, X, Download, FileText, Activity } from 'lucide-react';
import { Modal } from '../components/Modal';

export const RuleSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Dynamic Filters
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState({
    level: '',
    status: '',
    product: '',
    author: '',
  });

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(() => sessionStorage.getItem('dac_export_job_id'));
  const [exportStatus, setExportStatus] = useState<any>(null);
  const [exportStatusOpen, setExportStatusOpen] = useState(false);

  // Detail Modal State
  const [selectedRule, setSelectedRule] = useState<RuleDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    // Load filter options on mount
    api.getFilters().then(setFilterOptions).catch(console.error);
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.searchRules({
        q: query,
        page,
        page_size: 20,
        ...filters
      });
      setResults(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [query, page, filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search();
    }, 400); // Debounce
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!exportJobId) return;
    let stopped = false;

    const poll = async () => {
      try {
        const st = await api.getExportStatus(exportJobId);
        if (!stopped) setExportStatus(st);
        if (st?.status === 'completed' || st?.status === 'failed') return;
        setTimeout(poll, 1500);
      } catch {
        if (!stopped) setTimeout(poll, 3000);
      }
    };

    poll();
    return () => { stopped = true; };
  }, [exportJobId]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ level: '', status: '', product: '', author: '' });
    setQuery('');
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { q: query, ...filters };
      const estimate = await api.estimateExport(params);

      if (estimate.rule_count === 0) {
        alert("No rules to export matching current filters.");
      } else if (estimate.exceeds_limits || estimate.mode === 'async') {
        const res = await api.exportAsync(params);
        const jobId = res?.job_id;
        if (!jobId) throw new Error('Async export did not return job_id');

        setExportJobId(jobId);
        sessionStorage.setItem('dac_export_job_id', jobId);
        setExportStatus(res);
        setExportStatusOpen(true);
      } else {
        await api.downloadExport(params);
      }
    } catch (error) {
      console.error(error);
      alert('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const openRuleDetail = async (id: string) => {
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const rule = await api.getRuleDetails(id);
      setSelectedRule(rule);
    } catch (error) {
      console.error(error);
      setIsDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Librería de Reglas</h1>
          <p className="text-sm text-slate-500">Buscar, filtrar y exportar reglas de detección</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`p-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-300 text-slate-600'} md:hidden`}
           >
             <Filter size={20} />
           </button>
           
           <div className="relative flex-1 md:w-80">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input
               type="text"
               placeholder="Buscar..."
               className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
               value={query}
               onChange={(e) => {
                 setQuery(e.target.value);
                 setPage(1);
               }}
             />
           </div>

           <div className="flex items-center gap-2">
             {exportJobId && (
               <button
                 onClick={() => setExportStatusOpen(true)}
                 className="flex items-center px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
               >
                 <Activity size={18} className="mr-2" />
                 {exportStatus?.status === 'completed'
                   ? 'Export listo'
                   : exportStatus?.status === 'failed'
                     ? 'Export falló'
                     : 'Export en progreso'}
               </button>
             )}

             <button 
               onClick={handleExport}
               disabled={exporting || loading}
               className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
             >
               <Download size={18} className={`mr-2 ${exporting ? 'animate-bounce' : ''}`} />
               {exporting ? 'Exportando...' : 'Exportar'}
             </button>
           </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Filters Sidebar */}
        <div className={`w-64 bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-y-auto ${showFilters ? 'fixed inset-0 z-40 m-4 md:static md:m-0' : 'hidden md:block'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800">Filtros</h3>
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">Limpiar todo</button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
              <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50">
                <option value="">Todos los estados</option>
                {filterOptions?.statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nivel</label>
              <select name="level" value={filters.level} onChange={handleFilterChange} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50">
                <option value="">Todos los niveles</option>
                {filterOptions?.levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
             <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Producto</label>
              <select name="product" value={filters.product} onChange={handleFilterChange} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50">
                <option value="">Todos los productos</option>
                {filterOptions?.products.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Autor</label>
              <select name="author" value={filters.author} onChange={handleFilterChange} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50">
                <option value="">Todos los autores</option>
                {filterOptions?.authors.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          
          {showFilters && (
            <button onClick={() => setShowFilters(false)} className="mt-6 w-full py-2 bg-blue-600 text-white rounded-lg md:hidden">Aplicar filtros</button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto flex flex-col pr-2">
          {loading ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : results?.rules && results.rules.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-3 text-sm text-slate-500">
                <span>Encontradas {results.total} reglas</span>
                <span>Página {results.page} de {results.total_pages}</span>
              </div>
              <div className="space-y-3 pb-4">
                {results.rules.map((rule) => (
                  <div 
                    key={rule.id} 
                    onClick={() => openRuleDetail(rule.id)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="font-semibold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{rule.title}</h3>
                          {rule.status === 'experimental' && <Activity size={14} className="ml-2 text-yellow-500" />}
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{rule.id}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                        ${rule.level === 'critical' ? 'bg-red-50 text-red-700 border-red-100' :
                          rule.level === 'high' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          rule.level === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {rule.level}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-3 line-clamp-2">{rule.description}</p>
                    
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
                        {rule.logsource_product || 'generic'} / {rule.logsource_service || 'any'}
                      </span>
                      {rule.attack_ids && rule.attack_ids.slice(0, 4).map(tag => (
                        <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {results.total_pages > 1 && (
                <div className="flex justify-center items-center space-x-4 mt-auto py-4">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded hover:bg-white hover:shadow-sm disabled:opacity-30"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    {page}
                  </span>
                  <button 
                    disabled={page === results.total_pages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded hover:bg-white hover:shadow-sm disabled:opacity-30"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          ) : (
             <div className="flex-1 flex flex-col justify-center items-center text-slate-400">
               <Search size={48} className="mb-4 opacity-20" />
               <p>No rules found matching your criteria.</p>
             </div>
          )}
        </div>
      </div>

      {/* Export Status Modal */}
      <Modal
        isOpen={exportStatusOpen}
        onClose={() => setExportStatusOpen(false)}
        title="Export en segundo plano"
        size="md"
      >
        {!exportJobId ? (
          <div className="text-sm text-slate-600">No hay export en curso.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Activity size={18} />
              <span className="font-semibold">Status:</span>
              <span className="font-mono">{exportStatus?.status || 'pending'}</span>
            </div>

            {exportStatus?.error && (
              <div className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-100 break-words">
                {String(exportStatus.error)}
              </div>
            )}

            {exportStatus?.status === 'completed' ? (
              <button
                onClick={async () => {
                  try {
                    await api.downloadExportJob(exportJobId);
                    sessionStorage.removeItem('dac_export_job_id');
                    setExportJobId(null);
                    setExportStatus(null);
                    setExportStatusOpen(false);
                  } catch {
                    alert('Download failed');
                  }
                }}
                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Descargar ZIP
              </button>
            ) : (
              <div className="text-sm text-slate-600">
                Puedes cerrar esta ventana: el export seguirá en segundo plano.
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  sessionStorage.removeItem('dac_export_job_id');
                  setExportJobId(null);
                  setExportStatus(null);
                  setExportStatusOpen(false);
                }}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rule Detail Modal */}
      <Modal 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)} 
        title={selectedRule?.title || "Loading..."}
        size="xl"
      >
        {loadingDetail || !selectedRule ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-slate-500 text-xs uppercase">ID</span>
                <span className="font-mono font-medium">{selectedRule.id}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-xs uppercase">Author</span>
                <span className="font-medium">{selectedRule.author}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-xs uppercase">Date</span>
                <span className="font-medium">{selectedRule.rule_date}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-xs uppercase">Log Source</span>
                <span className="font-medium">{selectedRule.logsource_product} {selectedRule.logsource_service ? `(${selectedRule.logsource_service})` : ''}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Description</h4>
              <p className="text-slate-600">{selectedRule.description}</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                 <h4 className="text-sm font-bold text-slate-700 flex items-center"><FileText size={16} className="mr-2"/> Rule Source (YAML)</h4>
              </div>
              <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                <pre className="p-4 text-xs font-mono text-green-400 overflow-x-auto custom-scrollbar">
                  <code>{selectedRule.yaml_content}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
