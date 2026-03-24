import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shield } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.login(email, password);
      login(response.user);
      window.location.hash = '#/dashboard';
    } catch (err: any) {
      setError('Invalid credentials or server error.');
    }
  };

  return (
    <div className="min-h-screen bg-a3sec-deeper flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-a3sec-dark rounded-2xl shadow-xl overflow-hidden border border-a3sec-border">
        <div className="p-8 text-center bg-a3sec-surface border-b border-a3sec-border">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-green/15 mb-4">
             <h1 className="text-brand-green text-4xl font-bold tracking-tight">3</h1>
           </div>
           <h2 className="text-2xl font-bold text-white">DaC SM</h2>
           <p className="text-slate-400 mt-2">Sign in to access the platform</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && <div className="p-3 bg-brand-red/15 text-brand-red text-sm rounded-lg border border-brand-red/20">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-2 bg-a3sec-surface border border-a3sec-border rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-green focus:border-brand-green focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 bg-a3sec-surface border border-a3sec-border rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-green focus:border-brand-green focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-brand-green text-a3sec-dark py-3 rounded-lg font-semibold hover:bg-brand-green/90 transition-colors"
          >
            Sign In
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <div className="text-center mt-3">
              <button type="button" onClick={() => (window.location.hash = '#/reset-password')} className="text-sm text-slate-500 underline">Forgot password?</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};