import React from 'react';
import { useSleep, getSleepDuration, timeToMinutes } from '../context/SleepContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { Calendar, BarChart2, TrendingUp, Clock, AlertCircle } from 'lucide-react';

export const SleepAnalytics: React.FC = () => {
  const { logs, settings } = useSleep();

  // If no logs, show empty state
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 text-slate-400">
        <BarChart2 className="w-16 h-16 text-slate-700 stroke-[1.5]" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-300">Sem dados suficientes</h2>
          <p className="text-xs text-slate-500 max-w-[250px] mx-auto leading-relaxed">
            Registre algumas noites para ver análises detalhadas de tendências, regularidade e desvios.
          </p>
        </div>
      </div>
    );
  }

  // Get last 7 logs in chronological order
  const last7Logs = [...logs].slice(0, 7).reverse();

  // 1. Duration Chart Data
  const durationData = last7Logs.map((log) => {
    const formattedDate = new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    }).replace('.','');
    return {
      name: formattedDate,
      Duração: getSleepDuration(log.bedtime, log.wakeTime),
      Qualidade: log.sleepQuality,
    };
  });

  // 2. Bedtime/Wake time Chart Data
  // To chart bedtime/wake time on a numerical axis, we'll convert times to hours (e.g. "23:30" = 23.5)
  // For bedtimes after midnight (e.g. "01:30"), we'll treat them as hours past 24 (24 + 1.5 = 25.5)
  // so that they display continuously relative to late evenings.
  const timeData = last7Logs.map((log) => {
    const formattedDate = new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    }).replace('.','');
    
    let bedMins = timeToMinutes(log.bedtime);
    let wakeMins = timeToMinutes(log.wakeTime);
    
    // If bedtime is early morning (e.g. between 00:00 and 12:00), we add 1440 mins (24h) to position it after midnight
    if (bedMins < 720) {
      bedMins += 1440;
    }
    
    // Also, if wakeTime is less than bedtime in absolute terms, add 1440 to represent next morning
    if (wakeMins < bedMins - 720) {
      wakeMins += 1440;
    }

    return {
      name: formattedDate,
      Dormiu: bedMins / 60, // hour decimal
      Acordou: wakeMins / 60, // hour decimal
      bedtimeStr: log.bedtime,
      wakeTimeStr: log.wakeTime,
    };
  });

  // Custom tooltips
  const CustomDurationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/90 border border-white/10 px-3 py-2 rounded-xl text-xs space-y-1 backdrop-blur shadow-xl">
          <p className="font-bold text-slate-200">{payload[0].payload.name}</p>
          <p className="text-violet-400">Duração: {payload[0].value.toFixed(1)} horas</p>
          <p className="text-amber-400">Qualidade: {payload[0].payload.Qualidade}/5</p>
        </div>
      );
    }
    return null;
  };

  const CustomTimeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { bedtimeStr, wakeTimeStr } = payload[0].payload;
      return (
        <div className="bg-slate-950/90 border border-white/10 px-3 py-2 rounded-xl text-xs space-y-1 backdrop-blur shadow-xl">
          <p className="font-bold text-slate-200">{payload[0].payload.name}</p>
          <p className="text-violet-400">Dormiu às: {bedtimeStr}</p>
          <p className="text-amber-400">Acordou às: {wakeTimeStr}</p>
        </div>
      );
    }
    return null;
  };

  // 3. Weekday vs Weekend Comparison
  const weekdayLogs = logs.filter((log) => {
    const day = new Date(log.date + 'T12:00:00').getDay();
    return day !== 0 && day !== 6; // Mon-Fri
  });
  const weekendLogs = logs.filter((log) => {
    const day = new Date(log.date + 'T12:00:00').getDay();
    return day === 0 || day === 6; // Sat-Sun
  });

  const getAvgDuration = (logArray: typeof logs) => {
    if (logArray.length === 0) return 0;
    const total = logArray.reduce((acc, log) => acc + getSleepDuration(log.bedtime, log.wakeTime), 0);
    return total / logArray.length;
  };

  const avgWeekday = getAvgDuration(weekdayLogs);
  const avgWeekend = getAvgDuration(weekendLogs);

  // 4. Custom Heatmap logic (last 28 days)
  const renderHeatmap = () => {
    const today = new Date();
    const cells = [];
    
    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const log = logs.find((l) => l.date === dateStr);
      
      let colorClass = 'bg-slate-800 border-transparent';
      let titleText = `${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}: Sem registro`;

      if (log) {
        const duration = getSleepDuration(log.bedtime, log.wakeTime);
        titleText = `${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}: ${duration.toFixed(1)}h, Qualidade ${log.sleepQuality}/5`;

        // Classification
        const isDurationGood = duration >= settings.sleepDurationGoal - 0.5;
        const isQualityGood = log.sleepQuality >= 4;
        const isAwakeningsBad = log.nightAwakenings.length >= 3;

        if (isDurationGood && isQualityGood && !isAwakeningsBad) {
          colorClass = 'bg-emerald-500/80 border-emerald-400 shadow-sm shadow-emerald-500/10'; // Good
        } else if (log.sleepQuality <= 2 || isAwakeningsBad || duration < 5) {
          colorClass = 'bg-rose-500/80 border-rose-400 shadow-sm shadow-rose-500/10'; // Bad
        } else {
          colorClass = 'bg-amber-500/80 border-amber-400 shadow-sm shadow-amber-500/10'; // Warning/Medium
        }
      }

      cells.push(
        <div
          key={dateStr}
          className={`w-6 h-6 md:w-9 md:h-9 rounded-md border text-[8px] md:text-[10px] font-bold flex items-center justify-center select-none text-slate-900/60 transition-all hover:scale-110 ${colorClass}`}
          title={titleText}
        >
          {date.getDate()}
        </div>
      );
    }

    return (
      <div className="space-y-3 p-4 md:p-6 rounded-2xl border border-white/5 bg-slate-900/30">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold flex items-center gap-1.5"><Calendar className="w-4 h-4 text-violet-400" /> Heatmap de Consistência</span>
          <span className="text-[10px] text-slate-500">Últimos 28 dias</span>
        </div>
        <div className="grid grid-cols-7 gap-2 md:gap-3 justify-items-center">
          {cells}
        </div>
        {/* Heatmap Legend */}
        <div className="flex justify-center gap-4 pt-1 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500/80" /> <span>Bom</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-amber-500/80" /> <span>Médio</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-rose-500/80" /> <span>Ajustar</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-slate-800" /> <span>Sem registro</span>
          </div>
        </div>
      </div>
    );
  };

  // Helper formats decimal hours back to time e.g., 23.5 -> "23:30"
  const hourToTimeFormatter = (value: number) => {
    const normalizedVal = value % 24;
    const hours = Math.floor(normalizedVal);
    const minutes = Math.round((normalizedVal - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-24 text-slate-200">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent">
          Análise e Tendências
        </h1>
        <p className="text-xs text-slate-400">Métricas visuais do seu comportamento de sono.</p>
      </div>

      {/* Heatmap */}
      {renderHeatmap()}

      {/* Charts Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sleep Duration Trend Chart */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/30 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-violet-400" /> Horas de Sono por Noite
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ left: -30, right: 10, top: 10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 12]} />
                <Tooltip content={<CustomDurationTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <ReferenceLine y={settings.sleepDurationGoal} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Meta: ${settings.sleepDurationGoal}h`, fill: '#10b981', fontSize: 9, position: 'insideTopLeft' }} />
                <Bar dataKey="Duração" fill="url(#durationColor)" radius={[4, 4, 0, 0]}>
                  <defs>
                    <linearGradient id="durationColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sleep Schedule Consistency Chart */}
        <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/30 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Janela de Dormir & Acordar
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[20, 34]} // from 8 PM to 10 AM (next morning represented as hours 24+)
                  tickFormatter={hourToTimeFormatter}
                />
                <Tooltip content={<CustomTimeTooltip />} />
                
                {/* Target Bedtime Reference Area */}
                <ReferenceLine y={timeToMinutes(settings.targetBedtimeStart) / 60} stroke="#6366f1" strokeOpacity={0.3} strokeDasharray="3 3" />
                <ReferenceLine y={timeToMinutes(settings.targetBedtimeEnd) / 60} stroke="#6366f1" strokeOpacity={0.3} strokeDasharray="3 3" />
                
                {/* Target Wake time Reference Area */}
                <ReferenceLine y={timeToMinutes(settings.targetWakeTimeStart) / 60} stroke="#f59e0b" strokeOpacity={0.3} strokeDasharray="3 3" />
                <ReferenceLine y={timeToMinutes(settings.targetWakeTimeEnd) / 60} stroke="#f59e0b" strokeOpacity={0.3} strokeDasharray="3 3" />

                <Area type="monotone" dataKey="Dormiu" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0.1} fill="url(#bedtimeGradient)" />
                <Area type="monotone" dataKey="Acordou" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.1} fill="url(#waketimeGradient)" />
                <defs>
                  <linearGradient id="bedtimeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="waketimeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Advisory & Comparison Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Stats columns */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/30 flex flex-col justify-center text-center">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Dias Úteis</span>
            <div className="text-2xl font-extrabold text-violet-400">
              {weekdayLogs.length > 0 ? `${avgWeekday.toFixed(1)}h` : '--'}
            </div>
            <span className="text-[9px] text-slate-500">Média (Seg-Sex)</span>
          </div>

          <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/30 flex flex-col justify-center text-center">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Fim de Semana</span>
            <div className="text-2xl font-extrabold text-amber-400">
              {weekendLogs.length > 0 ? `${avgWeekend.toFixed(1)}h` : '--'}
            </div>
            <span className="text-[9px] text-slate-500">Média (Sáb-Dom)</span>
          </div>
        </div>

        {/* Dynamic jetlag indicator card */}
        <div className="lg:col-span-1">
          {Math.abs(avgWeekend - avgWeekday) > 1.5 ? (
            <div className="p-4 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] flex items-start gap-3 h-full">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-rose-400">Descompensação de Fim de Semana</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Você está dormindo cerca de {(avgWeekend - avgWeekday).toFixed(1)}h mais nos finais de semana. Esta grande variação pode dificultar a regularização biológica (social jetlag).
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] flex items-start gap-3 h-full">
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-emerald-400">Excelente consistência</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  A diferença de duração do seu sono entre dias úteis e finais de semana está sob controle ({Math.abs(avgWeekend - avgWeekday).toFixed(1)}h). Isso ajuda a sincronizar seu relógio biológico.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
