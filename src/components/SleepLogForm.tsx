import React, { useState, useEffect } from 'react';
import { useSleep } from '../context/SleepContext';
import type { Awakening, SleepLog } from '../context/SleepContext';
import { Star, Plus, Trash2, Calendar, Moon, Sunrise, Check, AlertCircle } from 'lucide-react';

interface SleepLogFormProps {
  onSuccess: () => void;
  initialDate?: string;
}

export const SleepLogForm: React.FC<SleepLogFormProps> = ({ onSuccess, initialDate }) => {
  const { logs, addLog } = useSleep();

  // Get current date string in local timezone (YYYY-MM-DD)
  const getLocalDateString = () => {
    const d = new Date();
    // adjust to user timezone
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(initialDate || getLocalDateString());
  const [bedtime, setBedtime] = useState('23:15');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepQuality, setSleepQuality] = useState<number>(4);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [awakenings, setAwakenings] = useState<Awakening[]>([]);
  
  // States for adding a new awakening
  const [newAwakeningTime, setNewAwakeningTime] = useState('03:00');
  const [newAwakeningDuration, setNewAwakeningDuration] = useState<number>(10);

  // If date changes, check if there's already a log for this date and pre-populate
  useEffect(() => {
    const existingLog = logs.find((l) => l.date === date);
    if (existingLog) {
      setBedtime(existingLog.bedtime);
      setWakeTime(existingLog.wakeTime);
      setSleepQuality(existingLog.sleepQuality);
      setNotes(existingLog.notes);
      setTags(existingLog.tags);
      setAwakenings(existingLog.nightAwakenings);
    } else {
      // Reset to defaults
      setBedtime('23:15');
      setWakeTime('07:00');
      setSleepQuality(4);
      setNotes('');
      setTags([]);
      setAwakenings([]);
    }
  }, [date, logs]);

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const addAwakening = () => {
    if (!newAwakeningTime || newAwakeningDuration <= 0) return;
    
    const newAwakening: Awakening = {
      id: crypto.randomUUID(),
      time: newAwakeningTime,
      durationMinutes: newAwakeningDuration,
    };
    
    setAwakenings([...awakenings, newAwakening].sort((a, b) => a.time.localeCompare(b.time)));
    // Reset inputs
    setNewAwakeningDuration(10);
  };

  const removeAwakening = (id: string) => {
    setAwakenings(awakenings.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const log: SleepLog = {
      date,
      bedtime,
      wakeTime,
      sleepQuality,
      nightAwakenings: awakenings,
      notes,
      tags,
      source: 'manual',
    };
    
    addLog(log);
    onSuccess();
  };

  const availableTags = [
    { value: 'Caffeine late', label: '☕ Cafeína tarde' },
    { value: 'Late workout', label: '💪 Treino à noite' },
    { value: 'Late screen', label: '📱 Tela até tarde' },
    { value: 'Stress', label: '🤯 Estresse' },
    { value: 'Alcohol', label: '🍺 Bebida alcoólica' },
    { value: 'Heavy meal', label: '🍕 Refeição pesada' },
  ];

  const hasExistingLog = logs.some((l) => l.date === date);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28 text-slate-200">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent">
          {hasExistingLog ? 'Editar Registro' : 'Registrar Sono'}
        </h1>
        <p className="text-xs text-slate-400">
          {hasExistingLog
            ? 'Já existe um registro para esta data. Salvar irá atualizá-lo.'
            : 'Insira os dados da sua última noite.'}
        </p>
      </div>

      {/* Grid split on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Date, Sleep Window, Quality */}
        <div className="space-y-6">
          
          {/* Date Select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-violet-400" /> Data do Acordar
            </label>
            <input
              type="date"
              value={date}
              max={getLocalDateString()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-white/5 bg-slate-900/60 text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
              required
            />
            {hasExistingLog && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Nota: Você está editando uma noite já salva.</span>
              </div>
            )}
          </div>

          {/* Bedtime & Wake up */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Moon className="w-3.5 h-3.5 text-violet-400" /> Hora de Dormir
              </label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-white/5 bg-slate-900/60 text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sunrise className="w-3.5 h-3.5 text-amber-400" /> Hora de Acordar
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-white/5 bg-slate-900/60 text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Sleep Quality */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Qualidade Percebida do Sono
            </label>
            <div className="flex justify-between items-center bg-slate-900/40 p-3 rounded-2xl border border-white/5">
              <span className="text-xs text-slate-400">
                {sleepQuality === 1 && 'Péssimo 😣'}
                {sleepQuality === 2 && 'Ruim 🥱'}
                {sleepQuality === 3 && 'Regular 😐'}
                {sleepQuality === 4 && 'Bom 🙂'}
                {sleepQuality === 5 && 'Excelente! ✨'}
              </span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setSleepQuality(stars)}
                    className="p-1 text-slate-600 hover:scale-110 active:scale-95 transition-all focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        stars <= sleepQuality
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Awakenings, Factors, Notes */}
        <div className="space-y-6">
          
          {/* Night Awakenings */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Despertares no meio da noite (se houver)
            </label>

            {/* Existing Awakenings List */}
            {awakenings.length > 0 && (
              <div className="space-y-2">
                {awakenings.map((awk) => (
                  <div
                    key={awk.id}
                    className="flex items-center justify-between px-4 py-2 rounded-xl bg-slate-900/60 border border-white/5"
                  >
                    <div className="text-xs">
                      <span className="font-semibold text-violet-400 mr-2">{awk.time}</span>
                      <span className="text-slate-300">Acordado por {awk.durationMinutes} min</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAwakening(awk.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Awakening Subform */}
            <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/30 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Adicionar despertar
              </span>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">Horário</span>
                  <input
                    type="time"
                    value={newAwakeningTime}
                    onChange={(e) => setNewAwakeningTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-white/5 bg-slate-950/60 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">Duração (min)</span>
                  <input
                    type="number"
                    value={newAwakeningDuration}
                    min="1"
                    onChange={(e) => setNewAwakeningDuration(parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-lg border border-white/5 bg-slate-950/60 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addAwakening}
                className="w-full h-9 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/5 active:scale-98 transition-all text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Despertar
              </button>
            </div>
          </div>

          {/* Factors / Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Fatores que podem ter influenciado o sono
            </label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {availableTags.map((tag) => {
                const active = tags.includes(tag.value);
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={`h-11 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      active
                        ? 'bg-violet-600/10 border-violet-500 text-violet-300'
                        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Notas adicionais
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Como se sentiu ao acordar, se teve algum sonho marcante, etc..."
              rows={3}
              className="w-full p-4 rounded-xl border border-white/5 bg-slate-900/60 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm resize-none"
            />
          </div>

        </div>

      </div>

      {/* Submit / Cancel Buttons */}
      <div className="flex gap-3 pt-4 border-t border-white/5">
        <button
          type="submit"
          className="flex-1 h-12 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 transition-all text-white font-semibold text-sm shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2"
        >
          Salvar Registro
        </button>
      </div>
    </form>
  );
};
