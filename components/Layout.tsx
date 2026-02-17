import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LayoutDashboard, Search, FileCode, Grid3X3, Settings, Menu, X, LogOut, User as UserIcon, Repeat2 } from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const NavItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
  <a
    href={href}
    className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 h-16 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Shield className="text-blue-500" size={28} />
            <span className="text-xl font-bold tracking-tight">DaC Sentinel</span>
          </div>
          <button className="lg:hidden text-slate-400" onClick={toggleSidebar}>
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          <NavItem href="#/dashboard" icon={LayoutDashboard} label="Dashboard" active={currentPath === '#/dashboard' || currentPath === ''} />
          <NavItem href="#/rules" icon={Search} label="Buscar reglas" active={currentPath === '#/rules'} />
          <NavItem href="#/generator" icon={FileCode} label="Generador de Reglas" active={currentPath === '#/generator'} />
          <NavItem href="#/mitre" icon={Grid3X3} label="Matriz MITRE" active={currentPath === '#/mitre'} />
          <NavItem href="#/converter" icon={Repeat2} label="Sigma Converter" active={currentPath === '#/converter'} />
          
          {user?.roles.includes(UserRole.ADMIN) && (
             <NavItem href="#/admin" icon={Settings} label="Administración" active={currentPath === '#/admin'} />
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <button className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          
          <div className="flex-1" /> {/* Spacer */}

          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-sm font-semibold text-slate-900">{user?.name}</span>
              <span className="text-xs text-slate-500">{user?.roles.join(', ')}</span>
            </div>
            <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <UserIcon size={18} />
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};