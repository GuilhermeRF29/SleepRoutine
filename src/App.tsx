import React, { useState } from 'react';
import { SleepProvider } from './context/SleepContext';
import { Dashboard } from './components/Dashboard';
import { SleepLogForm } from './components/SleepLogForm';
import { SleepHistory } from './components/SleepHistory';
import { SleepAnalytics } from './components/SleepAnalytics';
import { Settings } from './components/Settings';
import { Home, Plus, Calendar, BarChart2, Settings as SettingsIcon } from 'lucide-react';

type Tab = 'dashboard' | 'log' | 'history' | 'analytics' | 'settings';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [editDate, setEditDate] = useState<string | undefined>(undefined);

  const handleEditLog = (date: string) => {
    setEditDate(date);
    setActiveTab('log');
  };

  const handleLogSuccess = () => {
    setActiveTab('dashboard');
    setEditDate(undefined);
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onLogClick={() => setActiveTab('log')} />;
      case 'log':
        return <SleepLogForm onSuccess={handleLogSuccess} initialDate={editDate} />;
      case 'history':
        return <SleepHistory onEditLog={handleEditLog} />;
      case 'analytics':
        return <SleepAnalytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onLogClick={() => setActiveTab('log')} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex md:flex-row flex-col selection:bg-violet-600/30 font-sans">
      {/* Glow Effects - Desktop uses a wider center blur, mobile uses constrained */}
      <div className="fixed top-0 left-0 md:left-64 right-0 h-80 bg-gradient-to-b from-indigo-900/10 to-transparent rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Sidebar Navigation - Visible on Desktop, Hidden on Mobile */}
      <aside className="hidden md:flex flex-col w-64 bg-[#090d20]/80 border-r border-white/[0.03] backdrop-blur-lg fixed top-0 bottom-0 left-0 z-30 p-6 space-y-8 select-none">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent flex items-center gap-2">
            <span>✨</span> SleepRoutine
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Consistency Tracker</p>
        </div>

        <nav className="flex-1 space-y-1.5">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setEditDate(undefined);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-violet-600/15 text-violet-400 border border-violet-500/10'
                : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent'
            }`}
          >
            <Home className="w-4.5 h-4.5" />
            <span>Painel</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              setEditDate(undefined);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-violet-600/15 text-violet-400 border border-violet-500/10'
                : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent'
            }`}
          >
            <Calendar className="w-4.5 h-4.5" />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('log');
              setEditDate(undefined);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'log'
                ? 'bg-violet-600/15 text-violet-400 border border-violet-500/10'
                : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent'
            }`}
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Registrar Sono</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('analytics');
              setEditDate(undefined);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-violet-600/15 text-violet-400 border border-violet-500/10'
                : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent'
            }`}
          >
            <BarChart2 className="w-4.5 h-4.5" />
            <span>Análises</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              setEditDate(undefined);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-violet-600/15 text-violet-400 border border-violet-500/10'
                : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent'
            }`}
          >
            <SettingsIcon className="w-4.5 h-4.5" />
            <span>Ajustes</span>
          </button>
        </nav>

        <div className="text-[10px] text-slate-600 text-center border-t border-white/[0.02] pt-4">
          v1.0.0 — Local First
        </div>
      </aside>

      {/* Main Container - Responsive widths */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col z-10 relative">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 pb-20 md:pb-8 flex-1 flex flex-col">
          {renderActiveComponent()}
        </div>

        {/* Floating/Sticky Bottom Nav Bar - Only visible on Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#090d20]/95 border-t border-white/[0.04] backdrop-blur-lg flex justify-around items-center h-16 px-4 z-50">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setEditDate(undefined);
            }}
            className={`flex flex-col items-center justify-center gap-1 w-12 h-12 transition-all ${
              activeTab === 'dashboard' ? 'text-violet-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Início</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              setEditDate(undefined);
            }}
            className={`flex flex-col items-center justify-center gap-1 w-12 h-12 transition-all ${
              activeTab === 'history' ? 'text-violet-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Histórico</span>
          </button>

          {/* Central Log Button */}
          <button
            onClick={() => {
              setActiveTab('log');
              setEditDate(undefined);
            }}
            className={`flex items-center justify-center w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 hover:scale-105 active:scale-95 transition-all text-white shadow-lg shadow-violet-600/30 -mt-6 border-4 border-[#070b19]`}
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            onClick={() => {
              setActiveTab('analytics');
              setEditDate(undefined);
            }}
            className={`flex flex-col items-center justify-center gap-1 w-12 h-12 transition-all ${
              activeTab === 'analytics' ? 'text-violet-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Análises</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              setEditDate(undefined);
            }}
            className={`flex flex-col items-center justify-center gap-1 w-12 h-12 transition-all ${
              activeTab === 'settings' ? 'text-violet-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Ajustes</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

function App() {
  return (
    <SleepProvider>
      <AppContent />
    </SleepProvider>
  );
}

export default App;
