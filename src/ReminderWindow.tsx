import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import spiderManImg from './assets/spider-man-coming-down.png';

export default function ReminderWindow() {
  const [spiderArrived, setSpiderArrived] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Extract message from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const message = searchParams.get('msg') || 'Time to drink water! 💧';

  // 1. Spider-Man arrives at final position -> Wait 150ms -> Show card
  const handleSpiderArrived = () => {
    setSpiderArrived(true);
    setTimeout(() => {
      setShowCard(true);
    }, 150);
  };

  // 2. Dismiss sequence: Fade out card (150ms) -> Slide Spider-Man up (600ms) -> Close window
  const handleDismiss = () => {
    setShowCard(false);
    setTimeout(() => {
      setIsDismissing(true);
    }, 150);
  };

  // 3. Close window after Spider-Man slides back upward off-screen
  const handleExitComplete = () => {
    try {
      import('@tauri-apps/api/window')
        .then(({ getCurrentWindow }) => {
          getCurrentWindow().close();
        })
        .catch(() => {
          window.close();
        });
    } catch {
      window.close();
    }
  };

  return (
    <div className="w-full h-screen bg-transparent flex items-start justify-end pr-6 pt-0 select-none overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Notification Container (Spider-Man is the anchor element) */}
      <div className="relative inline-block">
        {/* Spider-Man PNG (Primary Animation: straight vertical translateY only, 700ms easeOut) */}
        <motion.img
          src={spiderManImg}
          alt="Spider-Man"
          initial={{ y: -550 }}
          animate={{ y: isDismissing ? -550 : 0 }}
          transition={{
            duration: isDismissing ? 0.6 : 0.7,
            ease: isDismissing ? 'easeIn' : 'easeOut',
          }}
          onAnimationComplete={() => {
            if (!spiderArrived) {
              handleSpiderArrived();
            } else if (isDismissing) {
              handleExitComplete();
            }
          }}
          className="w-[240px] h-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.8)] pointer-events-none block"
        />

        {/* Reminder Card (Positioned absolutely to the LEFT of Spider-Man anchor) */}
        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute right-full mr-3 top-[140px] w-[250px] bg-white text-slate-900 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100 z-30"
            >
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-red-500 mb-1.5">
                REMINDER
              </div>
              <p className="text-slate-900 font-bold text-sm leading-snug break-words mb-3">
                {message}
              </p>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
