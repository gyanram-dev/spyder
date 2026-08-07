import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Repeat, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import spiderManImg from './assets/spider-man-coming-down.png';

export default function App() {
  const [message, setMessage] = useState('Finish design system review & update assets');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('30');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  const [activeReminder, setActiveReminder] = useState<{
    message: string;
    hour: string;
    minute: string;
    ampm: 'AM' | 'PM';
    triggered: boolean;
  } | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  // Set Reminder handler
  const handleSetReminder = () => {
    if (!message.trim()) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    // Format hour and minute digits
    const formattedHour = (parseInt(hour, 10) || 12).toString().padStart(2, '0');
    const formattedMinute = (parseInt(minute, 10) || 0).toString().padStart(2, '0');

    setActiveReminder({
      message: message.trim(),
      hour: formattedHour,
      minute: formattedMinute,
      ampm,
      triggered: false,
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Trigger Native Floating Reminder Window
  const triggerFloatingReminder = async (msgText: string) => {
    const formattedMsg = msgText.trim() || 'Finish design system review & update assets';

    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      
      const existing = await WebviewWindow.getByLabel('reminder');
      if (existing) {
        await existing.destroy();
      }

      const screenWidth = window.screen.availWidth || 1920;
      const xPos = Math.max(0, screenWidth - 540);
      const yPos = 20;

      const webview = new WebviewWindow('reminder', {
        url: `index.html?window=reminder&msg=${encodeURIComponent(formattedMsg)}`,
        title: 'Spydy Floating Reminder',
        width: 520,
        height: 440,
        x: xPos,
        y: yPos,
        transparent: true,
        decorations: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        shadow: false,
        focus: false,
      });

      await webview.once('tauri://created', () => {
        console.log('Floating reminder window created successfully');
      });
    } catch (e) {
      console.warn('Tauri API not active, rendering top-right floating overlay fallback:', e);
      setPopupMessage(formattedMsg);
      setIsModalOpen(true);
    }
  };

  // Test button handler
  const handleTestReminder = () => {
    const testMsg = message.trim() || 'Finish design system review & update assets';
    triggerFloatingReminder(testMsg);
  };

  // Time checking logic (checks local system time every second)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!activeReminder || activeReminder.triggered) return;

      const now = new Date();
      let targetHour = parseInt(activeReminder.hour, 10);
      const targetMinute = parseInt(activeReminder.minute, 10);

      if (activeReminder.ampm === 'PM' && targetHour < 12) {
        targetHour += 12;
      } else if (activeReminder.ampm === 'AM' && targetHour === 12) {
        targetHour = 0;
      }

      if (now.getHours() === targetHour && now.getMinutes() === targetMinute && now.getSeconds() === 0) {
        triggerFloatingReminder(activeReminder.message);
        setActiveReminder((prev) => (prev ? { ...prev, triggered: true } : null));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeReminder]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen w-full bg-gradient-to-br from-[#24050d] via-[#160207] to-[#090103] text-white flex items-center justify-center p-6 relative overflow-hidden select-none"
    >
      {/* Subtle ambient lighting */}
      <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] bg-[#6e0f1e]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] bg-[#8b1528]/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Reminder Card (Perfectly Centered in Normal Layout Flow) */}
      <div className="w-full max-w-[440px] min-h-[540px] bg-[#1a0409]/95 backdrop-blur-2xl border border-[#4d0c1a] rounded-[2.25rem] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.9)] p-8 md:p-10 relative z-10 space-y-8 my-auto flex flex-col justify-between">
        
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
            Set a quick reminder to keep your workflow webbed together.
          </p>
        </div>

        {/* Message Input */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#e0b5be] uppercase tracking-wider block">
            Reminder Message
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-[#110205] border border-[#540c1b] rounded-2xl px-5 py-4 text-sm text-white placeholder-[#7a525a] focus:outline-none focus:border-[#9e182e] shadow-inner transition-colors"
            placeholder="What do you need to be reminded of?"
          />
        </div>

        {/* Schedule Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#e0b5be] uppercase tracking-wider block">
            Schedule Time
          </label>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#110205] border border-[#540c1b] rounded-2xl p-4 shadow-inner">
            
            {/* Hour & Minute Inputs */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <Clock size={18} className="text-[#ff4d5a]" />
              <div className="flex items-center gap-1 font-mono text-lg font-bold bg-[#26050d] px-3 py-1.5 rounded-xl border border-[#540c1b]">
                <input
                  type="text"
                  value={hour}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setHour(val);
                  }}
                  onBlur={() => {
                    let num = parseInt(hour, 10);
                    if (isNaN(num) || num < 1) num = 12;
                    if (num > 12) num = 12;
                    setHour(num.toString().padStart(2, '0'));
                  }}
                  className="w-7 text-center bg-transparent text-white focus:outline-none"
                />
                <span className="text-[#b88c96] animate-pulse">:</span>
                <input
                  type="text"
                  value={minute}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setMinute(val);
                  }}
                  onBlur={() => {
                    let num = parseInt(minute, 10);
                    if (isNaN(num) || num < 0) num = 0;
                    if (num > 59) num = 59;
                    setMinute(num.toString().padStart(2, '0'));
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
                  className={`px-3.5 py-1.5 rounded-lg transition-colors ${
                    ampm === 'AM' ? 'bg-[#9e182e] text-white shadow-md' : 'text-[#b88c96]'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setAmpm('PM')}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors ${
                    ampm === 'PM' ? 'bg-[#9e182e] text-white shadow-md' : 'text-[#b88c96]'
                  }`}
                >
                  PM
                </button>
              </div>

              {/* Repeat Button */}
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#26050d] border border-[#540c1b] text-xs font-semibold text-[#e0b5be] cursor-default"
              >
                <Repeat size={14} className="text-[#ff4d5a]" />
                <span>Never</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons & Feedback Toast */}
        <div className="space-y-2 pt-2">
          {showSuccess && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 rounded-xl px-4 py-2">
              <CheckCircle2 size={14} />
              <span>Reminder set for {activeReminder?.hour}:{activeReminder?.minute} {activeReminder?.ampm}!</span>
            </div>
          )}

          {showError && (
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-xl px-4 py-2">
              <AlertCircle size={14} />
              <span>Please enter a reminder message.</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSetReminder}
              className="flex-1 py-4 px-5 rounded-2xl bg-gradient-to-r from-[#9e182e] via-[#b81d37] to-[#d62845] text-white font-bold text-sm shadow-[0_10px_25px_-5px_rgba(158,24,46,0.5)] border border-[#ff4d5a]/30 active:scale-[0.98] transition-transform"
            >
              Set Reminder
            </button>
            
            <button
              type="button"
              onClick={handleTestReminder}
              className="py-4 px-5 rounded-2xl bg-[#26050d] text-[#e0b5be] font-bold text-sm border border-[#540c1b] active:scale-[0.98] transition-transform"
            >
              Test
            </button>
          </div>
        </div>

      </div>

      {/* Floating Spider-Man Mascot (Anchored to top-right window corner, web at top-0, height equal to card, overlaps upper-right corner by 10-15%) */}
      <div className="absolute top-0 right-[6%] sm:right-[12%] md:right-[18%] lg:right-[22%] z-20 pointer-events-none">
        <img
          src={spiderManImg}
          alt="Spider-Man Coming Down"
          className="h-[480px] md:h-[530px] w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)]"
        />
      </div>

      {/* Fallback Top-Right Floating Reminder Overlay (White card matching reference image) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed top-[60px] right-[260px] z-50 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.88, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.88, x: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-[260px] bg-white text-slate-900 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100 relative"
            >
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-red-500 mb-1.5">
                REMINDER
              </div>
              <p className="text-slate-900 font-bold text-sm sm:text-base leading-snug break-words mb-3">
                {popupMessage}
              </p>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}






