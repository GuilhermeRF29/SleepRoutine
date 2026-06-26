import React, { useState } from 'react';
import { useSleep, getSleepDuration } from '../context/SleepContext';
import { Star, Trash2, Edit2, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface SleepHistoryProps {
  onEditLog: (date: string) => void;
}

export const SleepHistory: React.FC<SleepHistoryProps> = ({ onEditLog }) => {
  const { logs, deleteLog } = useSleep();
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  const toggleExpand = (date: string) => {
    if (expandedDates.includes(date)) {
      setExpandedDates(expandedDates.filter((d) => d !== date));
    } else {
      setExpandedDates([...expandedDates, date]);
    }
  };

  const getTagEmoji = (tag: string) => {
    switch (tag) {
      case 'Caffeine late':
        return '☕';
      case 'Late workout':
        return '💪';
      case 'Late screen':
        return '📱';
      case 'Stress':
        return '🤯';
      case 'Alcohol':
        return '🍺';
      case 'Heavy meal':
        return '🍕';
      default:
        return '🏷️';
    }
  };

  const formatDate = (dateStr: string) => {
    // Parse date ensuring local timezone interpretation
    const date = new Date(dateStr + 'T12:00:00');
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    const day = date.getDate();
    const monthYear = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    return {
      weekday: weekday.replace('.', '').toUpperCase(),
      day,
      monthYear: monthYear.replace('.', ''),
    };
  };

  const getQualityLabel = (quality: number) => {
    switch (quality) {
      case 1: return 'Péssimo';
      case 2: return 'Ruim';
      case 3: return 'Regular';
      case 4: return 'Bom';
      case 5: return 'Excelente';
      default: return '';
    }
  };

  const getMonthYearLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const month = date.toLocaleDateString('pt-BR', { month: 'long' });
    const year = date.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
  };

  const getWeekIdentifier = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    // Get Monday date of the week
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const mondayStr = monday.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' });
    const sundayStr = sunday.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' });
    
    return {
      key: monday.toISOString().split('T')[0],
      label: `Semana de ${mondayStr} a ${sundayStr}`
    };
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <Calendar className="w-16 h-16 text-slate-700 stroke-[1.5]" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-300">Nenhum registro ainda</h2>
          <p className="text-xs text-slate-500 max-w-[250px] mx-auto leading-relaxed">
            Seu histórico de noites aparecerá aqui. Use a aba de registro para adicionar sua primeira noite!
          </p>
        </div>
      </div>
    );
  }

  // Trackers to insert dividers dynamically
  let lastMonth = '';
  let lastWeekKey = '';

  return (
    <div className="space-y-4 pb-24 text-slate-200">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent">
          Histórico de Sono
        </h1>
        <p className="text-xs text-slate-400">Suas noites registradas e observações.</p>
      </div>

      <div className="space-y-3">
        {logs.map((log) => {
          const isExpanded = expandedDates.includes(log.date);
          const duration = getSleepDuration(log.bedtime, log.wakeTime);
          const dateDetails = formatDate(log.date);
          
          const monthKey = log.date.substring(0, 7); // YYYY-MM
          const week = getWeekIdentifier(log.date);
          
          let showMonthHeader = false;
          let showWeekDivider = false;
          
          if (monthKey !== lastMonth) {
            showMonthHeader = true;
            lastMonth = monthKey;
            lastWeekKey = week.key; // skip week line if month just changed
          } else if (week.key !== lastWeekKey) {
            showWeekDivider = true;
            lastWeekKey = week.key;
          }

          return (
            <React.Fragment key={log.date}>
              {showMonthHeader && (
                <div className="mt-8 mb-4 first:mt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400/90 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    {getMonthYearLabel(log.date)}
                  </h3>
                </div>
              )}

              {showWeekDivider && (
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px bg-white/[0.04] flex-1" />
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">
                    {week.label}
                  </span>
                  <div className="h-px bg-white/[0.04] flex-1" />
                </div>
              )}

              <div
                className="rounded-2xl border border-white/5 bg-slate-900/30 overflow-hidden transition-all duration-300"
              >
                {/* Header section (Always visible) */}
                <div
                  onClick={() => toggleExpand(log.date)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/40 select-none"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/10 text-center shrink-0">
                      <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wide">
                        {dateDetails.weekday}
                      </span>
                      <span className="text-sm font-extrabold text-slate-200">
                        {dateDetails.day}
                      </span>
                    </div>

                    {/* Sleep Duration & Times */}
                    <div className="space-y-0.5 min-w-[120px]">
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                        <span>{dateDetails.monthYear}</span>
                        {log.source === 'zepp' && (
                          <span className="text-[7px] px-1 py-0.25 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 uppercase tracking-wider font-semibold">
                            Zepp
                          </span>
                        )}
                        {log.source === 'fit' && (
                          <span className="text-[7px] px-1 py-0.25 rounded bg-sky-500/10 text-sky-400 border border-sky-500/10 uppercase tracking-wider font-semibold">
                            Fit
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                        <span>{duration.toFixed(1)}h de sono</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {log.bedtime} às {log.wakeTime}
                      </div>
                    </div>

                    {/* Desktop Preview (Hidden on mobile) */}
                    <div className="hidden md:flex flex-1 items-center justify-between px-4 border-l border-white/5 gap-4">
                      {/* Tags preview */}
                      <div className="flex flex-wrap gap-1 max-w-[200px] lg:max-w-[300px]">
                        {log.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/20 whitespace-nowrap"
                          >
                            {getTagEmoji(tag)}{' '}
                            {tag === 'Caffeine late' ? 'Cafeína' :
                             tag === 'Late workout' ? 'Treino' :
                             tag === 'Late screen' ? 'Tela' :
                             tag === 'Stress' ? 'Estresse' :
                             tag === 'Alcohol' ? 'Álcool' :
                             tag === 'Heavy meal' ? 'Refeição' : tag}
                          </span>
                        ))}
                        {log.tags.length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5 text-slate-500">
                            +{log.tags.length - 3}
                          </span>
                        )}
                        {log.tags.length === 0 && (
                          <span className="text-[9px] text-slate-600 italic">Sem fatores</span>
                        )}
                      </div>

                      {/* Notes preview */}
                      <div className="flex-1 max-w-[200px] lg:max-w-[300px] text-xs text-slate-500 truncate">
                        {log.notes ? `"${log.notes}"` : <span className="italic text-slate-600">Sem notas</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right metrics: Quality (Stars) + Expand Button */}
                  <div className="flex items-center gap-4 shrink-0 pl-2">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-0.5 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < log.sleepQuality ? 'fill-amber-400' : 'text-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      {log.nightAwakenings.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-semibold">
                          {log.nightAwakenings.length} {log.nightAwakenings.length === 1 ? 'despertar' : 'despertares'}
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-4 border-t border-white/5 bg-slate-900/10 space-y-4">
                    {/* Grid layout for desktop, stacked for mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Column 1: Awakenings */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Despertares Noturnos
                        </span>
                        {log.nightAwakenings.length > 0 ? (
                          <div className="grid grid-cols-1 gap-1.5">
                            {log.nightAwakenings.map((awk) => (
                              <div
                                key={awk.id}
                                className="text-xs bg-slate-950/40 p-2 rounded-lg border border-white/5 flex items-center justify-between"
                              >
                                <span className="text-amber-400 font-medium">{awk.time}</span>
                                <span className="text-slate-400">Ficou acordado por {awk.durationMinutes} min</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 italic">Nenhum despertar registrado</p>
                        )}
                      </div>

                      {/* Column 2: Tags */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Fatores da Noite
                        </span>
                        {log.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {log.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700/50 flex items-center gap-1"
                              >
                                <span>{getTagEmoji(tag)}</span>
                                <span>
                                  {tag === 'Caffeine late' ? 'Cafeína à tarde' :
                                   tag === 'Late workout' ? 'Treino à noite' :
                                   tag === 'Late screen' ? 'Tela até tarde' :
                                   tag === 'Stress' ? 'Estresse' :
                                   tag === 'Alcohol' ? 'Bebida alcoólica' :
                                   tag === 'Heavy meal' ? 'Refeição pesada' : tag}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 italic">Nenhum fator registrado</p>
                        )}
                      </div>

                      {/* Column 3: Notes */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Notas
                        </span>
                        {log.notes ? (
                          <div className="text-xs text-slate-300 bg-slate-950/20 p-3 rounded-lg border border-white/5 flex items-start gap-2 leading-relaxed">
                            <FileText className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                            <p className="break-words">{log.notes}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 italic">Sem anotações</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-500">
                      <span>Avaliação: {getQualityLabel(log.sleepQuality)}</span>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditLog(log.date)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/5 bg-slate-900/60 hover:bg-slate-800 hover:text-slate-200 transition-colors text-slate-400 font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir o registro de ' + log.date + '?')) {
                              deleteLog(log.date);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-500/10 bg-rose-500/[0.02] hover:bg-rose-500/10 hover:text-rose-400 transition-colors text-rose-500 font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
