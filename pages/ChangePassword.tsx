import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { AUTH_LOGIN_FLASH_KEY } from '../constants';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../services/api';

export const ChangePassword: React.FC = () => {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const clearSensitiveFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser distinta de la actual.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.changePassword(currentPassword, newPassword);

      if (response.reauth_required) {
        sessionStorage.setItem(
          AUTH_LOGIN_FLASH_KEY,
          response.message || 'Contraseña actualizada. Iniciá sesión nuevamente.'
        );
        clearSensitiveFields();
        logout();
        return;
      }

      clearSensitiveFields();
      setSuccess(response.message || 'Contraseña actualizada correctamente.');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          sessionStorage.setItem(
            AUTH_LOGIN_FLASH_KEY,
            'Tu sesión expiró. Iniciá sesión nuevamente para continuar.'
          );
          logout();
          return;
        } else {
          setError(err.message || 'No se pudo cambiar la contraseña.');
        }
      } else if (err instanceof Error) {
        setError(err.message || 'No se pudo cambiar la contraseña.');
      } else {
        setError('No se pudo cambiar la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cambiar contraseña</h1>
        <p className="mt-2 text-sm text-slate-400">
          Actualizá tu contraseña sin depender de un administrador.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-a3sec-border bg-a3sec-dark shadow-xl">
        <div className="border-b border-a3sec-border bg-a3sec-surface p-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/15">
            <Shield className="text-brand-green" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Seguridad de la cuenta</h2>
          <p className="mt-2 text-slate-400">
            Ingresá tu contraseña actual y definí una nueva contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-8">
          {success && (
            <div className="rounded-lg border border-brand-green/20 bg-brand-green/15 p-3 text-sm text-brand-green">
              {success}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-brand-red/20 bg-brand-red/15 p-3 text-sm text-brand-red">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Contraseña actual</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-a3sec-border bg-a3sec-surface px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Nueva contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-a3sec-border bg-a3sec-surface px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Confirmar nueva contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-a3sec-border bg-a3sec-surface px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-green"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-green px-4 py-2 font-semibold text-a3sec-dark transition-colors hover:bg-brand-green/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                window.location.hash = '#/dashboard';
              }}
              className="text-sm text-slate-400 underline"
              disabled={loading}
            >
              Volver al dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
