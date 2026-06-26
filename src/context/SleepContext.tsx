import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  getDocs, 
  collection
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase';

export interface Awakening {
  id: string;
  time: string; // "HH:MM"
  durationMinutes: number;
  note?: string;
}

export interface SleepLog {
  date: string; // "YYYY-MM-DD"
  bedtime: string; // "HH:MM"
  wakeTime: string; // "HH:MM"
  sleepQuality: number; // 1 to 5
  nightAwakenings: Awakening[];
  notes: string;
  tags: string[]; // ["Caffeine late", "Late workout", "Late screen", "Stress", "Alcohol", "Heavy meal"]
  source: 'manual' | 'zepp' | 'fit';
  updatedAt?: number; // timestamp in milliseconds for conflict resolution
}

export interface SleepSettings {
  targetBedtimeStart: string; // "HH:MM"
  targetBedtimeEnd: string; // "HH:MM"
  targetWakeTimeStart: string; // "HH:MM"
  targetWakeTimeEnd: string; // "HH:MM"
  sleepDurationGoal: number; // in hours, e.g. 7.5
}

export type SleepStatus = 'stable' | 'mild_deviation' | 'disrupted' | 'recovering';

interface SleepContextType {
  logs: SleepLog[];
  settings: SleepSettings;
  addLog: (log: SleepLog) => void;
  updateLog: (date: string, updatedLog: SleepLog) => void;
  deleteLog: (date: string) => void;
  updateSettings: (settings: SleepSettings) => void;
  importLogs: (newLogs: SleepLog[]) => void;
  clearAllData: () => void;
  loadSampleData: () => void;
  getAnalytics: () => SleepAnalytics;
  
  // Local directory sync
  syncDirName: string | null;
  connectDirectory: () => Promise<void>;
  disconnectDirectory: () => Promise<void>;
  syncLocalDirectory: () => Promise<string>;

  // Cloud Sync Extensions
  isCloudConfigured: boolean;
  cloudUser: User | null;
  cloudSyncing: boolean;
  syncLogsWithCloud: (currentUser?: User | null) => Promise<string>;
  loginCloud: (email: string, password: string) => Promise<void>;
  registerCloud: (email: string, password: string) => Promise<void>;
  logoutCloud: () => Promise<void>;
}

interface SleepAnalytics {
  averageDuration: number; // in hours
  averageBedtime: string; // "HH:MM"
  averageWakeTime: string; // "HH:MM"
  stabilityScore: number; // 0 to 100
  currentStatus: SleepStatus;
  alerts: string[];
  weeklyBedtimeVariance: number; // in minutes
  weeklyWakeTimeVariance: number; // in minutes
  sleepDebt: number; // hours of accumulated sleep deficit relative to goal
}

const DEFAULT_SETTINGS: SleepSettings = {
  targetBedtimeStart: '23:00',
  targetBedtimeEnd: '23:30',
  targetWakeTimeStart: '06:40',
  targetWakeTimeEnd: '07:15',
  sleepDurationGoal: 7.5,
};

const SleepContext = createContext<SleepContextType | undefined>(undefined);

