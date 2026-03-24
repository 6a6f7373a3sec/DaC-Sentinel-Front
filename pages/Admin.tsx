import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { GitRepoSource } from '../services/api';
import { User, IndexStats, UserRole, ImportResult } from '../types';
import { Users, Database, Play, Upload, GitMerge, FileArchive, Plus, Edit2, Trash2, AlertTriangle, CloudDownload, RefreshCw, FileText, HardDrive, CheckCircle, XCircle, Loader2, GitBranch, ExternalLink, ChevronRight } from 'lucide-react';
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
        await api.updateUser(currentUser.id, {
          name: currentUser.name,
          is_active: currentUser.is_active,
          roles: currentUser.roles,
        });
      } else {
        if (!currentUser.email || !currentUser.password || !currentUser.name) return;
        await api.createUser({
          email: currentUser.email,
          name: currentUser.name,
          password: currentUser.password,
          roles: currentUser.roles ?? [UserRole.READ_ONLY],
          is_active: currentUser.is_active ?? true,
        });
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
    setCurrentUser({ roles: [UserRole.READ_ONLY], is_active: true });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-a3sec-surface rounded-xl shadow border border-a3sec-border overflow-hidden">
        <div className="p-4 border-b border-a3sec-border flex justify-between items-center bg-a3sec-deeper">
          <h3 className="font-semibold text-slate-300">System Users</h3>
          <button onClick={openCreate} className="flex items-center px-3 py-1.5 bg-brand-green text-a3sec-dark text-white text-sm rounded-lg hover:bg-brand-green/90">
            <Plus size={16} className="mr-2" /> Add User
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-a3sec-surface border-b border-a3sec-border">
            <tr>
              <th className="p-4 font-semibold text-sm text-slate-400">Name</th>
              <th className="p-4 font-semibold text-sm text-slate-400">Email</th>
              <th className="p-4 font-semibold text-sm text-slate-400">Roles</th>
              <th className="p-4 font-semibold text-sm text-slate-400">Status</th>
              <th className="p-4 font-semibold text-sm text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-a3sec-deeper">
                <td className="p-4 text-sm font-medium">{u.name}</td>
                <td className="p-4 text-sm text-slate-500">{u.email}</td>
                <td className="p-4 text-sm">
                  {u.roles.map(r => (
                    <span key={r} className="inline-block bg-blue-100 text-green-700 text-xs px-2 py-1 rounded mr-1">{r}</span>
                  ))}
                </td>
                <td className="p-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => openEdit(u)} className="p-1 text-slate-400 hover:text-brand-green"><Edit2 size={16} /></button>
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input
              required
              className="w-full p-2 border border-a3sec-muted rounded-lg"
              value={currentUser.name || ''}
              onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              required type="email"
              className="w-full p-2 border border-a3sec-muted rounded-lg"
              value={currentUser.email || ''}
              onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })}
            />
          </div>
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                required type="password"
                className="w-full p-2 border border-a3sec-muted rounded-lg"
                value={currentUser.password || ''}
                onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })}
              />
            </div>
          )}
          <div className="flex items-center flex-wrap gap-3">
            <label className="flex items-center space-x-2">
              <input type="checkbox"
                checked={currentUser.is_active || false}
                onChange={e => setCurrentUser({ ...currentUser, is_active: e.target.checked })}
              />
              <span className="text-sm">Active</span>
            </label>
            {([UserRole.ADMIN, UserRole.READ_WRITE, UserRole.READ_ONLY] as const).map(role => (
              <label key={role} className="flex items-center space-x-2">
                <input type="checkbox"
                  checked={currentUser.roles?.includes(role) || false}
                  onChange={e => {
                    const roles = new Set(currentUser.roles || []);
                    e.target.checked ? roles.add(role) : roles.delete(role);
                    setCurrentUser({ ...currentUser, roles: Array.from(roles) });
                  }}
                />
                <span className="text-sm">{role}</span>
              </label>
            ))}
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" className="px-4 py-2 bg-brand-green text-a3sec-dark rounded-lg hover:bg-a3sec-surface">
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

  const [repoStatus, setRepoStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      setRepoStatus(await api.getImportStatus());
    } catch (e) {
      setRepoStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSigmaImport = async () => {
    setLoading(true);
    try {
      const res = await api.importSigmaHQ();
      setResult(res);
      await loadStatus();
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
      <div className="md:col-span-3 bg-a3sec-surface rounded-xl shadow-sm border border-a3sec-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-slate-300">
          <span className="font-semibold">Repo status:</span>{' '}
          {loadingStatus ? 'Loading...' : repoStatus ? (
            <span className="font-mono text-xs text-slate-400">
              {repoStatus.repo_path} • yaml:{repoStatus.yaml_count} • branch:{repoStatus.git_branch || '-'} • remote:{repoStatus.git_remote || '-'}
            </span>
          ) : (
            <span className="text-slate-500">Unavailable</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadStatus}
            disabled={loadingStatus}
            className="px-3 py-2 rounded-lg border border-a3sec-muted text-slate-300 hover:bg-a3sec-deeper text-sm disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              try { setResult(await api.importSync()); await loadStatus(); }
              catch (e: any) { alert(e.message); }
              setLoading(false);
            }}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-brand-green text-a3sec-dark hover:bg-a3sec-surface text-sm disabled:opacity-50"
          >
            Sync Repo
          </button>
        </div>
      </div>

      {/* SigmaHQ */}
      <div className="bg-a3sec-surface p-6 rounded-xl shadow-sm border border-a3sec-border">
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
      <div className="bg-a3sec-surface p-6 rounded-xl shadow-sm border border-a3sec-border">
        <div className="h-12 w-12 bg-a3sec-dark text-white rounded-lg flex items-center justify-center mb-4">
          <GitMerge size={24} />
        </div>
        <h3 className="font-bold text-lg mb-2">Git Repository</h3>
        <p className="text-slate-500 text-sm mb-4">Clone and import rules from a custom remote Git URL.</p>
        <form onSubmit={handleGitImport} className="space-y-3">
          <input
            type="url"
            placeholder="https://github.com/org/repo.git"
            className="w-full p-2 border border-a3sec-muted rounded text-sm"
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
      <div className="bg-a3sec-surface p-6 rounded-xl shadow-sm border border-a3sec-border">
        <div className="h-12 w-12 bg-blue-100 text-brand-green rounded-lg flex items-center justify-center mb-4">
          <FileArchive size={24} />
        </div>
        <h3 className="font-bold text-lg mb-2">ZIP Archive</h3>
        <p className="text-slate-500 text-sm mb-4">Upload a ZIP file containing YAML rule files.</p>
        <form onSubmit={handleZipImport} className="space-y-3">
          <input
            type="file"
            accept=".zip"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-green/10 file:text-brand-green hover:file:bg-blue-100"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-brand-green text-a3sec-dark text-white rounded-lg hover:bg-brand-green/90 disabled:opacity-50"
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
      <div className="bg-a3sec-surface rounded-xl shadow border border-a3sec-border overflow-hidden">
        <div className="p-4 border-b border-a3sec-border flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-a3sec-deeper">
          <div>
            <h3 className="font-semibold text-slate-300">Reglas Locales</h3>
            <p className="text-xs text-slate-500 mt-0.5">Estas reglas viven en <span className="font-mono">rules/local/</span> y se indexan sin perder SigmaHQ.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Buscar por título o path..."
              className="w-64 max-w-full p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-surface"
            />
            <button
              onClick={openCreate}
              className="flex items-center px-3 py-2 bg-brand-green text-a3sec-dark text-white text-sm rounded-lg hover:bg-brand-green/90"
            >
              <Plus size={16} className="mr-2" /> Nueva
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-a3sec-surface border-b border-a3sec-border">
              <tr>
                <th className="p-4 font-semibold text-sm text-slate-400">Título</th>
                <th className="p-4 font-semibold text-sm text-slate-400">Path</th>
                <th className="p-4 font-semibold text-sm text-slate-400">Status</th>
                <th className="p-4 font-semibold text-sm text-slate-400">Nivel</th>
                <th className="p-4 font-semibold text-sm text-slate-400 text-right">Acciones</th>
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
                  <tr key={String(r.id)} className="hover:bg-a3sec-deeper">
                    <td className="p-4 text-sm font-medium flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      {r.title || '(sin título)'}
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-mono break-all">{r.path}</td>
                    <td className="p-4 text-sm text-slate-400">{r.status || '-'}</td>
                    <td className="p-4 text-sm text-slate-400">{r.level || '-'}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openEdit(r)} className="p-1 text-slate-400 hover:text-brand-green"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(String(r.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-a3sec-border bg-a3sec-surface text-sm">
            <span className="text-slate-500">{total} total • página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded border border-a3sec-muted disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="px-3 py-1.5 rounded border border-a3sec-muted disabled:opacity-40"
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Path (relativo a <span className="font-mono">rules/local/</span>)</label>
            <input
              className="w-full p-2 border border-a3sec-muted rounded-lg font-mono text-sm"
              value={formPath}
              onChange={(e) => setFormPath(e.target.value)}
              disabled={mode === 'edit'}
              required
            />
            {mode === 'create' && (
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                  Sobrescribir si existe
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Contenido (YAML)</label>
            <textarea
              className="w-full h-80 p-3 border border-a3sec-muted rounded-lg font-mono text-xs bg-a3sec-deeper"
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
              className="px-4 py-2 rounded-lg border border-a3sec-muted text-slate-300 hover:bg-a3sec-deeper"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-brand-green text-a3sec-dark rounded-lg hover:bg-a3sec-surface disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar e indexar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

// --- REPO SOURCES TAB (Phase B) ---
const RepoSourcesTab: React.FC = () => {
  const [repos, setRepos] = useState<GitRepoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadRepos = async () => {
    try {
      const res = await api.listRepos();
      setRepos(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRepos(); }, []);

  const handleSync = async (id: number) => {
    setSyncingId(id);
    try {
      await api.syncRepo(id);
      await loadRepos();
    } catch (e: any) {
      alert(e.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (repo: GitRepoSource) => {
    if (!confirm(`¿Eliminar fuente "${repo.name}"? Las reglas en DB se conservarán como huérfanas.`)) return;
    try {
      await api.deleteRepo(repo.id);
      await loadRepos();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  const formatTimeAgo = (iso: string | null) => {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
  };

  const statusBadge = (status: string | null) => {
    switch (status) {
      case 'success': return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full"><CheckCircle size={12} /> Sincronizado</span>;
      case 'failed': return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full"><XCircle size={12} /> Fallido</span>;
      case 'syncing': return <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-green bg-brand-green/10 px-2 py-1 rounded-full"><Loader2 size={12} className="animate-spin" /> Sincronizando</span>;
      default: return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-a3sec-dark px-2 py-1 rounded-full">Pendiente</span>;
    }
  };

  return (
    <>
      <div className="bg-a3sec-surface rounded-xl shadow border border-a3sec-border overflow-hidden">
        <div className="p-4 border-b border-a3sec-border flex justify-between items-center bg-a3sec-deeper">
          <div>
            <h3 className="font-semibold text-slate-300">Fuentes Git Registradas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Gestiona múltiples repositorios de reglas Sigma</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center px-3 py-1.5 bg-brand-green text-a3sec-dark text-white text-sm rounded-lg hover:bg-brand-green/90">
            <Plus size={16} className="mr-2" /> Agregar Repo
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500 text-center">Cargando fuentes...</div>
        ) : repos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <GitMerge className="mx-auto mb-3 text-slate-300" size={40} />
            <p className="text-sm">No hay fuentes registradas todavía.</p>
            <p className="text-xs text-slate-400 mt-1">Usa "Agregar Repo" para registrar un repositorio de reglas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {repos.map(repo => (
              <div key={repo.id} className="p-4 hover:bg-a3sec-deeper transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white truncate">{repo.name}</h4>
                      {statusBadge(repo.last_sync_status)}
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">{repo.repo_url}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><GitBranch size={12} /> {repo.branch}</span>
                      <span>📁 {repo.rules_subpath}/</span>
                      <span className="font-semibold text-slate-300">{repo.rule_count.toLocaleString()} reglas</span>
                      {repo.last_sync_at && <span>Sync: {formatTimeAgo(repo.last_sync_at)}</span>}
                      {repo.last_commit_hash && <span className="font-mono">{repo.last_commit_hash.substring(0, 7)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSync(repo.id)}
                      disabled={syncingId === repo.id}
                      className="px-3 py-1.5 text-sm border border-a3sec-muted rounded-lg hover:bg-a3sec-deeper disabled:opacity-50 flex items-center gap-1"
                    >
                      {syncingId === repo.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {syncingId === repo.id ? 'Sincronizando...' : repo.last_sync_status === 'failed' ? 'Reintentar' : 'Sincronizar'}
                    </button>
                    <button
                      onClick={() => handleDelete(repo)}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddRepoModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); loadRepos(); }}
        />
      )}
    </>
  );
};

// --- ADD REPO MODAL (Phase B - 3-step wizard) ---
const AddRepoModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [repoUrl, setRepoUrl] = useState('');
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState('');
  const [probeResult, setProbeResult] = useState<{
    accessible: boolean; branches: string[]; default_branch: string | null;
    already_registered: boolean; existing_source_id: number | null;
  } | null>(null);

  // Step 2 fields
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [rulesSubpath, setRulesSubpath] = useState('rules');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Step 3
  const [createdRepo, setCreatedRepo] = useState<GitRepoSource | null>(null);

  const handleProbe = async () => {
    const url = repoUrl.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/.test(url)) {
      setProbeError('La URL debe empezar con https:// o http://');
      return;
    }
    setProbing(true);
    setProbeError('');
    try {
      const result = await api.probeRepo(url);
      setProbeResult(result);
      if (!result.accessible) {
        setProbeError(result.error || 'Repositorio no accesible');
      } else {
        // Auto-generate name from URL
        const urlParts = url.replace(/\.git$/, '').split('/');
        setName(urlParts[urlParts.length - 1] || 'my-rules');
        setBranch(result.default_branch || result.branches[0] || 'main');
        setStep(2);
      }
    } catch (e: any) {
      setProbeError(e.message || 'Error al verificar repositorio');
    } finally {
      setProbing(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const repo = await api.createRepo({
        name: name.trim(),
        repo_url: repoUrl.trim(),
        branch,
        rules_subpath: rulesSubpath.trim() || 'rules',
      });
      setCreatedRepo(repo);
      setStep(3);
    } catch (e: any) {
      setCreateError(e.message || 'Error al registrar repositorio');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Agregar Fuente Git" size="lg">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">URL del repositorio</label>
            <input
              type="url"
              placeholder="https://github.com/user/repo.git"
              className="w-full p-3 border border-a3sec-muted rounded-lg text-sm font-mono"
              value={repoUrl}
              onChange={e => { setRepoUrl(e.target.value); setProbeError(''); setProbeResult(null); }}
              onKeyDown={e => e.key === 'Enter' && handleProbe()}
              autoFocus
            />
          </div>
          {probeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
              <XCircle size={16} className="mt-0.5 shrink-0" /> {probeError}
            </div>
          )}
          {probeResult?.already_registered && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              Este repositorio ya está registrado (ID: {probeResult.existing_source_id})
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleProbe}
              disabled={probing || !repoUrl.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-a3sec-dark rounded-lg hover:bg-a3sec-surface disabled:opacity-50"
            >
              {probing ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {probing ? 'Verificando...' : 'Verificar repo'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && probeResult && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle size={16} /> Repositorio accesible — {probeResult.branches.length} rama(s) encontrada(s)
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nombre (identificador)</label>
            <input
              className="w-full p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-surface"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-custom-rules"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Rama</label>
            <select
              className="w-full p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-surface bg-a3sec-surface"
              value={branch}
              onChange={e => setBranch(e.target.value)}
            >
              {probeResult.branches.map(b => (
                <option key={b} value={b}>
                  {b}{b === probeResult.default_branch ? ' ✦ (default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Subdirectorio de reglas</label>
            <input
              className="w-full p-2 border border-a3sec-muted rounded-lg text-sm bg-a3sec-surface font-mono"
              value={rulesSubpath}
              onChange={e => setRulesSubpath(e.target.value)}
              placeholder="rules"
            />
            <p className="text-xs text-slate-400 mt-1">Ruta relativa dentro del repo donde están los archivos .yml/.yaml</p>
          </div>
          {createError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
              <XCircle size={16} className="mt-0.5 shrink-0" /> {createError}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-slate-300 border border-a3sec-muted rounded-lg hover:bg-a3sec-deeper">
              ← Atrás
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-a3sec-dark rounded-lg hover:bg-a3sec-surface disabled:opacity-50"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {creating ? 'Registrando...' : 'Registrar y sincronizar'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && createdRepo && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <div className="flex items-center gap-2 font-semibold mb-2"><CheckCircle size={16} /> Fuente registrada exitosamente</div>
            <div className="space-y-1 text-xs">
              <p><span className="font-medium">Nombre:</span> {createdRepo.name}</p>
              <p><span className="font-medium">Rama:</span> {createdRepo.branch}</p>
              <p><span className="font-medium">Estado:</span> {createdRepo.last_sync_status === 'success' ? '✅ Sincronizado' : createdRepo.last_sync_status === 'syncing' ? '🔄 Sincronizando...' : '⚠️ ' + (createdRepo.last_sync_status || 'pendiente')}</p>
              <p><span className="font-medium">Reglas indexadas:</span> {createdRepo.rule_count.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onCreated} className="px-4 py-2 bg-brand-green text-a3sec-dark rounded-lg hover:bg-a3sec-surface">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// --- INDEXER TAB ---
const IndexerTab: React.FC = () => {
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [errors, setErrors] = useState<{ errors: any[], total: number }>({ errors: [], total: 0 }); // preview (API recorta por limit)
  const [indexing, setIndexing] = useState(false);
  const [downloadingErrors, setDownloadingErrors] = useState(false);
  const [errorsExportFmt, setErrorsExportFmt] = useState<'json' | 'csv'>('json');
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<{ restored: number; total_in_db: number } | null>(null);

  const [scheduler, setScheduler] = useState<any>(null);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  const PREVIEW_LIMIT = 100;

  const loadStats = async () => {
    try {
      const s = await api.getIndexStats();
      setStats(s);

      setScheduler(await api.getScheduler().catch(() => null));

      if (s.error_count > 0) {
        // Preview: el endpoint /errors limita; el "full" se hace con /errors/export
        const e = await api.getIndexErrors({ index_version: s.index_version, limit: PREVIEW_LIMIT });
        setErrors(e);
      } else {
        setErrors({ errors: [], total: 0 });
      }
    } catch (err) { console.error(err); }
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

  const downloadFullErrors = async () => {
    if (!stats || stats.error_count <= 0) return;
    setDownloadingErrors(true);
    try {
      // Usa /admin/index/errors/export (documentado) para obtener el total real.
      await api.downloadIndexErrorsExport({
        index_version: stats.index_version,
        limit: Math.min(stats.error_count, 5000),
        fmt: errorsExportFmt
      });
    } catch {
      alert('Download failed');
    } finally {
      setDownloadingErrors(false);
    }
  };

  if (!stats) return <div>Loading stats...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-a3sec-surface p-6 rounded-xl shadow-sm border border-a3sec-border">
        <h3 className="text-lg font-bold mb-4">Index Health & Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-a3sec-deeper rounded-lg border border-a3sec-border">
            <div className="text-xs text-slate-500 uppercase font-semibold">Total de reglas</div>
            <div className="text-2xl font-bold text-white">{stats.total_rules}</div>
          </div>
          <div className={`p-4 rounded-lg border ${stats.error_count > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <div className="text-xs opacity-75 uppercase font-semibold">Errors</div>
            <div className={`text-2xl font-bold ${stats.error_count > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.error_count}</div>
          </div>
          <div className="p-4 bg-a3sec-deeper rounded-lg border border-a3sec-border">
            <div className="text-xs text-slate-500 uppercase font-semibold">Version</div>
            <div className="text-sm font-mono mt-2 font-medium">{stats.index_version.substring(0, 8)}...</div>
          </div>
          <div className="p-4 bg-a3sec-deeper rounded-lg border border-a3sec-border">
            <div className="text-xs text-slate-500 uppercase font-semibold">Repo Source</div>
            <div className={`text-sm font-bold mt-1 ${stats.repo_exists ? 'text-green-600' : 'text-red-600'}`}>
              {stats.repo_exists ? 'Linked' : 'Not Linked'}
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${(stats as any).rules_with_yaml === stats.total_rules ? 'bg-green-50 border-green-100' :
              (stats as any).rules_with_yaml > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'
            }`}>
            <div className="text-xs uppercase font-semibold opacity-75">YAML en DB</div>
            <div className="text-lg font-bold mt-1">
              {((stats as any).rules_with_yaml ?? '—')} <span className="text-xs font-normal text-slate-500">/ {stats.total_rules}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-a3sec-border pt-6">
          <div className="text-sm text-slate-400">
            <span className="font-semibold">Scheduler:</span>{' '}
            {scheduler ? (scheduler.running ? 'running' : 'idle') : 'unavailable'}
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              onClick={async () => {
                setTriggeringJob('reindex_job');
                try { await api.triggerSchedulerJob('reindex_job'); await loadStats(); }
                catch { alert('Trigger failed'); }
                setTriggeringJob(null);
              }}
              disabled={!!triggeringJob || indexing}
              className="px-3 py-2 rounded-lg border border-a3sec-muted text-slate-300 hover:bg-a3sec-deeper text-sm disabled:opacity-50"
            >
              {triggeringJob === 'reindex_job' ? 'Triggering...' : 'Trigger reindex_job'}
            </button>

            <button
              onClick={async () => {
                setTriggeringJob('mitre_update_job');
                try { await api.triggerSchedulerJob('mitre_update_job'); await loadStats(); }
                catch { alert('Trigger failed'); }
                setTriggeringJob(null);
              }}
              disabled={!!triggeringJob || indexing}
              className="px-3 py-2 rounded-lg border border-a3sec-muted text-slate-300 hover:bg-a3sec-deeper text-sm disabled:opacity-50"
            >
              {triggeringJob === 'mitre_update_job' ? 'Triggering...' : 'Trigger mitre_update_job'}
            </button>

            <button
              onClick={handleReindex}
              disabled={indexing || !!triggeringJob}
              className="flex items-center px-4 py-2 bg-brand-green text-a3sec-dark text-white rounded-lg hover:bg-brand-green/90 disabled:opacity-50 transition-colors"
            >
              <Play size={18} className={`mr-2 ${indexing ? 'animate-spin' : ''}`} />
              {indexing ? 'Indexing...' : 'Trigger Full Reindex'}
            </button>

            <button
              onClick={async () => {
                if (!confirm('Esto reconstruirá los archivos YAML desde la DB al filesystem. ¿Continuar?')) return;
                setRebuilding(true);
                setRebuildResult(null);
                try {
                  const res = await api.rebuildFilesystem();
                  setRebuildResult(res);
                } catch (e: any) {
                  alert(e.message || 'Rebuild failed');
                } finally {
                  setRebuilding(false);
                }
              }}
              disabled={rebuilding || indexing}
              className="flex items-center px-4 py-2 border border-a3sec-muted text-slate-300 rounded-lg hover:bg-a3sec-deeper disabled:opacity-50 transition-colors"
            >
              <HardDrive size={18} className={`mr-2 ${rebuilding ? 'animate-pulse' : ''}`} />
              {rebuilding ? 'Reconstruyendo...' : 'Rebuild Filesystem'}
            </button>
          </div>
        </div>
      </div>

      {rebuildResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <HardDrive className="text-green-600 mt-0.5 shrink-0" size={20} />
          <div>
            <h4 className="font-bold text-green-800">Rebuild completado</h4>
            <p className="text-green-700 text-sm mt-1">
              Restaurados {rebuildResult.restored} de {rebuildResult.total_in_db} archivos YAML desde la DB.
            </p>
          </div>
        </div>
      )}

      {stats.error_count > 0 && (
        <div className="bg-a3sec-surface rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-50 p-4 border-b border-red-200 flex items-center justify-between gap-3">
            <div className="flex items-center">
              <AlertTriangle className="text-red-600 mr-2" size={20} />
              <div>
                <h3 className="text-red-900 font-semibold">Index Errors ({stats.error_count})</h3>
                <div className="text-xs text-red-800/70">
                  Preview: {Math.min(errors.errors.length, 100)} (el endpoint /errors recorta por limit)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={errorsExportFmt}
                onChange={(e) => setErrorsExportFmt(e.target.value as any)}
                className="px-2 py-2 rounded-lg border border-red-200 bg-a3sec-surface text-sm text-slate-300"
                aria-label="Formato de export"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>

              <button
                onClick={downloadFullErrors}
                disabled={downloadingErrors || stats.error_count <= 0}
                className="px-3 py-2 rounded-lg bg-brand-green text-a3sec-dark hover:bg-a3sec-surface text-sm disabled:opacity-50"
              >
                {downloadingErrors ? 'Descargando...' : 'Exportar completo'}
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 space-y-2 bg-a3sec-deeper">
            {errors.errors.map((err, i) => (
              <div key={i} className="text-xs font-mono text-red-600 bg-red-50 p-2 rounded border border-red-100 break-all">
                {typeof err === 'string' ? err : (err?.error_message || err?.message || JSON.stringify(err))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'import' | 'repos' | 'local' | 'index'>('users');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">System Administration</h1>

      <div className="flex space-x-1 bg-a3sec-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-a3sec-surface text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <Users size={16} className="mr-2" /> Users
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-a3sec-surface text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <Upload size={16} className="mr-2" /> Import
        </button>
        <button
          onClick={() => setActiveTab('repos')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'repos' ? 'bg-a3sec-surface text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <GitMerge size={16} className="mr-2" /> Fuentes Git
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'local' ? 'bg-a3sec-surface text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <FileText size={16} className="mr-2" /> Reglas Locales
        </button>
        <button
          onClick={() => setActiveTab('index')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'index' ? 'bg-a3sec-surface text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <Database size={16} className="mr-2" /> Indexer
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'users' ? (
          <UsersTab />
        ) : activeTab === 'import' ? (
          <ImportTab />
        ) : activeTab === 'repos' ? (
          <RepoSourcesTab />
        ) : activeTab === 'local' ? (
          <LocalRulesTab />
        ) : (
          <IndexerTab />
        )}
      </div>
    </div>
  );
};