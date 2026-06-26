import React from 'react';
import { useSleep, getSleepDuration } from '../context/SleepContext';
import { Shield, AlertTriangle, Moon, Sunrise, Clock, Star, Plus, CheckCircle, RefreshCw } from 'lucide-react';

interface DashboardProps {
  onLogClick: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogClick }) => {
  const { logs, getAnalytics } = useSleep();
  const analytics = getAnalytics();
  const lastNight = logs[0];

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'stable':
        return {
          label: 'Estável',
          color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
          icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
          desc: 'Sua rotina de sono está excelente e consistente. Continue assim!',
        };
      case 'recovering':
        return {
          label: 'Em Recuperação',
          color: 'text-sky-400 border-sky-500/20 bg-sky-500/5',
          icon: <RefreshCw className="w-5 h-5 text-sky-400 animate-spin-slow" />,
          desc: 'Sua consistência está melhorando em relação ao padrão anterior. Continue firme!',
        };
      case 'mild_deviation':
        return {
          label: 'Desvio Leve',
          color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          desc: 'Alguns desvios nos horários. Tente manter horários mais fixos para dormir e acordar.',
        };
      case 'disrupted':
      default:
        return {
          label: 'Desregulado',
          color: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
          icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
          desc: 'Sua rotina está bastante fora do padrão ideal. Priorize regularizar o horário de acordar e evite telas antes de dormir.',
        };
    }
  };

  const status = getStatusDetails(analytics.currentStatus);

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'stroke-emerald-500';
    if (score >= 60) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  const strokeDashoffset = 414.7 - (414.7 * analytics.stabilityScore) / 100;

  return (
    <div className="space-y-6 pb-24 text-slate-200">
      {/* Top Banner - Welcome & Quick Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent">
            SleepRoutine
          </h1>
          <p className="text-xs text-slate-400 font-medium">Como está sua rotina de sono hoje?</p>
        </div>
        <button
          onClick={onLogClick}
          className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all text-white shadow-lg shadow-violet-600/25"
        >
          <Plus className="w-4 h-4" /> Registrar
        </button>
      </div>

      {/* Desktop Responsive Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Stability Ring and Alerts */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Stability Gauge */}
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-slate-900/60 to-slate-950/60 p-6 backdrop-blur-xl shadow-xl">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Radial progress ring */}
              <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 176 176">
                  <circle
                    cx="88"
                    cy="88"
                    r="66"
                    className="stroke-slate-800"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="66"
                    className={`${getScoreColor(analytics.stabilityScore)} transition-all duration-1000 ease-out`}
                    strokeWidth="12"
                    strokeDasharray="414.7"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold tracking-tight text-white leading-none">
                    {analytics.stabilityScore}
                  </span>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">
                    Estabilidade
                  </span>
                </div>
              </div>

              {/* Status info */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </div>
                </div>
                <h2 className="text-base font-semibold text-slate-100">
                  Score de Consistência
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {status.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Alerts Section (placed on Left on Desktop) */}
          {analytics.alerts.length > 0 && (
            <div className="rounded-3xl border border-amber-500/15 bg-amber-500/[0.02] p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-semibold">Alertas de Rotina</h3>
              </div>
              <ul className="space-y-2.5">
                {analytics.alerts.map((alert, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-slate-300 pl-3 border-l border-amber-500/30 leading-relaxed"
                  >
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Quick Stats & Last Night Summary */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Horário de Dormir</span>
                <Moon className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {logs.length > 0 ? analytics.averageBedtime : '--:--'}
              </div>
              <span className="text-[10px] text-slate-500">Média recente</span>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Horário de Acordar</span>
                <Sunrise className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {logs.length > 0 ? analytics.averageWakeTime : '--:--'}
              </div>
              <span className="text-[10px] text-slate-500">Média recente</span>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Duração Média</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-slate-100">
                {logs.length > 0 ? `${analytics.averageDuration.toFixed(1)}h` : '--'}
              </div>
              <span className="text-[10px] text-slate-500">Meta: {analytics.averageDuration >= 7.5 ? 'Atingida ✨' : `${7.5 - analytics.averageDuration < 0 ? '' : 'Falta ' + (7.5 - analytics.averageDuration).toFixed(1) + 'h'}`}</span>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Débito de Sono</span>
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div className={`text-xl font-bold ${analytics.sleepDebt > 5 ? 'text-rose-400' : 'text-slate-100'}`}>
                {logs.length > 0 ? `${analytics.sleepDebt.toFixed(1)}h` : '--'}
              </div>
              <span className="text-[10px] text-slate-500">Acumulado na semana</span>
            </div>
          </div>

          {/* Last Night Summary Card */}
          {lastNight && (
            <div className="rounded-3xl border border-white/5 bg-slate-900/30 p-6 space-y-4 shadow-lg">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Última Noite ({new Date(lastNight.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })})
              </h3>
              
              <div className="flex justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="text-xl font-extrabold text-slate-200">
                    {getSleepDuration(lastNight.bedtime, lastNight.wakeTime).toFixed(1)} horas de sono
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5">{lastNight.bedtime}</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5">{lastNight.wakeTime}</span>
                  </div>
                </div>
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < lastNight.sleepQuality
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Awakenings indicator */}
              {lastNight.nightAwakenings.length > 0 && (
                <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/10 rounded-xl p-3 flex items-center gap-2">
                  <Moon className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>{lastNight.nightAwakenings.length} despertares</strong> registrados (total: <strong>{lastNight.nightAwakenings.reduce((acc, a) => acc + a.durationMinutes, 0)} min</strong> acordado)
                  </span>
                </div>
              )}

              {/* Tags */}
              {lastNight.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Fatores Relevantes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {lastNight.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700/50"
                      >
                        {tag === 'Caffeine late' ? '☕ Cafeína tarde' :
                         tag === 'Late workout' ? '💪 Treino tarde' :
                         tag === 'Late screen' ? '📱 Tela tarde' :
                         tag === 'Stress' ? '🤯 Estresse' :
                         tag === 'Alcohol' ? '🍺 Álcool' :
                         tag === 'Heavy meal' ? '🍕 Refeição pesada' : tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {lastNight.notes && (
                <div className="space-y-1.5 border-t border-white/5 pt-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Comentários</span>
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    "{lastNight.notes}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
