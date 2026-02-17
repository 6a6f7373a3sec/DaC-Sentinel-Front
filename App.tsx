import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { RuleSearch } from './pages/RuleSearch';
import { RuleGenerator } from './pages/RuleGenerator';
import { MitreMatrix } from './pages/MitreMatrix';
import { SigmaConverter } from './pages/SigmaConverter';
import { AdminPanel } from './pages/Admin';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Login />;
  
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!isAuthenticated && route !== '#/login') {
    window.location.hash = '#/login';
    return <Login />;
  }

  if (route === '#/login') return <Login />;

  // Protected Routes
  return (
    <PrivateRoute>
      {route === '#/dashboard' || route === '' ? <Dashboard /> :
       route === '#/rules' ? <RuleSearch /> :
       route === '#/generator' ? <RuleGenerator /> :
       route === '#/mitre' ? <MitreMatrix /> :
       route === '#/converter' ? <SigmaConverter /> :
       route === '#/admin' ? <AdminPanel /> :
       <Dashboard />}
    </PrivateRoute>
  );
};

export default function App() {
  return <AppContent />;
}