// Helper functions for time calculations
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const normalizedMins = (minutes + 1440) % 1440;
  const hours = Math.floor(normalizedMins / 60);
  const mins = Math.floor(normalizedMins % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function getCircularDistance(time1: string, time2: string): number {
  const m1 = timeToMinutes(time1);
  const m2 = timeToMinutes(time2);
  const diff = (m1 - m2 + 1440) % 1440;
  return diff > 720 ? 1440 - diff : diff;
}

export function getSleepDuration(bedtime: string, wakeTime: string): number {
  const mBed = timeToMinutes(bedtime);
  const mWake = timeToMinutes(wakeTime);
  const diff = (mWake - mBed + 1440) % 1440; // total sleep time in minutes
  return diff / 60; // duration in hours
}

export const SleepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [settings, setSettings] = useState<SleepSettings>(DEFAULT_SETTINGS);
  
  // Sync Folder States
  const [syncDirName, setSyncDirName] = useState<string | null>(null);
  const [dirHandle, setDirHandle] = useState<any | null>(null);

  // Cloud Sync State
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudSyncing, setCloudSyncing] = useState<boolean>(false);
  const logsRef = useRef<SleepLog[]>([]);
  const settingsRef = useRef<SleepSettings>(settings);

  // Keep refs in sync to avoid stale closures in auth state listener
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load from localStorage & IndexedDB on mount
  useEffect(() => {
    const storedLogs = localStorage.getItem('sleep_routine_logs');
    const storedSettings = localStorage.getItem('sleep_routine_settings');

    if (storedLogs) {
      try {
        const parsed = JSON.parse(storedLogs);
        setLogs(parsed);
        logsRef.current = parsed;
      } catch (e) {
        console.error('Failed to parse logs from localStorage', e);
      }
    }
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setSettings(parsed);
        settingsRef.current = parsed;
      } catch (e) {
        console.error('Failed to parse settings from localStorage', e);
      }
    }

    getDirectoryHandle().then((handle) => {
      if (handle) {
        setDirHandle(handle);
        setSyncDirName(handle.name);
      }
    }).catch(err => console.error('Failed to get directory handle', err));
  }, []);

  // Cloud Sync Functions
  const syncLogsWithCloud = async (currentUser?: User | null): Promise<string> => {
    const activeUser = currentUser === undefined ? cloudUser : currentUser;
    if (!activeUser || !db) {
      throw new Error('Usuário não autenticado no Firebase.');
    }

    setCloudSyncing(true);
    try {
      // 1. Fetch all logs from Firestore for this user
      const querySnapshot = await getDocs(collection(db, 'users', activeUser.uid, 'logs'));
      const cloudLogsMap = new Map<string, SleepLog>();
      
      querySnapshot.forEach((doc) => {
        cloudLogsMap.set(doc.id, doc.data() as SleepLog);
      });

      // 2. Merge local and cloud logs
      const localLogsMap = new Map<string, SleepLog>();
      logsRef.current.forEach((log) => localLogsMap.set(log.date, log));

      const mergedLogsList: SleepLog[] = [];
      const logsToUpload: SleepLog[] = [];

      // Combine keys from both maps
      const allDates = new Set([...localLogsMap.keys(), ...cloudLogsMap.keys()]);

      for (const date of allDates) {
        const localLog = localLogsMap.get(date);
        const cloudLog = cloudLogsMap.get(date);

        if (localLog && cloudLog) {
          // Both exist: resolve by updatedAt timestamp
          const localTime = localLog.updatedAt || 0;
          const cloudTime = cloudLog.updatedAt || 0;

          if (localTime >= cloudTime) {
            mergedLogsList.push(localLog);
            if (localTime > cloudTime) {
              logsToUpload.push(localLog);
            }
          } else {
            mergedLogsList.push(cloudLog);
          }
        } else if (localLog) {
          // Only local exists: upload to cloud
          mergedLogsList.push(localLog);
          logsToUpload.push(localLog);
        } else if (cloudLog) {
          // Only cloud exists: pull to local
          mergedLogsList.push(cloudLog);
        }
      }

      // 3. Upload missing/updated logs to Firestore
      if (logsToUpload.length > 0) {
        for (const log of logsToUpload) {
          await setDoc(doc(db, 'users', activeUser.uid, 'logs', log.date), log);
        }
      }

      // 4. Save merged list locally
      const sortedMerged = mergedLogsList.sort((a, b) => b.date.localeCompare(a.date));
      saveLogs(sortedMerged);

      return `Sincronização concluída. ${logsToUpload.length} registros enviados para a nuvem. ${mergedLogsList.length - logsRef.current.length} novos registros baixados.`;
    } catch (e: any) {
      console.error(e);
      throw new Error(`Erro na sincronização: ${e.message || e}`);
    } finally {
      setCloudSyncing(false);
    }
  };

  const loginCloud = async (email: string, password: string) => {
    if (!auth) throw new Error('Serviço de autenticação inativo.');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerCloud = async (email: string, password: string) => {
    if (!auth) throw new Error('Serviço de autenticação inativo.');
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logoutCloud = async () => {
    if (!auth) throw new Error('Serviço de autenticação inativo.');
    await signOut(auth);
    setCloudUser(null);
  };

  // Firebase Authentication State Listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      if (user) {
        // Trigger auto-sync on login / page mount
        syncLogsWithCloud(user).catch(err => console.error('Auto sync failed:', err));
        
        // Pull settings from firestore
        getDoc(doc(db!, 'users', user.uid, 'settings', 'config'))
          .then((settingsDoc) => {
            if (settingsDoc.exists()) {
              const cloudSettings = settingsDoc.data() as SleepSettings;
              saveSettings(cloudSettings);
            } else {
              // Upload local settings to firestore if not exists in cloud
              setDoc(doc(db!, 'users', user.uid, 'settings', 'config'), settingsRef.current)
                .catch(e => console.error('Failed to upload settings to Firestore:', e));
            }
          })
          .catch(err => console.error('Failed to get cloud settings:', err));
      }
    });

    return () => unsubscribe();
  }, []);

  const connectDirectory = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      await saveDirectoryHandle(handle);
      setDirHandle(handle);
      setSyncDirName(handle.name);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const disconnectDirectory = async () => {
    try {
      await removeDirectoryHandle();
      setDirHandle(null);
      setSyncDirName(null);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const syncLocalDirectory = async (): Promise<string> => {
    if (!dirHandle) {
      throw new Error('Nenhuma pasta local conectada.');
    }

    // Verify permission first
    const permission = await dirHandle.queryPermission({ mode: 'read' });
    if (permission !== 'granted') {
      const request = await dirHandle.requestPermission({ mode: 'read' });
      if (request !== 'granted') {
        throw new Error('Permissão de leitura negada pelo navegador.');
      }
    }

    // Attempt to locate segment files
    let fileHandle: any;
    try {
      fileHandle = await dirHandle.getFileHandle('raw_com.google.sleep.segment_com.huami.watch.h.json');
    } catch (e) {
      try {
        fileHandle = await dirHandle.getFileHandle('derived_com.google.sleep.segment_com.google.an.json');
      } catch (e2) {
        throw new Error('Nenhum arquivo de sono válido (raw/derived sleep.segment) foi encontrado na pasta conectada.');
      }
    }

    const file = await fileHandle.getFile();
    const text = await file.text();
    const json = JSON.parse(text);

    if (!json["Data Points"] || !Array.isArray(json["Data Points"])) {
      throw new Error('O arquivo de sono encontrado possui formato inválido.');
    }

    const points = json["Data Points"];
    const parsedLogs: SleepLog[] = [];
    let streamImportCount = 0;

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
      throw new Error('O arquivo de sono está vazio.');
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
          notes: 'Sincronizado da pasta do Google Fit',
          tags: [],
          source: 'fit',
        });
        streamImportCount++;
      }
    });

    if (parsedLogs.length > 0) {
      importLogs(parsedLogs);
      return `Sucesso! Sincronizou ${parsedLogs.length} noites de sono a partir da pasta.`;
    } else {
      throw new Error('Nenhum dado de sono elegível foi encontrado no arquivo.');
    }
  };

  // Save to localStorage when state changes

  // Save to localStorage when state changes
  const saveLogs = (newLogs: SleepLog[]) => {
    setLogs(newLogs);
    localStorage.setItem('sleep_routine_logs', JSON.stringify(newLogs));
  };

  const saveSettings = (newSettings: SleepSettings) => {
    setSettings(newSettings);
    localStorage.setItem('sleep_routine_settings', JSON.stringify(newSettings));
  };

  const addLog = (log: SleepLog) => {
    const logWithTime = { ...log, updatedAt: log.updatedAt || Date.now() };
    const existingIndex = logs.findIndex((l) => l.date === log.date);
    let updated;
    if (existingIndex > -1) {
      updated = [...logs];
      updated[existingIndex] = logWithTime;
    } else {
      updated = [...logs, logWithTime];
    }
    saveLogs(updated.sort((a, b) => b.date.localeCompare(a.date)));

    if (cloudUser && db) {
      setDoc(doc(db, 'users', cloudUser.uid, 'logs', log.date), logWithTime)
        .catch((e) => console.error('Erro ao salvar no Firestore:', e));
    }
  };

  const updateLog = (date: string, updatedLog: SleepLog) => {
    const logWithTime = { ...updatedLog, updatedAt: Date.now() };
    saveLogs(logs.map((l) => (l.date === date ? logWithTime : l)));

    if (cloudUser && db) {
      setDoc(doc(db, 'users', cloudUser.uid, 'logs', date), logWithTime)
        .catch((e) => console.error('Erro ao atualizar no Firestore:', e));
    }
  };

  const deleteLog = (date: string) => {
    saveLogs(logs.filter((l) => l.date !== date));

    if (cloudUser && db) {
      deleteDoc(doc(db, 'users', cloudUser.uid, 'logs', date))
        .catch((e) => console.error('Erro ao excluir no Firestore:', e));
    }
  };

  const updateSettings = (newSettings: SleepSettings) => {
    saveSettings(newSettings);

    if (cloudUser && db) {
      setDoc(doc(db, 'users', cloudUser.uid, 'settings', 'config'), newSettings)
        .catch((e) => console.error('Erro ao salvar configurações no Firestore:', e));
    }
  };

  const importLogs = (newLogs: SleepLog[]) => {
    const logMap = new Map<string, SleepLog>();
    logs.forEach((l) => logMap.set(l.date, l));
    
    newLogs.forEach((l) => {
      const stamped = { ...l, updatedAt: l.updatedAt || Date.now() };
      logMap.set(l.date, stamped);
      
      if (cloudUser && db) {
        setDoc(doc(db, 'users', cloudUser.uid, 'logs', l.date), stamped)
          .catch((e) => console.error('Erro ao sincronizar importação no Firestore:', e));
      }
    });

    const merged = Array.from(logMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    saveLogs(merged);
  };

  const clearAllData = () => {
    saveLogs([]);
    saveSettings(DEFAULT_SETTINGS);
  };

  const loadSampleData = () => {
    const sampleLogs: SleepLog[] = [];
    const today = new Date();
    
    // Generate 3 weeks of logs
    // Week 1 (Current week - relatively stable but with some disruptions)
    // Week 2 (Very disrupted - user's typical previous schedule with late weekends)
    // Week 3 (Transition week - starting to try regular hours)
    
    for (let i = 21; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday

      let bedtime = '23:15';
      let wakeTime = '07:00';
      let quality = 4;
      let awakenings: Awakening[] = [];
      let tags: string[] = [];
      let notes = '';

      if (i > 14) {
        // Disrupted phase (prior to starting the routine)
        if (isWeekend) {
          bedtime = '05:30';
          wakeTime = '14:45';
          quality = 3;
          notes = 'Dormi super tarde no fim de semana, acordei quebrado à tarde.';
          tags = ['Alcohol', 'Late screen'];
        } else {
          // weekday during bad phase
          bedtime = '02:30';
          wakeTime = '06:50';
          quality = 2;
          awakenings = [
            { id: '1', time: '04:15', durationMinutes: 15, note: 'Acordei ansioso' }
          ];
          tags = ['Caffeine late', 'Late screen', 'Stress'];
          notes = 'Pouquíssimo sono acumulado.';
        }
      } else if (i > 7) {
        // Transition phase (starting to adjust)
        if (isWeekend) {
          bedtime = '01:30';
          wakeTime = '09:40';
          quality = 3;
          tags = ['Late screen'];
          notes = 'Tentando não acordar tão tarde no fim de semana.';
        } else {
          bedtime = '23:45';
          wakeTime = '07:05';
          quality = 3;
          awakenings = [
            { id: '1', time: '03:10', durationMinutes: 5 }
          ];
          tags = ['Stress'];
          notes = 'Adaptando ao novo horário.';
        }
      } else {
        // Stable phase (recent 7 days)
        if (isWeekend) {
          bedtime = '00:05';
          wakeTime = '08:30';
          quality = 4;
          notes = 'Fim de semana controlado, acordando num horário bom.';
        } else {
          bedtime = i === 3 ? '00:45' : '23:15'; // one slip up
          wakeTime = i === 3 ? '07:10' : '07:00';
          quality = i === 3 ? 3 : 5;
          awakenings = i === 5 ? [
            { id: '1', time: '02:30', durationMinutes: 10, note: 'Sede' }
          ] : [];
          tags = i === 3 ? ['Late screen', 'Caffeine late'] : ['Late workout'];
          notes = i === 3 ? 'Acabei me perdendo no celular.' : 'Excelente noite de sono.';
        }
      }

      sampleLogs.push({
        date: dateStr,
        bedtime,
        wakeTime,
        sleepQuality: quality,
        nightAwakenings: awakenings,
        notes,
        tags,
        source: 'manual',
      });
    }

    saveLogs(sampleLogs.sort((a, b) => b.date.localeCompare(a.date)));
  };

  const getAnalytics = (): SleepAnalytics => {
    const recentLogs = logs.slice(0, 7); // Analytics for the last 7 entries
    const alerts: string[] = [];

    if (logs.length === 0) {
      return {
        averageDuration: 0,
        averageBedtime: '00:00',
        averageWakeTime: '00:00',
        stabilityScore: 100,
        currentStatus: 'stable',
        alerts: ['Nenhum registro encontrado. Comece a registrar ou insira os dados de exemplo nas Configurações.'],
        weeklyBedtimeVariance: 0,
        weeklyWakeTimeVariance: 0,
        sleepDebt: 0,
      };
    }

    // 1. Calculate Average Duration, Bedtime, and Wake-up Time
    let totalDuration = 0;
    let totalBedtimeMinutes = 0;
    let totalWakeTimeMinutes = 0;

    recentLogs.forEach((log) => {
      totalDuration += getSleepDuration(log.bedtime, log.wakeTime);
      totalBedtimeMinutes += timeToMinutes(log.bedtime);
      totalWakeTimeMinutes += timeToMinutes(log.wakeTime);
    });

    const averageDuration = totalDuration / recentLogs.length;

    const getCircularAverage = (times: string[]): string => {
      let sumSin = 0;
      let sumCos = 0;
      times.forEach(t => {
        const mins = timeToMinutes(t);
        const angle = (mins / 1440) * 2 * Math.PI;
        sumSin += Math.sin(angle);
        sumCos += Math.cos(angle);
      });
      let avgAngle = Math.atan2(sumSin / times.length, sumCos / times.length);
      if (avgAngle < 0) avgAngle += 2 * Math.PI;
      const avgMinutes = Math.round((avgAngle / (2 * Math.PI)) * 1440);
      return minutesToTime(avgMinutes);
    };

    const averageBedtime = getCircularAverage(recentLogs.map(l => l.bedtime));
    const averageWakeTime = getCircularAverage(recentLogs.map(l => l.wakeTime));

    // 2. Variance Calculations (Standard Deviation of distances to the circular average)
    let bedtimeDistancesSum = 0;
    let wakeTimeDistancesSum = 0;

    recentLogs.forEach((log) => {
      bedtimeDistancesSum += Math.pow(getCircularDistance(log.bedtime, averageBedtime), 2);
      wakeTimeDistancesSum += Math.pow(getCircularDistance(log.wakeTime, averageWakeTime), 2);
    });

    const weeklyBedtimeVariance = Math.sqrt(bedtimeDistancesSum / recentLogs.length);
    const weeklyWakeTimeVariance = Math.sqrt(wakeTimeDistancesSum / recentLogs.length);

    // 3. Sleep Debt
    let sleepDebt = 0;
    recentLogs.forEach((log) => {
      const dur = getSleepDuration(log.bedtime, log.wakeTime);
      if (dur < settings.sleepDurationGoal) {
        sleepDebt += (settings.sleepDurationGoal - dur);
      }
    });

    // 4. Stability Score Calculation (0 - 100)
    const bedtimeDeduction = Math.min(30, (weeklyBedtimeVariance / 90) * 30);
    const wakeTimeDeduction = Math.min(30, (weeklyWakeTimeVariance / 90) * 30);

    const avgQuality = recentLogs.reduce((acc, l) => acc + l.sleepQuality, 0) / recentLogs.length;
    const qualityDeduction = (5 - avgQuality) * 5;

    const avgAwakenings = recentLogs.reduce((acc, l) => acc + l.nightAwakenings.length, 0) / recentLogs.length;
    const awakeningDeduction = Math.min(20, avgAwakenings * 7);

    const stabilityScore = Math.max(0, Math.round(100 - (bedtimeDeduction + wakeTimeDeduction + qualityDeduction + awakeningDeduction)));

    // 5. Alerts Generation
    const lastNight = logs[0];
    if (lastNight) {
      const lastBedtimeDist = getCircularDistance(lastNight.bedtime, averageBedtime);
      if (lastBedtimeDist > 90) {
        alerts.push(`Horário de dormir de ontem foi ${Math.round(lastBedtimeDist)}min diferente da sua média recente.`);
      }

      if (lastNight.nightAwakenings.length >= 3) {
        alerts.push(`Você acordou ${lastNight.nightAwakenings.length} vezes durante a noite passada. Sono muito fragmentado.`);
      }
    }

    const weekendLogs = recentLogs.filter(l => {
      const day = new Date(l.date).getDay();
      return day === 5 || day === 6;
    });
    const weekdayLogs = recentLogs.filter(l => {
      const day = new Date(l.date).getDay();
      return day !== 5 && day !== 6;
    });

    if (weekendLogs.length > 0 && weekdayLogs.length > 0) {
      const avgWeekendWake = getCircularAverage(weekendLogs.map(l => l.wakeTime));
      const avgWeekdayWake = getCircularAverage(weekdayLogs.map(l => l.wakeTime));
      const wakeDrift = getCircularDistance(avgWeekendWake, avgWeekdayWake);
      
      if (wakeDrift > 90) {
        alerts.push(`Descompasso de Fim de Semana (Jetlag Social): Você está acordando ${Math.round(wakeDrift)}min mais tarde nos fins de semana.`);
      }
    }

    if (sleepDebt > 5) {
      alerts.push(`Déficit de sono acumulado: você está com um débito de ${sleepDebt.toFixed(1)}h esta semana em relação à sua meta.`);
    }

    if (recentLogs.length >= 3) {
      const last3 = recentLogs.slice(0, 3);
      const isDeclining = last3[0].sleepQuality < last3[1].sleepQuality && last3[1].sleepQuality < last3[2].sleepQuality;
      if (isDeclining) {
        alerts.push('Alerta de Tendência: A qualidade percebida do seu sono está em queda há 3 dias seguidos.');
      }
    }

    // 6. Current Status determination
    let currentStatus: SleepStatus = 'stable';
    if (stabilityScore >= 80) {
      currentStatus = 'stable';
    } else if (stabilityScore >= 60) {
      const olderLogs = logs.slice(7, 14);
      if (olderLogs.length > 0) {
        let olderBedtimeDistancesSum = 0;
        let olderWakeTimeDistancesSum = 0;
        const olderAvgBedtime = getCircularAverage(olderLogs.map(l => l.bedtime));
        const olderAvgWakeTime = getCircularAverage(olderLogs.map(l => l.wakeTime));
        olderLogs.forEach((log) => {
          olderBedtimeDistancesSum += Math.pow(getCircularDistance(log.bedtime, olderAvgBedtime), 2);
          olderWakeTimeDistancesSum += Math.pow(getCircularDistance(log.wakeTime, olderAvgWakeTime), 2);
        });
        const olderBedtimeVariance = Math.sqrt(olderBedtimeDistancesSum / olderLogs.length);
        const olderWakeTimeVariance = Math.sqrt(olderWakeTimeDistancesSum / olderLogs.length);
        
        if (olderBedtimeVariance > weeklyBedtimeVariance + 15 || olderWakeTimeVariance > weeklyWakeTimeVariance + 15) {
          currentStatus = 'recovering';
        } else {
          currentStatus = 'mild_deviation';
        }
      } else {
        currentStatus = 'mild_deviation';
      }
    } else {
      currentStatus = 'disrupted';
    }

    if (logs.length > 7) {
      const last3 = logs.slice(0, 3);
      let last3BedtimeDist = 0;
      const last3AvgBedtime = getCircularAverage(last3.map(l => l.bedtime));
      last3.forEach(l => {
        last3BedtimeDist += getCircularDistance(l.bedtime, last3AvgBedtime);
      });
      const last3Variance = last3BedtimeDist / 3;
      
      const prevLogs = logs.slice(7, 14);
      let prevBedtimeDist = 0;
      const prevAvgBedtime = getCircularAverage(prevLogs.map(l => l.bedtime));
      prevLogs.forEach(l => {
        prevBedtimeDist += getCircularDistance(l.bedtime, prevAvgBedtime);
      });
      const prevVariance = prevBedtimeDist / prevLogs.length;

      if (last3Variance < 30 && prevVariance > 75 && stabilityScore < 80) {
        currentStatus = 'recovering';
      }
    }

    return {
      averageDuration,
      averageBedtime,
      averageWakeTime,
      stabilityScore,
      currentStatus,
      alerts,
      weeklyBedtimeVariance,
      weeklyWakeTimeVariance,
      sleepDebt,
    };
  };

  return (
    <SleepContext.Provider
      value={{
        logs,
        settings,
        addLog,
        updateLog,
        deleteLog,
        updateSettings,
        importLogs,
        clearAllData,
        loadSampleData,
        getAnalytics,
        syncDirName,
        connectDirectory,
        disconnectDirectory,
        syncLocalDirectory,
        isCloudConfigured: isFirebaseConfigured,
        cloudUser,
        cloudSyncing,
        syncLogsWithCloud,
        loginCloud,
        registerCloud,
        logoutCloud,
      }}
    >
      {children}
    </SleepContext.Provider>
  );
};

export const useSleep = () => {
  const context = useContext(SleepContext);
  if (context === undefined) {
    throw new Error('useSleep must be used within a SleepProvider');
  }
  return context;
};

// IndexedDB helpers to store directory handles (FileSystemDirectoryHandle)
export function saveDirectoryHandle(handle: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SleepRoutineDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('handles', 'readwrite');
      const store = tx.objectStore('handles');
      store.put(handle, 'syncDir');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export function getDirectoryHandle(): Promise<any | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SleepRoutineDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('handles')) {
        resolve(null);
        return;
      }
      const tx = db.transaction('handles', 'readonly');
      const store = tx.objectStore('handles');
      const getRequest = store.get('syncDir');
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export function removeDirectoryHandle(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SleepRoutineDB', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('handles', 'readwrite');
      const store = tx.objectStore('handles');
      store.delete('syncDir');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}
