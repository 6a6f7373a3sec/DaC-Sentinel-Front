import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MitreMatrixResponse, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { RefreshCw } from 'lucide-react';

export const MitreMatrix: React.FC = () => {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState<MitreMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      const data = await api.getMitreMatrix();
      setMatrix(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async () => {
    if (!confirm('This will trigger a background job to update MITRE definitions. Continue?')) return;
    setUpdating(true);
    try {
      await api.updateMitre();
      alert('Update job started.');
    } catch (e) {
      alert('Failed to start update');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Matrix...</div>;
  if (!matrix) return <div className="p-8 text-center text-red-500">Failed to load Matrix</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">MITRE ATT&CK Matrix</h1>
           <p className="text-sm text-slate-500">Enterprise v-{matrix.version}</p>
        </div>
        <div className="flex items-center space-x-6">
           <div className="flex items-center text-sm">
             <div className="w-3 h-3 bg-green-500 rounded mr-2"></div> Cubierta
             <div className="w-3 h-3 bg-slate-200 rounded ml-4 mr-2"></div> No cubierta
           </div>
           
           {user?.roles.includes(UserRole.ADMIN) && (
             <button 
               onClick={handleUpdate}
               disabled={updating}
               className="flex items-center px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm transition-colors"
             >
               <RefreshCw size={14} className={`mr-2 ${updating ? 'animate-spin' : ''}`} />
               {updating ? 'Updating...' : 'Sync MITRE Data'}
             </button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto border border-slate-300 rounded-lg bg-slate-50 shadow-inner custom-scrollbar">
        <div className="flex min-w-max">
          {matrix.tactics.map((tactic) => {
            const techniques = matrix.techniques_by_tactic[tactic.id] || [];
            return (
              <div key={tactic.id} className="w-48 flex-shrink-0 border-r border-slate-300 last:border-r-0">
                <div className="bg-slate-200 p-3 text-center border-b border-slate-300 sticky top-0 z-10 font-bold text-slate-800 text-sm h-16 flex items-center justify-center shadow-sm">
                  {tactic.name}
                </div>
                <div className="p-2 space-y-2">
                  {techniques.map((tech) => (
                    <div 
                      key={tech.id} 
                      className={`p-2 text-xs border rounded cursor-help hover:shadow-md transition-all ${
                        tech.rule_count > 0 
                          ? 'bg-green-100 border-green-300 text-green-900' 
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                      title={`${tech.name} (${tech.rule_count} rules)`}
                    >
                      <div className="font-semibold mb-1 truncate">{tech.name}</div>
                      {tech.rule_count > 0 && (
                        <div className="text-[10px] font-bold text-green-700">{tech.rule_count} Rules</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
