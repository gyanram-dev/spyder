import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Repeat,
  Bell,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

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

const LOCAL_STORAGE_KEY = 'spydy_reminders';

const getInitialReminders = (): Reminder[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);

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
  const [message, setMessage] = useState(
    'Finish design system review & update assets'
  );
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
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(reminders)
      );
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

    const formattedHour = (
      parseInt(hour, 10) || 12
    )
      .toString()
      .padStart(2, '0');

    const formattedMinute = (
      parseInt(minute, 10) || 0
    )
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
        id:
          Date.now().toString() +
          Math.random().toString(36).substring(2, 6),
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
    setReminders((prev) =>
      prev.filter((r) => r.id !== id)
    );

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
      msgText.trim() ||
      'Finish design system review & update assets';

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
      message.trim() ||
      'Finish design system review & update assets';

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
        if (
          !reminder.active ||
          reminder.lastTriggeredDate === todayStr
        ) {
          return false;
        }

        let targetHour = parseInt(reminder.hour, 10);
        const targetMinute = parseInt(
          reminder.minute,
          10
        );

        if (
          reminder.amPm === 'PM' &&
          targetHour < 12
        ) {
          targetHour += 12;
        } else if (
          reminder.amPm === 'AM' &&
          targetHour === 12
        ) {
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

      const matchedIds = new Set(
        matched.map((m) => m.id)
      );

      // Mark matched reminders as triggered.
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

      // Trigger each reminder exactly once.
      matched.forEach((reminder) => {
        triggerFloatingReminder(reminder.message);
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isPaused]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.5,
        ease: 'easeOut',
      }}
      className="min-h-screen w-full bg-gradient-to-br from-[#24050d] via-[#160207] to-[#090103] text-white flex items-center justify-center p-6 relative overflow-hidden select-none"
    >
      {/* Subtle ambient lighting */}
      <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] bg-[#6e0f1e]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] bg-[#8b1528]/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Reminder Card */}
      <div className="w-full max-w-[460px] min-h-[540px] bg-[#1a0409]/95 backdrop-blur-2xl border border-[#4d0c1a] rounded-[2.25rem] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.9)] p-8 md:p-10 relative z-10 space-y-6 my-auto flex flex-col justify-between">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#3d0812] text-[#ff4d5a] border border-[#660e1e] shadow-inner">
              <Bell size={22} />
            </span>

            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Spydy Reminder
            </h1>
          </div>

          <p className="text-xs md:text-sm text-[#b88c96] pl-12 font-medium leading-relaxed">
            Set quick reminders to keep your workflow webbed together.
          </p>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#e0b5be] uppercase tracking-wider block">
            Reminder Message
          </label>

          <input
            type="text"
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            className="w-full bg-[#110205] border border-[#540c1b] rounded-2xl px-5 py-3.5 text-sm text-white placeholder-[#7a525a] focus:outline-none focus:border-[#9e182e] shadow-inner transition-colors"
            placeholder="What do you need to be reminded of?"
          />
        </div>

        {/* Schedule Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#e0b5be] uppercase tracking-wider block">
            Schedule Time
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#110205] border border-[#540c1b] rounded-2xl p-3.5 shadow-inner">

            {/* Hour & Minute Inputs */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <Clock size={18} className="text-[#ff4d5a]" />

              <div className="flex items-center gap-1 font-mono text-lg font-bold bg-[#26050d] px-3 py-1.5 rounded-xl border border-[#540c1b]">
                <input
                  type="text"
                  value={hour}
                  onChange={(e) => {
                    const val = e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 2);

                    setHour(val);
                  }}
                  onBlur={() => {
                    let num = parseInt(hour, 10);

                    if (isNaN(num) || num < 1) {
                      num = 12;
                    }

                    if (num > 12) {
                      num = 12;
                    }

                    setHour(
                      num.toString().padStart(2, '0')
                    );
                  }}
                  className="w-7 text-center bg-transparent text-white focus:outline-none"
                />

                <span className="text-[#b88c96] animate-pulse">
                  :
                </span>

                <input
                  type="text"
                  value={minute}
                  onChange={(e) => {
                    const val = e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 2);

                    setMinute(val);
                  }}
                  onBlur={() => {
                    let num = parseInt(minute, 10);

                    if (isNaN(num) || num < 0) {
                      num = 0;
                    }

                    if (num > 59) {
                      num = 59;
                    }

                    setMinute(
                      num.toString().padStart(2, '0')
                    );
                  }}
                  className="w-7 text-center bg-transparent text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">

              {/* AM/PM Selector */}
              <div className="flex items-center bg-[#26050d] p-1 rounded-xl border border-[#540c1b] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAmpm('AM')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    ampm === 'AM'
                      ? 'bg-[#9e182e] text-white shadow-md'
                      : 'text-[#b88c96]'
                  }`}
                >
                  AM
                </button>

                <button
                  type="button"
                  onClick={() => setAmpm('PM')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    ampm === 'PM'
                      ? 'bg-[#9e182e] text-white shadow-md'
                      : 'text-[#b88c96]'
                  }`}
                >
                  PM
                </button>
              </div>

              {/* Repeat Button */}
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#26050d] border border-[#540c1b] text-xs font-semibold text-[#e0b5be] cursor-default"
              >
                <Repeat
                  size={14}
                  className="text-[#ff4d5a]"
                />

                <span>Never</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons & Feedback Toast */}
        <div className="space-y-2">

          {showSuccess && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-xl px-4 py-2">
              <CheckCircle2 size={14} />
              <span>{successMessage}</span>
            </div>
          )}

          {showError && (
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-xl px-4 py-2">
              <AlertCircle size={14} />
              <span>
                Please enter a reminder message.
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={handleSetReminder}
              className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#9e182e] via-[#b81d37] to-[#d62845] text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(158,24,46,0.5)] border border-[#ff4d5a]/30 active:scale-[0.98] transition-transform cursor-pointer"
            >
              {editingId
                ? 'Update Reminder'
                : 'Set Reminder'}
            </button>

            <button
              type="button"
              onClick={handleTestReminder}
              className="py-3.5 px-5 rounded-2xl bg-[#26050d] text-[#e0b5be] font-bold text-sm border border-[#540c1b] active:scale-[0.98] transition-transform cursor-pointer"
            >
              Test
            </button>
          </div>
        </div>

        {/* Active & Saved Reminders List */}
        <div className="space-y-3 pt-3 border-t border-[#3d0812]">

          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#e0b5be] uppercase tracking-wider block">
              Reminders ({reminders.length})
            </label>

            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X size={12} />
                Cancel Edit
              </button>
            )}
          </div>

          {reminders.length === 0 ? (
            <div className="text-center py-5 border border-dashed border-[#540c1b] rounded-2xl text-xs text-[#7a525a]">
              No reminders scheduled yet. Add one above!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">

              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`bg-[#110205] border ${
                    editingId === reminder.id
                      ? 'border-[#ff4d5a]'
                      : 'border-[#540c1b]'
                  } rounded-2xl p-3.5 shadow-inner flex items-center justify-between gap-3 group hover:border-[#801328] transition-all`}
                >

                  <div className="flex-1 min-w-0 space-y-1">

                    <p
                      className="text-sm font-semibold text-white truncate"
                      title={reminder.message}
                    >
                      {reminder.message}
                    </p>

                    <div className="flex items-center gap-2.5 flex-wrap">

                      <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#b88c96]">
                        <Clock
                          size={13}
                          className="text-[#ff4d5a]"
                        />

                        {reminder.hour}:{reminder.minute}{' '}
                        {reminder.amPm}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          toggleReminderActive(reminder.id)
                        }
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          reminder.active
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60'
                            : 'bg-zinc-900/80 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800/80'
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            reminder.active
                              ? 'bg-emerald-400 animate-pulse'
                              : 'bg-zinc-500'
                          }`}
                        />

                        {reminder.active
                          ? 'Active'
                          : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">

                    <button
                      type="button"
                      onClick={() =>
                        handleEditReminder(reminder)
                      }
                      className="p-2 rounded-xl bg-[#26050d] text-[#e0b5be] hover:text-white border border-[#540c1b] hover:border-[#ff4d5a]/40 transition-colors cursor-pointer"
                      title="Edit reminder"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteReminder(reminder.id)
                      }
                      className="p-2 rounded-xl bg-[#26050d] text-rose-400 hover:text-rose-300 border border-[#540c1b] hover:border-rose-800/60 transition-colors cursor-pointer"
                      title="Delete reminder"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Startup Settings */}
        <div className="pt-3 border-t border-[#3d0812]">

          <label className="flex items-center justify-between cursor-pointer p-3 rounded-2xl bg-[#110205] border border-[#540c1b] hover:border-[#801328] transition-all select-none">

            <span className="text-xs font-bold text-[#e0b5be] tracking-wide">
              Launch at Windows startup
            </span>

            <input
              type="checkbox"
              checked={autostartEnabled}
              onChange={(e) =>
                handleToggleAutostart(e.target.checked)
              }
              className="w-4 h-4 accent-[#ff4d5a] rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Update Notification */}
        {availableUpdate !== null && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-[#1c0409] border border-[#ff4d5a]/40 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-xl bg-[#360812] text-[#ff4d5a] shrink-0 border border-[#540c1b]">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-wide">
                  Spydy Update Available
                </h4>
                <p className="text-xs text-[#e0b5be] mt-0.5">
                  Version {availableUpdate.version} is ready to install.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#3d0812]">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setAvailableUpdate(null)}
                className="px-3 py-1.5 rounded-xl bg-[#26050d] hover:bg-[#360812] text-[#e0b5be] hover:text-white border border-[#540c1b] text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleUpdate}
                className="px-3 py-1.5 rounded-xl bg-[#ff4d5a] hover:bg-[#e63946] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {isUpdating ? 'Updating...' : 'Update Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}