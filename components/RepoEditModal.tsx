import React, { useEffect, useState } from 'react';
import { Loader2, Save, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { api, GitRepoSource, RepoUpdatePayload } from '../services/api';

interface RepoEditModalProps {
  repoId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export const RepoEditModal: React.FC<RepoEditModalProps> = ({ repoId, onClose, onSaved }) => {
  const [repo, setRepo] = useState<GitRepoSource | null>(null);
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [rulesSubpath, setRulesSubpath] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (repoId === null) return;

    let cancelled = false;
    setLoading(true);
    setError('');
    setRepo(null);

    api.getRepo(repoId)
      .then(data => {
        if (cancelled) return;
        setRepo(data);
        setName(data.name);
        setBranch(data.branch);
        setRulesSubpath(data.rules_subpath);
        setIsActive(data.is_active);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'No se pudo cargar el repo');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [repoId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (repoId === null) return;
    setSaving(true);
    setError('');

    const payload: RepoUpdatePayload = {
      name: name.trim(),
      branch: branch.trim(),
      rules_subpath: rulesSubpath.trim(),
      is_active: isActive,
    };

    try {
      await api.updateRepo(repoId, payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el repo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={repoId !== null} onClose={onClose} title={`Editar repo${repo ? ` — ${repo.name}` : ''}`} size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 size={18} className="mr-2 animate-spin" /> Cargando repo...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <div className="flex items-start gap-2">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Nombre</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Rama</label>
              <input
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Rules subpath</label>
              <input
                value={rulesSubpath}
                onChange={e => setRulesSubpath(e.target.value)}
                className="w-full rounded-lg border border-a3sec-muted bg-a3sec-deeper p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            Repo activo
          </label>

          {repo && (
            <div className="rounded-xl border border-a3sec-border bg-a3sec-surface p-3 text-xs text-slate-400">
              <div className="font-semibold text-slate-300 mb-2">Datos de solo lectura</div>
              <div className="grid gap-2 md:grid-cols-2">
                <div><span className="text-slate-500">URL:</span> {repo.repo_url}</div>
                <div><span className="text-slate-500">Reglas:</span> {repo.rule_count.toLocaleString()}</div>
                <div><span className="text-slate-500">Último sync:</span> {repo.last_sync_at || '—'}</div>
                <div><span className="text-slate-500">Estado:</span> {repo.last_sync_status || '—'}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-a3sec-muted text-slate-300 hover:bg-a3sec-deeper text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-4 py-2 bg-brand-green text-a3sec-dark text-white rounded-lg hover:bg-brand-green/90 disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
              Guardar cambios
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
