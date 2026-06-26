import React, { useState } from 'react';
import { useSleep } from '../context/SleepContext';
import type { SleepSettings, SleepLog } from '../context/SleepContext';
import { Settings as SettingsIcon, Save, Database, Trash2, Download, Upload, Check, Activity, AlertCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    clearAllData, 
    loadSampleData, 
    importLogs, 
    logs,
    syncDirName,
    connectDirectory,
    disconnectDirectory,
    syncLocalDirectory,
    isCloudConfigured,
    cloudUser,
    cloudSyncing,
    syncLogsWithCloud,
    loginCloud,
    registerCloud,
    logoutCloud
  } = useSleep();
  
  const [targetBedtimeStart, setTargetBedtimeStart] = useState(settings.targetBedtimeStart);
  const [targetBedtimeEnd, setTargetBedtimeEnd] = useState(settings.targetBedtimeEnd);
  const [targetWakeTimeStart, setTargetWakeTimeStart] = useState(settings.targetWakeTimeStart);
  const [targetWakeTimeEnd, setTargetWakeTimeEnd] = useState(settings.targetWakeTimeEnd);
  const [sleepDurationGoal, setSleepDurationGoal] = useState(settings.sleepDurationGoal);

  const [savedSettings, setSavedSettings] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvStatus, setCsvStatus] = useState<{ success?: boolean; message?: string }>({});
  const [fitStatus, setFitStatus] = useState<{ success?: boolean; message?: string }>({});

  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; message?: string }>({});
  const [syncing, setSyncing] = useState(false);

  // Cloud Sync States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');
  const [showSqlScript, setShowSqlScript] = useState(false);

  const handleCloudLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      await loginCloud(authEmail, authPassword);
      setAuthSuccess('Autenticado com sucesso!');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao autenticar. Verifique email/senha.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCloudRegister = async () => {
    if (!authEmail || !authPassword) {
      setAuthError('Preencha os campos de email e senha.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      await registerCloud(authEmail, authPassword);
      setAuthSuccess('Conta criada e autenticada com sucesso!');
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao criar conta. Email pode já estar em uso.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCloudSync = async () => {
    setCloudMessage('Sincronizando...');
    try {
      const result = await syncLogsWithCloud();
      setCloudMessage(result);
      setTimeout(() => setCloudMessage(''), 5000);
    } catch (err: any) {
      setCloudMessage(`Erro: ${err.message}`);
    }
  };

  const handleLocalSync = async () => {
    setSyncing(true);
    setSyncStatus({ message: 'Sincronizando dados com a pasta local...' });
    try {
      const msg = await syncLocalDirectory();
      setSyncStatus({ success: true, message: msg });
    } catch (err: any) {
      setSyncStatus({ success: false, message: err.message || 'Erro de sincronização.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectDir = async () => {
    try {
      await connectDirectory();
      setSyncStatus({ success: true, message: 'Pasta local conectada! Clique em Sincronizar.' });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSyncStatus({ success: false, message: 'Erro ao conectar pasta local.' });
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: SleepSettings = {
      targetBedtimeStart,
      targetBedtimeEnd,
      targetWakeTimeStart,
      targetWakeTimeEnd,
      sleepDurationGoal,
    };
    updateSettings(newSettings);
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 2000);
  };

  // Export data to a JSON file
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sleeproutine_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import data from a JSON file
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            // Basic validation
            const isValid = parsed.every(l => l.date && l.bedtime && l.wakeTime);
            if (isValid) {
              importLogs(parsed);
              alert(`${parsed.length} registros importados com sucesso!`);
            } else {
              alert('Formato de dados inválido no arquivo JSON.');
            }
          } else {
            alert('O arquivo JSON deve conter um array de registros.');
          }
        } catch (error) {
          alert('Erro ao processar o arquivo JSON.');
        }
      };
    }
  };

  // Simulate Importing Zepp CSV data
  const handleZeppCsvImport = () => {
    if (!csvText.trim()) {
      setCsvStatus({ success: false, message: 'Por favor, cole os dados do CSV.' });
      return;
    }

    try {
      // Very robust CSV parsing
      const lines = csvText.split('\n');
      const parsedLogs: SleepLog[] = [];
      
      // Let's parse header to map columns
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
      const sleepIdx = headers.findIndex(h => h.includes('dormir') || h.includes('bedtime') || h.includes('start') || h.includes('sleep'));
      const wakeIdx = headers.findIndex(h => h.includes('acordar') || h.includes('waketime') || h.includes('stop') || h.includes('wake'));
      const qualIdx = headers.findIndex(h => h.includes('qualidade') || h.includes('quality') || h.includes('rating'));

      if (dateIdx === -1 || sleepIdx === -1 || wakeIdx === -1) {
        // Fallback simple parsing if headers don't match standard terms
        // Expecting format: YYYY-MM-DD, HH:MM, HH:MM, quality(1-5)
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length >= 3) {
            parsedLogs.push({
              date: cols[0],
              bedtime: cols[1],
              wakeTime: cols[2],
              sleepQuality: parseInt(cols[3]) || 4,
              nightAwakenings: [],
              notes: 'Importado do Smartwatch (Zepp CSV)',
              tags: [],
              source: 'zepp',
            });
          }
        }
      } else {
        // Parse according to mapped header indices
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = lines[i].split(',').map(c => c.trim());
          
          if (cols[dateIdx] && cols[sleepIdx] && cols[wakeIdx]) {
            parsedLogs.push({
              date: cols[dateIdx],
              bedtime: cols[sleepIdx],
              wakeTime: cols[wakeIdx],
              sleepQuality: qualIdx !== -1 ? parseInt(cols[qualIdx]) || 4 : 4,
              nightAwakenings: [],
              notes: 'Importado do Smartwatch (Zepp CSV)',
              tags: [],
              source: 'zepp',
            });
          }
        }
      }

      if (parsedLogs.length > 0) {
        importLogs(parsedLogs);
        setCsvStatus({ success: true, message: `${parsedLogs.length} noites importadas do Zepp!` });
        setCsvText('');
      } else {
        setCsvStatus({ success: false, message: 'Nenhum registro válido pôde ser extraído do CSV.' });
      }
    } catch (e) {
      setCsvStatus({ success: false, message: 'Falha ao analisar o CSV. Verifique o formato.' });
    }
  };

  const loadSampleZeppCsv = () => {
    const today = new Date();
    const formatDate = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };
    
    // Sample CSV content mimicking a Zepp Export
    const csvSample = `date,bedtime,waketime,quality
${formatDate(6)},23:05,07:05,4
${formatDate(5)},23:10,06:55,5
${formatDate(4)},23:25,07:15,4
${formatDate(3)},23:45,07:00,3
${formatDate(2)},23:15,06:45,4
${formatDate(1)},00:05,08:30,4`;

    setCsvText(csvSample);
    setCsvStatus({ success: true, message: 'Exemplo carregado na caixa de texto. Clique em Importar!' });
  };

  const handleGoogleFitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const parsedLogs: SleepLog[] = [];
    let errorCount = 0;
    let streamImportCount = 0;
    let sessionImportCount = 0;

    const readFileAsJson = (file: File): Promise<any> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            resolve(JSON.parse(event.target?.result as string));
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsText(file);
      });
    };

    setFitStatus({ message: `Processando ${files.length} arquivos...` });

    for (const file of files) {
      try {
        const json = await readFileAsJson(file);
        
        // Format 1: Google Fit Sleep Session File (Individual file per night)
        if (json.fitnessActivity === 'sleep' && json.startTime && json.endTime) {
          const startDate = new Date(json.startTime);
          const endDate = new Date(json.endTime);
          const localDateStr = endDate.toLocaleDateString('en-CA');
          
          const bedtime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
          const wakeTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
          
          const nightAwakenings: any[] = [];
          if (json.segment && Array.isArray(json.segment)) {
            json.segment.forEach((seg: any) => {
              if (seg.fitnessActivity === 'sleep.awake') {
                const segStart = new Date(seg.startTime);
                const segEnd = new Date(seg.endTime);
                const durationMinutes = Math.round((segEnd.getTime() - segStart.getTime()) / (60 * 1000));
                const time = segStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
                
                nightAwakenings.push({
                  id: crypto.randomUUID(),
                  time,
                  durationMinutes,
                });
              }
            });
          }

          parsedLogs.push({
            date: localDateStr,
            bedtime,
            wakeTime,
            sleepQuality: 4,
            nightAwakenings,
            notes: 'Importado do Google Fit (Takeout JSON)',
            tags: [],
            source: 'fit',
          });
          sessionImportCount++;
        } 
        // Format 2: Google Fit Sleep Stream File (Bulk data points JSON)
        else if (json["Data Points"] && Array.isArray(json["Data Points"])) {
          const points = json["Data Points"];
          
          // Map to custom segment format
          const segments = points
            .filter((p: any) => p.startTimeNanos && p.endTimeNanos)
            .map((p: any) => {
              const startMs = Number(p.startTimeNanos.toString().slice(0, -6));
              const endMs = Number(p.endTimeNanos.toString().slice(0, -6));
              const value = p.fitValue?.[0]?.value?.intVal; // 1 = awake, 4 = sleep, 5 = deep, 6 = light, 7 = rem
              return { startMs, endMs, value };
            })
            .sort((a: any, b: any) => a.startMs - b.startMs);

          if (segments.length === 0) {
            errorCount++;
            continue;
          }

          // Group segments into nights (consecutive segments with gaps < 4 hours)
          const nightGroups: any[][] = [];
          let currentNight: any[] = [];

          segments.forEach((seg: any) => {
            if (currentNight.length === 0) {
              currentNight.push(seg);
            } else {
              const lastSeg = currentNight[currentNight.length - 1];
              const gap = seg.startMs - lastSeg.endMs;
              
              if (gap < 4 * 60 * 60 * 1000) {
                currentNight.push(seg);
              } else {
                nightGroups.push(currentNight);
                currentNight = [seg];
              }
            }
          });
          if (currentNight.length > 0) {
            nightGroups.push(currentNight);
          }

          // Process each group as a SleepLog
          nightGroups.forEach((nightSegs) => {
            const startMs = nightSegs[0].startMs;
            const endMs = nightSegs[nightSegs.length - 1].endMs;
            const totalDurationHours = (endMs - startMs) / (3600 * 1000);
            
            // Only count if sleep duration is at least 3 hours
            if (totalDurationHours >= 3) {
              const startDate = new Date(startMs);
              const endDate = new Date(endMs);
              const localDateStr = endDate.toLocaleDateString('en-CA');
              
              const bedtime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
              const wakeTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
              
              const nightAwakenings: any[] = [];
              nightSegs.forEach((seg: any) => {
                if (seg.value === 1) { // 1 = awake
                  const segStart = new Date(seg.startMs);
                  const durationMinutes = Math.round((seg.endMs - seg.startMs) / (60 * 1000));
                  const time = segStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
                  if (durationMinutes > 0) {
                    nightAwakenings.push({
                      id: crypto.randomUUID(),
                      time,
                      durationMinutes,
                    });
                  }
                }
              });

              parsedLogs.push({
                date: localDateStr,
                bedtime,
                wakeTime,
                sleepQuality: 4,
                nightAwakenings,
                notes: 'Importado do Google Fit (Takeout Stream)',
                tags: [],
                source: 'fit',
              });
              streamImportCount++;
            }
          });
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }

    if (parsedLogs.length > 0) {
      importLogs(parsedLogs);
      setFitStatus({
        success: true,
        message: `Importação concluída! Carregou ${parsedLogs.length} noites de sono (${sessionImportCount} sessões e ${streamImportCount} noites de fluxo). ${errorCount > 0 ? `(${errorCount} arquivos ignorados)` : ''}`
      });
    } else {
      setFitStatus({
        success: false,
        message: 'Nenhum dado de sono válido foi encontrado nos arquivos selecionados.'
      });
    }
  };

  return (
    <div className="space-y-6 pb-24 text-slate-200">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-xs text-slate-400">Personalize suas metas de sono e gerencie seus dados.</p>
      </div>

      {/* Two-column layout on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Goals & Database Management */}
        <div className="space-y-6">
          
          {/* Target Hours Form */}
          <form onSubmit={handleSave} className="p-5 rounded-2xl border border-white/5 bg-slate-900/30 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <SettingsIcon className="w-4 h-4 text-violet-400" /> Metas de Rotina
            </h3>

            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-medium block">Janela Ideal de Dormir</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">De (Início)</span>
                  <input
                    type="time"
                    value={targetBedtimeStart}
                    onChange={(e) => setTargetBedtimeStart(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">Até (Término)</span>
                  <input
                    type="time"
                    value={targetBedtimeEnd}
                    onChange={(e) => setTargetBedtimeEnd(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-medium block">Janela Ideal de Acordar</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">De (Início)</span>
                  <input
                    type="time"
                    value={targetWakeTimeStart}
                    onChange={(e) => setTargetWakeTimeStart(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">Até (Término)</span>
                  <input
                    type="time"
                    value={targetWakeTimeEnd}
                    onChange={(e) => setTargetWakeTimeEnd(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">Duração de Sono Desejada (horas)</span>
              <input
                type="number"
                step="0.5"
                min="4"
                max="12"
                value={sleepDurationGoal}
                onChange={(e) => setSleepDurationGoal(parseFloat(e.target.value) || 7.5)}
                className="w-full h-10 px-3 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 transition-all text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/20"
            >
              {savedSettings ? (
                <>
                  <Check className="w-4 h-4" /> Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Salvar Definições
                </>
              )}
            </button>
          </form>

          {/* Backup and Data Tools */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/30 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Database className="w-4 h-4 text-indigo-400" /> Gerenciamento de Banco Local
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Load Sample Data */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Carregar dados de demonstração (irá mesclar com registros existentes)?')) {
                    loadSampleData();
                    alert('Dados de demonstração gerados com sucesso!');
                  }
                }}
                className="h-10 rounded-xl border border-white/5 bg-indigo-500/5 hover:bg-indigo-500/10 text-[11px] font-semibold text-indigo-400 transition-all flex items-center justify-center gap-1"
              >
                Gerar Dados Demo
              </button>

              {/* Export JSON */}
              <button
                type="button"
                onClick={handleExport}
                className="h-10 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Exportar JSON
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Import JSON */}
              <label className="h-10 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Importar JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonUpload}
                  className="hidden"
                />
              </label>

              {/* Clear Data */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('ATENÇÃO: Isso irá deletar PERMANENTEMENTE todos os seus registros de sono salvos no navegador. Deseja prosseguir?')) {
                    clearAllData();
                    alert('Todos os dados foram excluídos.');
                  }
                }}
                className="h-10 rounded-xl border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 text-[11px] font-semibold text-rose-400 transition-all flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Apagar Todos os Dados
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Folder Sync & Watch/Fit Imports */}
        <div className="space-y-6">

          {/* Cloud Sync Panel (Supabase) */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/30 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Upload className="w-4 h-4 text-violet-400" /> Sincronização em Nuvem (Supabase)
            </h3>

            {!isCloudConfigured ? (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-normal">
                  O recurso de backup automático na nuvem está <strong>desativado</strong> porque nenhuma credencial do Supabase foi configurada.
                </p>
                <div className="text-[10px] p-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] text-amber-400/90 space-y-2">
                  <span className="font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Como ativar:</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Crie um projeto gratuito em <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">supabase.com</a>.</li>
                    <li>Obtenha as credenciais em <strong>Project Settings &gt; API</strong>.</li>
                    <li>Crie um arquivo <code className="text-slate-100 bg-slate-950 px-1 py-0.5 rounded text-[9px]">.env.local</code> na raiz do projeto com as chaves <code className="text-slate-100">VITE_SUPABASE_URL</code> e <code className="text-slate-100">VITE_SUPABASE_ANON_KEY</code>.</li>
                    <li>Configure as mesmas chaves de ambiente na Vercel.</li>
                    <li>Execute o script SQL abaixo no <strong>SQL Editor</strong> do Supabase para criar as tabelas e ativar a segurança (RLS).</li>
                  </ol>

                  <button
                    type="button"
                    onClick={() => setShowSqlScript(!showSqlScript)}
                    className="mt-2 text-[10px] text-violet-400 hover:text-violet-300 font-semibold underline block"
                  >
                    {showSqlScript ? 'Ocultar Script SQL' : 'Mostrar Script SQL para o Supabase'}
                  </button>

                  {showSqlScript && (
                    <div className="mt-2 space-y-1">
                      <textarea
                        readOnly
                        rows={10}
                        value={`-- 1. Criar tabela de logs de sono
create table if not exists public.sleep_logs (
  user_id uuid references auth.users not null,
  date text not null,
  bedtime text not null,
  wake_time text not null,
  sleep_quality integer not null,
  night_awakenings jsonb not null default '[]'::jsonb,
  notes text,
  tags jsonb not null default '[]'::jsonb,
  source text not null,
  updated_at bigint not null,
  primary key (user_id, date)
);

-- 2. Criar tabela de configurações de sono
create table if not exists public.sleep_settings (
  user_id uuid references auth.users not null primary key,
  target_bedtime_start text not null,
  target_bedtime_end text not null,
  target_wake_time_start text not null,
  target_wake_time_end text not null,
  sleep_duration_goal numeric not null
);

-- 3. Habilitar RLS (Row-Level Security)
alter table public.sleep_logs enable row level security;
alter table public.sleep_settings enable row level security;

-- 4. Criar Políticas RLS para sleep_logs
create policy "Users can perform all actions on their own logs"
  on public.sleep_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Criar Políticas RLS para sleep_settings
create policy "Users can perform all actions on their own settings"
  on public.sleep_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`}
                        className="w-full p-2 text-[9px] font-mono bg-slate-950 text-slate-300 rounded border border-white/5 focus:outline-none select-all cursor-text"
                      />
                      <span className="text-[9px] text-slate-500">Clique na caixa acima para selecionar tudo e copie para o editor do Supabase.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cloudUser ? (
                  // Logged In State
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs bg-slate-950/40 px-3 py-2.5 rounded-xl border border-emerald-500/10">
                      <div className="flex flex-col pr-2 truncate">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Sincronizado como</span>
                        <span className="text-slate-300 font-semibold truncate text-[11px]">{cloudUser.email}</span>
                      </div>
                      <span className="text-emerald-400 font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10 shrink-0">
                        Ativo
                      </span>
                    </div>

                    {cloudMessage && (
                      <div className="text-[10px] px-3 py-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/10 leading-normal">
                        {cloudMessage}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={logoutCloud}
                        className="flex-1 h-9 rounded-xl border border-rose-500/15 bg-rose-500/5 hover:bg-rose-500/10 text-[11px] font-semibold text-rose-400 transition-all"
                      >
                        Desconectar
                      </button>
                      <button
                        type="button"
                        onClick={handleCloudSync}
                        disabled={cloudSyncing}
                        className="flex-1 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-[11px] font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {cloudSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Logged Out State / Login Form
                  <form onSubmit={handleCloudLogin} className="space-y-3">
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Conecte-se para manter seu histórico de sono sincronizado em tempo real entre todos os seus dispositivos.
                    </p>

                    <div className="space-y-2">
                      <input
                        type="email"
                        placeholder="Email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Senha (mínimo 6 chars)"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-white/5 bg-slate-950/60 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500"
                        required
                      />
                    </div>

                    {authError && (
                      <div className="text-[10px] px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/10">
                        {authError}
                      </div>
                    )}
                    {authSuccess && (
                      <div className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        {authSuccess}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCloudRegister}
                        disabled={authLoading}
                        className="flex-1 h-9 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 text-[11px] font-semibold text-slate-400 transition-colors disabled:opacity-50"
                      >
                        Criar Conta
                      </button>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="flex-1 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-[11px] font-semibold text-white transition-all disabled:opacity-50"
                      >
                        {authLoading ? 'Entrando...' : 'Entrar'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Local Folder Sync (Google Drive / Takeout) */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/30 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Database className="w-4 h-4 text-violet-400" /> Sincronizador de Pasta Local
            </h3>
            
            <p className="text-[11px] text-slate-500 leading-normal">
              Conecte a pasta de exportação do seu Google Drive/Takeout (onde fica o arquivo <code className="text-slate-300">raw_com.google.sleep.segment...</code>) para atualizar os dados de sono de forma rápida no computador.
            </p>

            {syncDirName ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs bg-slate-950/40 px-3 py-2 rounded-xl border border-emerald-500/10">
                  <span className="text-slate-400 font-medium truncate max-w-[200px]">📁 {syncDirName}</span>
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10 shrink-0">
                    Conectado
                  </span>
                </div>

                {syncStatus.message && (
                  <div className={`text-[11px] px-3 py-2 rounded-lg flex items-center gap-1.5 ${
                    syncStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 
                    syncStatus.success === false ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' : 'bg-violet-500/10 text-violet-400 border border-violet-500/10'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{syncStatus.message}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={disconnectDirectory}
                    className="flex-1 h-9 rounded-xl border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 text-[11px] font-semibold text-rose-400 transition-all"
                  >
                    Desconectar
                  </button>
                  <button
                    type="button"
                    onClick={handleLocalSync}
                    disabled={syncing}
                    className="flex-1 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-[11px] font-semibold text-white transition-all disabled:opacity-50"
                  >
                    {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs bg-slate-950/40 px-3 py-2 rounded-xl border border-white/5 text-slate-500">
                  <span>Nenhuma pasta conectada</span>
                  <span className="uppercase tracking-wider text-[8px] font-semibold">Inativo</span>
                </div>

                {syncStatus.message && (
                  <div className="text-[11px] px-3 py-2 rounded-lg flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/10">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{syncStatus.message}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConnectDir}
                  className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/20"
                >
                  <Upload className="w-4 h-4 text-violet-300" /> Selecionar Pasta Local do Drive
                </button>
              </div>
            )}
          </div>

          {/* Import / Export Zepp CSV */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/30 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" /> Importar do Smartwatch (Zepp CSV)
            </h3>
            
            <p className="text-[11px] text-slate-500 leading-normal">
              Cole os dados CSV do Zepp no campo abaixo (<code className="text-slate-300">date,bedtime,waketime,quality</code>).
            </p>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Ex:&#10;date,bedtime,waketime,quality&#10;2026-06-25,23:15,07:00,4"
              rows={4}
              className="w-full p-3 rounded-xl border border-white/5 bg-slate-950/40 text-xs text-slate-300 placeholder-slate-700 font-mono resize-none focus:outline-none"
            />

            {csvStatus.message && (
              <div className={`text-[11px] px-3 py-2 rounded-lg flex items-center gap-1.5 ${
                csvStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
              }`}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{csvStatus.message}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadSampleZeppCsv}
                className="flex-1 h-9 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 text-[11px] font-semibold text-slate-400 transition-colors"
              >
                Exemplo
              </button>
              <button
                type="button"
                onClick={handleZeppCsvImport}
                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-[11px] font-semibold text-white transition-all"
              >
                Importar CSV
              </button>
            </div>
          </div>

          {/* Import Google Fit JSON (Takeout) */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-900/30 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-sky-400" /> Importar do Google Fit (Takeout JSON)
            </h3>
            
            <p className="text-[11px] text-slate-500 leading-normal">
              Selecione arquivos de sono do Google Takeout (<code className="text-slate-300">_SLEEP.json</code> ou dados de fluxo).
            </p>

            {fitStatus.message && (
              <div className={`text-[11px] px-3 py-2 rounded-lg flex items-center gap-1.5 ${
                fitStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 
                fitStatus.success === false ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' : 'bg-sky-500/10 text-sky-400 border border-sky-500/10'
              }`}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{fitStatus.message}</span>
              </div>
            )}

            <label className="h-10 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-sky-400" /> Selecionar Arquivos SLEEP.json
              <input
                type="file"
                accept=".json"
                multiple
                onChange={handleGoogleFitUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};
