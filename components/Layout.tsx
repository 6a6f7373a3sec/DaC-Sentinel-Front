import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LayoutDashboard, Search, FileCode, Grid3X3, Settings, Menu, X, LogOut, User as UserIcon, Repeat2, Building2 } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const NavItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
  <a
    href={href}
    className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-colors ${
      active
        ? 'bg-brand-green/15 text-brand-green shadow-md border border-brand-green/20'
        : 'text-slate-400 hover:bg-a3sec-surface hover:text-white'
    }`}
  >
    <Icon size={20} className="mr-3" />
    <span className="font-medium">{label}</span>
  </a>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const currentPath = window.location.hash;

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-a3sec-deeper overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-a3sec-dark text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
         <div className="flex items-center justify-between p-6 h-16 border-b border-a3sec-border">
          <div className="flex items-center space-x-2">
            <h1 className="text-brand-green text-3xl font-bold tracking-tight">3</h1>
            <span className="text-xl font-bold tracking-tight">DaC SM
</span>
          </div>
          <button className="lg:hidden text-slate-400" onClick={toggleSidebar}>
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)] border-r border-a3sec-border">
          <NavItem href="#/dashboard" icon={LayoutDashboard} label="Dashboard" active={currentPath === '#/dashboard' || currentPath === ''} />
          <NavItem href="#/rules" icon={Search} label="Buscar reglas" active={currentPath === '#/rules'} />
          <NavItem href="#/generator" icon={FileCode} label="Generador de Reglas" active={currentPath === '#/generator'} />
          <NavItem href="#/mitre" icon={Grid3X3} label="Matriz MITRE" active={currentPath === '#/mitre'} />
          <NavItem href="#/converter" icon={Repeat2} label="Sigma Converter" active={currentPath === '#/converter'} />
          <NavItem href="#/clients" icon={Building2} label="Clientes" active={currentPath === '#/clients'} />
          
          {user?.roles.includes(UserRole.ADMIN) && (
             <NavItem href="#/admin" icon={Settings} label="Administración" active={currentPath === '#/admin'} />
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-a3sec-surface border-b border-a3sec-border flex items-center justify-between px-6 z-10">
          <button className="lg:hidden p-2 -ml-2 text-slate-400 hover:bg-a3sec-dark rounded-md" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          
          <div className="flex-1" /> {/* Spacer */}

          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                window.location.hash = '#/change-password';
                setSidebarOpen(false);
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                currentPath === '#/change-password'
                  ? 'border-brand-green/30 bg-brand-green/15 text-brand-green'
                  : 'border-a3sec-border text-slate-300 hover:border-brand-green/30 hover:bg-brand-green/10 hover:text-white'
              }`}
              title="Cambiar contraseña"
            >
              <Shield size={16} />
              <span className="hidden sm:inline">Cambiar contraseña</span>
            </button>
            <div className="flex flex-col items-end mr-2">
              <span className="text-sm font-semibold text-white">{user?.name}</span>
              <span className="text-xs text-slate-400">{user?.roles.join(', ')}</span>
            </div>
            <div className="h-8 w-8 bg-brand-green/15 text-brand-green rounded-full flex items-center justify-center">
              <UserIcon size={18} />
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-brand-red hover:bg-brand-red/10 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-a3sec-deeper">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
