import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Repeat,
  Bell,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  ListFilter,
  Settings,
  Moon,
  Calendar,
  Play,
  Plus,
  ChevronDown,
} from 'lucide-react';
import timeboundLogo from './assets/logo.png';

export interface Reminder {
  id: string;
  message: string;
  hour: string;
  minute: string;
  amPm: 'AM' | 'PM';
  active: boolean;
  lastTriggeredDate: string | null;
  createdAt: number;
}

const LOCAL_STORAGE_KEY = 'timebound_reminders';

const getInitialReminders = (): Reminder[] => {
  try {
    const saved =
      localStorage.getItem(LOCAL_STORAGE_KEY) ||
      localStorage.getItem('spydy_reminders');

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load reminders from localStorage:', e);
  }

  return [
    {
      id: 'default-1',
      message: 'Finish design system review & update assets',
      hour: '09',
      minute: '30',
      amPm: 'AM',
      active: true,
      lastTriggeredDate: null,
      createdAt: Date.now(),
    },
  ];
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'new' | 'reminders' | 'settings'>('new');
  const [message, setMessage] = useState('Finish design system review & update assets');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('30');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  const [reminders, setReminders] = useState<Reminder[]>(getInitialReminders);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const remindersRef = useRef<Reminder[]>(reminders);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ============================================================
  // AUTO UPDATE CHECK
  // ============================================================
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await check();

        if (update) {
          console.log(
            `Update available: ${update.currentVersion} → ${update.version}`
          );
          setAvailableUpdate(update);
        }
      } catch (error) {
        console.error('UPDATE CHECK FAILED:', error);
      }
    };

    checkForUpdates();
  }, []);

  const handleUpdate = async () => {
    if (!availableUpdate) return;
    setIsUpdating(true);
    try {
      await availableUpdate.downloadAndInstall();
      await relaunch();
    } catch (error) {
      console.error('UPDATE INSTALL FAILED:', error);
      setIsUpdating(false);
    }
  };

  // ============================================================
  // CHECK CURRENT AUTOSTART STATUS ON MOUNT
  // ============================================================
  useEffect(() => {
    import('@tauri-apps/plugin-autostart')
      .then(({ isEnabled }) => isEnabled())
      .then((enabled) => {
        setAutostartEnabled(enabled);
      })
      .catch((err) => {
        console.warn('Autostart plugin status check failed:', err);
      });
  }, []);

  // ============================================================
  // AUTOSTART TOGGLE
  // ============================================================
  const handleToggleAutostart = async (checked: boolean) => {
    setAutostartEnabled(checked);

    try {
      const { enable, disable } = await import(
        '@tauri-apps/plugin-autostart'
      );

      if (checked) {
        await enable();
      } else {
        await disable();
      }
    } catch (err) {
      console.error('Failed to change autostart preference:', err);
      setAutostartEnabled(!checked);
    }
  };

  // ============================================================
  // LISTEN FOR PAUSE / RESUME EVENTS FROM TAURI SYSTEM TRAY
  // ============================================================
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        listen<boolean>('toggle-pause-reminders', (event) => {
          setIsPaused(!!event.payload);
        }).then((fn) => {
          unlisten = fn;
        });
      })
      .catch((err) => {
        console.warn('Tauri event API not active:', err);
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // ============================================================
  // SYNC REMINDERS TO LOCAL STORAGE
  // ============================================================
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reminders));
    } catch (e) {
      console.error('Failed to save reminders to localStorage:', e);
    }
  }, [reminders]);

  // ============================================================
  // SET OR UPDATE REMINDER
  // ============================================================
  const handleSetReminder = () => {
    if (!message.trim()) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    const formattedHour = (parseInt(hour, 10) || 12)
      .toString()
      .padStart(2, '0');

    const formattedMinute = (parseInt(minute, 10) || 0)
      .toString()
      .padStart(2, '0');

    if (editingId) {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                message: message.trim(),
                hour: formattedHour,
                minute: formattedMinute,
                amPm: ampm,
                lastTriggeredDate: null,
              }
            : r
        )
      );

      setSuccessMessage(
        `Reminder updated for ${formattedHour}:${formattedMinute} ${ampm}!`
      );

      setEditingId(null);
    } else {
      const newReminder: Reminder = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        message: message.trim(),
        hour: formattedHour,
        minute: formattedMinute,
        amPm: ampm,
        active: true,
        lastTriggeredDate: null,
        createdAt: Date.now(),
      };

      setReminders((prev) => [newReminder, ...prev]);

      setSuccessMessage(
        `Reminder set for ${formattedHour}:${formattedMinute} ${ampm}!`
      );
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // ============================================================
  // EDIT REMINDER
  // ============================================================
  const handleEditReminder = (reminder: Reminder) => {
    setMessage(reminder.message);
    setHour(reminder.hour);
    setMinute(reminder.minute);
    setAmpm(reminder.amPm);
    setEditingId(reminder.id);
    setActiveTab('new');
  };

  // ============================================================
  // CANCEL EDIT
  // ============================================================
  const handleCancelEdit = () => {
    setEditingId(null);
    setMessage('');
  };

  // ============================================================
  // DELETE REMINDER
  // ============================================================
  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));

    if (editingId === id) {
      setEditingId(null);
    }
  };

  // ============================================================
  // TOGGLE REMINDER ACTIVE
  // ============================================================
  const toggleReminderActive = (id: string) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              active: !r.active,
            }
          : r
      )
    );
  };

  // ============================================================
  // TRIGGER NATIVE FLOATING REMINDER WINDOW
  // ============================================================
  const triggerFloatingReminder = async (msgText: string) => {
    const formattedMsg =
      msgText.trim() || 'Finish design system review & update assets';

    console.log(
      `[show_reminder() called] time=${Date.now()}ms message="${formattedMsg}"`
    );

    try {
      const { invoke } = await import('@tauri-apps/api/core');

      await invoke('show_reminder', {
        message: formattedMsg,
      });
    } catch (e) {
      console.warn('Tauri API not active:', e);
    }
  };

  // ============================================================
  // TEST BUTTON
  // ============================================================
  const handleTestReminder = () => {
    console.log(`[Test Click] time=${Date.now()}ms`);

    const testMsg =
      message.trim() || 'Finish design system review & update assets';

    triggerFloatingReminder(testMsg);
  };

  // ============================================================
  // REMINDER SCHEDULER
  // ============================================================
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPaused) return;

      const now = new Date();

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();

      const todayStr = now.toDateString();

      // Find matching reminders from the latest ref state.
      const matched = remindersRef.current.filter((reminder) => {
        if (!reminder.active || reminder.lastTriggeredDate === todayStr) {
          return false;
        }

        let targetHour = parseInt(reminder.hour, 10);
        const targetMinute = parseInt(reminder.minute, 10);

        if (reminder.amPm === 'PM' && targetHour < 12) {
          targetHour += 12;
        } else if (reminder.amPm === 'AM' && targetHour === 12) {
          targetHour = 0;
        }

        return (
          currentHour === targetHour &&
          currentMinute === targetMinute &&
          currentSecond === 0
        );
      });

      if (matched.length === 0) {
        return;
      }

      const matchedIds = new Set(matched.map((m) => m.id));

      // Mark reminders as triggered for today
      setReminders((prev) =>
        prev.map((r) =>
          matchedIds.has(r.id)
            ? {
                ...r,
                lastTriggeredDate: todayStr,
              }
            : r
        )
      );

      // Trigger reminder window for first matching reminder
      triggerFloatingReminder(matched[0].message);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const hoursList = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, '0')
  );

  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <div className="w-full h-screen bg-[#070415] text-white flex select-none font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden relative">
      {/* Ambient background glows matching logo gradient palette */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Layout Container */}
      <div className="flex w-full h-full relative z-10">
        
        {/* ============================================================ */}
        {/* SIDEBAR NAVIGATION */}
        {/* ============================================================ */}
        <aside className="w-64 h-full bg-[#0d0722]/80 backdrop-blur-2xl border-r border-purple-500/15 p-6 flex flex-col justify-between shrink-0">
          
          <div className="space-y-8">
            {/* Logo Header */}
            <div className="flex items-center gap-3">
              <div className="relative p-1 rounded-2xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 shadow-[0_0_20px_rgba(225,0,152,0.3)]">
                <img
                  src={timeboundLogo}
                  alt="Timebound Logo"
                  className="w-12 h-12 rounded-xl object-contain bg-[#0c061e]"
                />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Timebound
                </h1>
                <p className="text-[11px] font-semibold text-purple-300/60 uppercase tracking-wider">
                  Reminder App
                </p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer relative ${
                  activeTab === 'new'
                    ? 'text-white bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-transparent border-l-4 border-pink-500 shadow-sm'
                    : 'text-purple-200/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bell size={18} className={activeTab === 'new' ? 'text-pink-400' : ''} />
                <span>New Reminder</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reminders')}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer relative ${
                  activeTab === 'reminders'
                    ? 'text-white bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-transparent border-l-4 border-pink-500 shadow-sm'
                    : 'text-purple-200/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <ListFilter size={18} className={activeTab === 'reminders' ? 'text-pink-400' : ''} />
                  <span>Reminders</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/30">
                  {reminders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer relative ${
                  activeTab === 'settings'
                    ? 'text-white bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-transparent border-l-4 border-pink-500 shadow-sm'
                    : 'text-purple-200/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Settings size={18} className={activeTab === 'settings' ? 'text-pink-400' : ''} />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Footer Controls */}
          <div className="pt-4 border-t border-purple-500/15 flex items-center justify-between text-purple-300/50">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="p-2 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isPaused ? 'Paused' : 'Active'}
            </div>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* MAIN VIEW CONTENT AREA */}
        {/* ============================================================ */}
        <main className="flex-1 h-full flex flex-col justify-center items-center p-8 overflow-y-auto relative">
          
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: NEW / EDIT REMINDER */}
            {activeTab === 'new' && (
              <motion.div
                key="new-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[500px] bg-[#120a28]/80 backdrop-blur-2xl border border-purple-500/20 rounded-[2.5rem] p-8 shadow-[0_0_80px_rgba(147,51,234,0.12)] relative"
              >
                {/* Form Card Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/30 shadow-inner">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">
                      {editingId ? 'Edit Reminder' : 'Set Reminder'}
                    </h2>
                    <p className="text-xs text-purple-200/60 font-medium mt-0.5">
                      Stay on track. Get things done.
                    </p>
                  </div>
                </div>

                {/* Feedback Toasts */}
                {showSuccess && (
                  <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                  </div>
                )}

                {showError && (
                  <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Please enter a reminder message!</span>
                  </div>
                )}

                {/* Form Controls */}
                <div className="space-y-5">
                  
                  {/* Message Input */}
                  <div>
                    <label className="block text-xs font-extrabold text-purple-200/70 tracking-wider uppercase mb-2">
                      What do you want to do?
                    </label>
                    <div className="bg-[#0b061a] border border-purple-500/20 focus-within:border-pink-500/50 rounded-2xl p-3.5 flex items-center gap-3 transition-all shadow-inner">
                      <Pencil size={18} className="text-pink-400 shrink-0" />
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g. Study DSA, Call Mom, Gym"
                        className="bg-transparent border-none text-white font-semibold text-sm placeholder-slate-500 focus:outline-none w-full"
                      />
                      {message && (
                        <button
                          type="button"
                          onClick={() => setMessage('')}
                          className="text-slate-500 hover:text-white cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Time & Repeat Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Time Picker */}
                    <div>
                      <label className="block text-xs font-extrabold text-purple-200/70 tracking-wider uppercase mb-2">
                        Time
                      </label>
                      <div className="bg-[#0b061a] border border-purple-500/20 rounded-2xl p-2.5 flex items-center gap-2">
                        <Clock size={16} className="text-pink-400 shrink-0 ml-1" />
                        
                        <select
                          value={hour}
                          onChange={(e) => setHour(e.target.value)}
                          className="bg-transparent text-white font-bold text-sm border-none focus:outline-none cursor-pointer"
                        >
                          {hoursList.map((h) => (
                            <option key={h} value={h} className="bg-[#0c061e] text-white">
                              {h}
                            </option>
                          ))}
                        </select>
                        
                        <span className="text-pink-400 font-bold">:</span>
                        
                        <select
                          value={minute}
                          onChange={(e) => setMinute(e.target.value)}
                          className="bg-transparent text-white font-bold text-sm border-none focus:outline-none cursor-pointer"
                        >
                          {minutesList.map((m) => (
                            <option key={m} value={m} className="bg-[#0c061e] text-white">
                              {m}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setAmpm((prev) => (prev === 'AM' ? 'PM' : 'AM'))}
                          className="ml-auto px-2 py-1 rounded-lg bg-pink-500/20 text-pink-300 font-extrabold text-xs border border-pink-500/30 hover:bg-pink-500/30 transition-colors cursor-pointer"
                        >
                          {ampm}
                        </button>
                      </div>
                    </div>

                    {/* Repeat Setting */}
                    <div>
                      <label className="block text-xs font-extrabold text-purple-200/70 tracking-wider uppercase mb-2">
                        Repeat
                      </label>
                      <div className="bg-[#0b061a] border border-purple-500/20 rounded-2xl p-3.5 flex items-center gap-2.5 text-white text-xs font-bold">
                        <Repeat size={16} className="text-pink-400 shrink-0" />
                        <span>Daily Schedule</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Buttons */}
                  <div className="pt-2 space-y-3">
                    <button
                      type="button"
                      onClick={handleSetReminder}
                      className="w-full bg-gradient-to-r from-[#ff5e3a] via-[#e10098] to-[#6e00ff] hover:opacity-95 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-[0_10px_30px_rgba(225,0,152,0.3)] transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5 text-sm cursor-pointer"
                    >
                      <Bell size={18} />
                      <span>{editingId ? 'Update Reminder' : 'Set Reminder'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestReminder}
                      className="w-full bg-[#180d35] hover:bg-[#201247] text-purple-200 border border-purple-500/30 rounded-2xl py-3 px-5 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play size={14} className="text-pink-400" />
                      <span>Test Reminder Window</span>
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="w-full bg-transparent hover:bg-white/5 text-purple-300/70 text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 2: REMINDERS LIST */}
            {activeTab === 'reminders' && (
              <motion.div
                key="reminders-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[600px] bg-[#120a28]/80 backdrop-blur-2xl border border-purple-500/20 rounded-[2.5rem] p-8 shadow-[0_0_80px_rgba(147,51,234,0.12)] space-y-6"
              >
                <div className="flex items-center justify-between border-b border-purple-500/15 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">
                      Scheduled Reminders
                    </h2>
                    <p className="text-xs text-purple-200/60 font-medium mt-0.5">
                      Active reminders will trigger floating popups automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="p-2.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Add New</span>
                  </button>
                </div>

                {reminders.length === 0 ? (
                  <div className="text-center py-12 text-purple-300/50 space-y-3">
                    <Bell size={36} className="mx-auto text-purple-400/30" />
                    <p className="text-sm font-semibold">No reminders scheduled yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="bg-[#0b061a] border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-purple-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="px-3 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 font-extrabold text-xs shrink-0">
                            {reminder.hour}:{reminder.minute} {reminder.amPm}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {reminder.message}
                            </p>
                            <p className="text-[11px] text-purple-300/50 font-medium">
                              Repeats Daily
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleReminderActive(reminder.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              reminder.active
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/5 text-slate-400 border border-white/10'
                            }`}
                          >
                            {reminder.active ? 'Active' : 'Paused'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditReminder(reminder)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-purple-200 hover:text-white border border-purple-500/20 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* VIEW 3: SETTINGS */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[500px] bg-[#120a28]/80 backdrop-blur-2xl border border-purple-500/20 rounded-[2.5rem] p-8 shadow-[0_0_80px_rgba(147,51,234,0.12)] space-y-6"
              >
                <div className="border-b border-purple-500/15 pb-4">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    Settings & Preferences
                  </h2>
                  <p className="text-xs text-purple-200/60 font-medium mt-0.5">
                    Manage system startup and application behavior.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer p-4 rounded-2xl bg-[#0b061a] border border-purple-500/20 hover:border-purple-500/40 transition-all select-none">
                    <span className="text-xs font-bold text-white tracking-wide">
                      Launch at Windows startup
                    </span>
                    <input
                      type="checkbox"
                      checked={autostartEnabled}
                      onChange={(e) => handleToggleAutostart(e.target.checked)}
                      className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                    />
                  </label>

                  <div className="p-4 rounded-2xl bg-[#0b061a] border border-purple-500/20 flex items-center justify-between text-xs font-bold text-white">
                    <span>Tray Reminder Control</span>
                    <span className="text-purple-300/60 font-normal">
                      {isPaused ? 'Reminders Paused via Tray' : 'Reminders Active'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* ============================================================ */}
          {/* UPDATE NOTIFICATION BANNER */}
          {/* ============================================================ */}
          {availableUpdate !== null && (
            <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#120a28]/95 border border-pink-500/40 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 shrink-0 border border-pink-500/30">
                  <Bell size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Timebound Update Available
                  </h4>
                  <p className="text-xs text-purple-200/70 mt-0.5">
                    Version {availableUpdate.version} is ready to install.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-500/15">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => setAvailableUpdate(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-purple-200 hover:text-white border border-purple-500/20 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Later
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleUpdate}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdating ? 'Updating...' : 'Update Now'}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}