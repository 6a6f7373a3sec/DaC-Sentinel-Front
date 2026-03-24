import React, { useState } from 'react';
import { api } from '../services/api';
import { Shield } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.devResetPassword(email, password);
      setSuccess('Password reset successfully. You can now sign in.');
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    }
  };

  return (
    <div className="min-h-screen bg-a3sec-deeper flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-a3sec-dark rounded-2xl shadow-xl overflow-hidden border border-a3sec-border">
        <div className="p-8 text-center bg-a3sec-surface border-b border-a3sec-border">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-green/15 mb-4">
             <Shield className="text-brand-green" size={32} />
           </div>
           <h2 className="text-2xl font-bold text-white">Reset Password</h2>
           <p className="text-slate-400 mt-2">Dev-only direct reset (backend must allow)</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && <div className="p-3 bg-brand-red/15 text-brand-red text-sm rounded-lg border border-brand-red/20">{error}</div>}
          {success && <div className="p-3 bg-brand-green/15 text-brand-green text-sm rounded-lg border border-brand-green/20">{success}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-2 bg-a3sec-surface border border-a3sec-border rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-green focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
            <input 
              type="password" 
              required
              minLength={8}
              className="w-full px-4 py-2 bg-a3sec-surface border border-a3sec-border rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-green focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <button 
              type="submit" 
              className="bg-brand-green text-a3sec-dark py-2 px-4 rounded-lg font-semibold hover:bg-brand-green/90 transition-colors"
            >
              Reset Password
            </button>
            <button type="button" className="text-sm text-slate-400 underline" onClick={() => (window.location.hash = '#/login')}>Back to login</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
