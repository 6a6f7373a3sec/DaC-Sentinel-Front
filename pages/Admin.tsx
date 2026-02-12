import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { User, IndexStats, UserRole, ImportResult } from '../types';
import { Users, Database, Play, Upload, GitMerge, FileArchive, Plus, Edit2, Trash2, AlertTriangle, CloudDownload, RefreshCw, FileText } from 'lucide-react';
import { Modal } from '../components/Modal';

// --- USERS TAB ---
const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User> & { password?: string }>({});
  const [isEditing, setIsEditing] = useState(false);

  const loadUsers = () => api.getUsers().then(res => setUsers(res.users)).catch(console.error);

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentUser.id) {
        // Remove password if empty to avoid updating it
        const { password, ...data } = currentUser;
        await api.updateUser(currentUser.id, data);
      } else {
        if (!currentUser.email || !currentUser.password || !currentUser.name) return;
        await api.createUser(currentUser as any);
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error(error);
      alert('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (e) { console.error(e); }
  };

  const openEdit = (user: User) => {
    setCurrentUser({ ...user });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setCurrentUser({ roles: [UserRole.ANALYST], is_active: true });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">System Users</h3>
          <button onClick={openCreate} className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus size={16} className="mr-2" /> Add User
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-sm text-slate-600">Name</th>
              <th className="p-4 font-semibold text-sm text-slate-600">Email</th>
              <th className="p-4 font-semibold text-sm text-slate-600">Roles</th>
              <th className="p-4 font-semibold text-sm text-slate-600">Status</th>
              <th className="p-4 font-semibold text-sm text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="p-4 text-sm font-medium">{u.name}</td>
                <td className="p-4 text-sm text-slate-500">{u.email}</td>
                <td className="p-4 text-sm">
                  {u.roles.map(r => (
                    <span key={r} className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded mr-1">{r}</span>
                  ))}
                </td>
                <td className="p-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => openEdit(u)} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
              value={currentUser.name || ''}
              onChange={e => setCurrentUser({...currentUser, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              required type="email"
              className="w-full p-2 border border-slate-300 rounded-lg"
              value={currentUser.email || ''}
              onChange={e => setCurrentUser({...currentUser, email: e.target.value})}
            />
          </div>
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                required type="password"
                className="w-full p-2 border border-slate-300 rounded-lg"
                value={currentUser.password || ''}
                onChange={e => setCurrentUser({...currentUser, password: e.target.value})}
              />
            </div>
          )}
          <div className="flex items-center space-x-4">
             <label className="flex items-center space-x-2">
               <input 
                 type="checkbox"
                 checked={currentUser.is_active || false}
                 onChange={e => setCurrentUser({...currentUser, is_active: e.target.checked})}
               />
               <span className="text-sm">Active</span>
             </label>
             <label className="flex items-center space-x-2">
               <input 
                 type="checkbox"
                 checked={currentUser.roles?.includes(UserRole.ADMIN) || false}
                 onChange={e => {
                   const roles = new Set(currentUser.roles || []);
                   e.target.checked ? roles.add(UserRole.ADMIN) : roles.delete(UserRole.ADMIN);
                   setCurrentUser({...currentUser, roles: Array.from(roles)});
                 }}
               />
               <span className="text-sm">Admin Role</span>
             </label>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
              Save User
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

// --- IMPORT TAB ---
const ImportTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSigmaImport = async () => {
    setLoading(true);
    try {
      const res = await api.importSigmaHQ();
      setResult(res);
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const handleGitImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl) return;
    setLoading(true);
    try {
      const res = await api.importGit(gitUrl);
      setResult(res);
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const handleZipImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.importZip(file);
      setResult(res);
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* SigmaHQ */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
          <CloudDownload size={24} />
        </div>
        <h3 className="font-bold text-lg mb-2">SigmaHQ Official</h3>
        <p className="text-slate-500 text-sm mb-6">Import the latest rules directly from the official SigmaHQ repository.</p>
        <button 
          onClick={handleSigmaImport} 
          disabled={loading}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Sync SigmaHQ'}
        </button>
      </div>

      {/* Git */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="h-12 w-12 bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center mb-4">
          <GitMerge size={24} />
        </div>
        <h3 className="font-bold text-lg mb-2">Git Repository</h3>
        <p className="text-slate-500 text-sm mb-4">Clone and import rules from a custom remote Git URL.</p>
        <form onSubmit={handleGitImport} className="space-y-3">
          <input 
            type="url" 
            placeholder="https://github.com/org/repo.git"
            className="w-full p-2 border border-slate-300 rounded text-sm"
            value={gitUrl}
            onChange={e => setGitUrl(e.target.value)}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50"
          >
            Clone & Import
          </button>
        </form>
      </div>

      {/* Zip */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
          <FileArchive size={24} />
        </div>
        <h3 className="font-bold text-lg mb-2">ZIP Archive</h3>
        <p className="text-slate-500 text-sm mb-4">Upload a ZIP file containing YAML rule files.</p>
        <form onSubmit={handleZipImport} className="space-y-3">
          <input 
            type="file" 
            accept=".zip"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Upload
          </button>
        </form>
      </div>

      {result && (
        <div className="md:col-span-3 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start">
           <RefreshCw className="text-green-600 mt-1 mr-3" size={20} />
           <div>
             <h4 className="font-bold text-green-800">Import Completed</h4>
             <p className="text-green-700 text-sm mt-1">{result.message || result.status}</p>
             {result.index_stats && (
               <div className="mt-2 text-xs text-green-800 font-mono">
                 Rules: {result.index_stats.total_rules} | Errors: {result.index_stats.error_count}
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

// --- LOCAL RULES TAB ---
type LocalRuleItem = {
  id: string | number;
  path: string;
  title?: string;
  status?: string;
  level?: string;
  indexed_at?: string;
};

type LocalRuleListResponse = {
  items?: LocalRuleItem[];
  rules?: LocalRuleItem[];
  total?: number;
  page?: number;
  page_size?: number;
};

const LocalRulesTab: React.FC = () => {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [data, setData] = useState<LocalRuleListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal / form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formPath, setFormPath] = useState('ai/mi_regla.yml');
  const [formYaml, setFormYaml] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listLocalRules({ page, page_size: pageSize, q: q.trim() || undefined });
      setData(res);
    } catch (e) {
      console.error(e);
      setData({ items: [], total: 0, page, page_size: pageSize });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  const items: LocalRuleItem[] = (data?.items || data?.rules || []) as LocalRuleItem[];
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setMode('create');
    setCurrentId(null);
    setFormPath('ai/mi_regla.yml');
    setFormYaml('');
    setOverwrite(false);
    setIsModalOpen(true);
  };

  const openEdit = async (rule: LocalRuleItem) => {
    setMode('edit');
    setCurrentId(String(rule.id));
    setFormPath(rule.path);
    setOverwrite(false);
    setIsModalOpen(true);

    try {
      const detail = await api.getRuleDetails(String(rule.id));
      setFormYaml((detail as any)?.yaml_content || '');
    } catch (e) {
      console.error(e);
      setFormYaml('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta regla local?')) return;
    try {
      await api.deleteLocalRule(id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYaml.trim()) return;
    setSaving(true);
    try {
      if (mode === 'create') {
        await api.createLocalRule(formPath.trim(), formYaml, overwrite, true);
      } else if (currentId) {
        await api.updateLocalRule(currentId, formYaml, true);
      }
      setIsModalOpen(false);
      await load();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-700">Reglas Locales</h3>
            <p className="text-xs text-slate-500 mt-0.5">Estas reglas viven en <span className="font-mono">rules/local/</span> y se indexan sin perder SigmaHQ.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Buscar por título o path..."
              className="w-64 max-w-full p-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              onClick={openCreate}
              className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" /> Nueva
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-sm text-slate-600">Título</th>
                <th className="p-4 font-semibold text-sm text-slate-600">Path</th>
                <th className="p-4 font-semibold text-sm text-slate-600">Status</th>
                <th className="p-4 font-semibold text-sm text-slate-600">Nivel</th>
                <th className="p-4 font-semibold text-sm text-slate-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td className="p-6 text-sm text-slate-500" colSpan={5}>
                    No hay reglas locales todavía.
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={String(r.id)} className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-medium flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      {r.title || '(sin título)'}
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-mono break-all">{r.path}</td>
                    <td className="p-4 text-sm text-slate-600">{r.status || '-'}</td>
                    <td className="p-4 text-sm text-slate-600">{r.level || '-'}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openEdit(r)} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(String(r.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-white text-sm">
            <span className="text-slate-500">{total} total • página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded border border-slate-300 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="px-3 py-1.5 rounded border border-slate-300 disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? 'Nueva Regla Local' : 'Editar Regla Local'}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Path (relativo a <span className="font-mono">rules/local/</span>)</label>
            <input
              className="w-full p-2 border border-slate-300 rounded-lg font-mono text-sm"
              value={formPath}
              onChange={(e) => setFormPath(e.target.value)}
              disabled={mode === 'edit'}
              required
            />
            {mode === 'create' && (
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                  Sobrescribir si existe
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contenido (YAML)</label>
            <textarea
              className="w-full h-80 p-3 border border-slate-300 rounded-lg font-mono text-xs bg-slate-50"
              value={formYaml}
              onChange={(e) => setFormYaml(e.target.value)}
              placeholder="Pega aquí la regla Sigma en YAML..."
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar e indexar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

// --- INDEXER TAB ---
const IndexerTab: React.FC = () => {
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [errors, setErrors] = useState<{errors: string[], total: number}>({errors: [], total: 0});
  const [indexing, setIndexing] = useState(false);

  const loadStats = async () => {
    try {
      const s = await api.getIndexStats();
      setStats(s);
      if (s.error_count > 0) {
        const e = await api.getIndexErrors();
        setErrors(e);
      }
    } catch(err) { console.error(err); }
  };

  useEffect(() => { loadStats(); }, []);

  const handleReindex = async () => {
    setIndexing(true);
    try {
      await api.triggerReindex(true);
      await loadStats();
    } catch (e) {
      alert('Reindex failed');
    } finally {
      setIndexing(false);
    }
  };

  if (!stats) return <div>Loading stats...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4">Index Health & Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
             <div className="text-xs text-slate-500 uppercase font-semibold">Total de reglas</div>
             <div className="text-2xl font-bold text-slate-900">{stats.total_rules}</div>
          </div>
          <div className={`p-4 rounded-lg border ${stats.error_count > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
             <div className="text-xs opacity-75 uppercase font-semibold">Errors</div>
             <div className={`text-2xl font-bold ${stats.error_count > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.error_count}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
             <div className="text-xs text-slate-500 uppercase font-semibold">Version</div>
             <div className="text-sm font-mono mt-2 font-medium">{stats.index_version.substring(0, 8)}...</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
             <div className="text-xs text-slate-500 uppercase font-semibold">Repo Source</div>
             <div className={`text-sm font-bold mt-1 ${stats.repo_exists ? 'text-green-600' : 'text-red-600'}`}>
               {stats.repo_exists ? 'Linked' : 'Not Linked'}
             </div>
          </div>
        </div>
        
        <div className="flex justify-end border-t border-slate-100 pt-6">
          <button 
            onClick={handleReindex}
            disabled={indexing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Play size={18} className={`mr-2 ${indexing ? 'animate-spin' : ''}`} />
            {indexing ? 'Indexing...' : 'Trigger Full Reindex'}
          </button>
        </div>
      </div>

      {stats.error_count > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-50 p-4 border-b border-red-200 flex items-center">
            <AlertTriangle className="text-red-600 mr-2" size={20} />
            <h3 className="text-red-900 font-semibold">Index Errors ({errors.total})</h3>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 space-y-2 bg-slate-50">
            {errors.errors.map((err, i) => (
              <div key={i} className="text-xs font-mono text-red-600 bg-red-50 p-2 rounded border border-red-100 break-all">
                {err}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'import' | 'local' | 'index'>('users');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">System Administration</h1>
      
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Users size={16} className="mr-2" /> Users
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Upload size={16} className="mr-2" /> Import
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'local' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <FileText size={16} className="mr-2" /> Reglas Locales
        </button>
        <button
          onClick={() => setActiveTab('index')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'index' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Database size={16} className="mr-2" /> Indexer
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'users' ? (
          <UsersTab />
        ) : activeTab === 'import' ? (
          <ImportTab />
        ) : activeTab === 'local' ? (
          <LocalRulesTab />
        ) : (
          <IndexerTab />
        )}
      </div>
    </div>
  );
};
