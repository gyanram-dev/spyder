import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import spiderManImg from './assets/spider-man-coming-down.png';

type ReminderState = 'Hidden' | 'SpiderEntering' | 'ShowingCard' | 'SpiderLeaving';

export default function ReminderWindow() {
  const [queue, setQueue] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState<ReminderState>('Hidden');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for trigger-reminder event from Tauri backend
  useEffect(() => {
    let active = true;
    let unlistenFn: (() => void) | null = null;

    getCurrentWindow()
      .listen<{ message: string }>('trigger-reminder', (event) => {
        console.log(`[ReminderWindow received trigger-reminder] time=${Date.now()}ms payload=`, event.payload);
        const msg = event.payload?.message || 'Time to drink water! 💧';
        setQueue((prev) => [...prev, msg]);
      })
      .then((fn) => {
        if (active) {
          unlistenFn = fn;
        } else {
          fn();
        }
      })
      .catch((err) => {
        console.warn('Failed to listen for trigger-reminder event:', err);
      });

    return () => {
      active = false;
      if (unlistenFn) {
        unlistenFn();
      }
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Process queue when state is Hidden
  useEffect(() => {
    if (currentState === 'Hidden' && queue.length > 0) {
      setQueue((prev) => {
        if (prev.length === 0) return prev;
        const [nextMsg, ...remaining] = prev;
        setCurrentMessage(nextMsg);
        setCurrentState('SpiderEntering');
        return remaining;
      });

      // Wait for React to commit off-screen (y: -650) initial state, then reveal native window
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          import('@tauri-apps/api/core')
            .then(({ invoke }) => {
              invoke('reveal_reminder').catch(() => {
                getCurrentWindow().show();
              });
            })
            .catch(() => {
              getCurrentWindow().show();
            });
        });
      });
    }
  }, [currentState, queue]);

  // 1. Spider-Man arrives at final position -> Wait 150ms -> Show card
  const handleSpiderArrived = () => {
    if (currentState === 'SpiderEntering') {
      setTimeout(() => {
        setCurrentState('ShowingCard');
      }, 150);
    }
  };

  // 3. Complete exit animation -> transition to Hidden -> signal Rust backend to hide window
  const handleExitComplete = () => {
    import('@tauri-apps/api/event')
      .then(({ emit }) => emit('stop-reminder-sound'))
      .catch(() => {});

    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    setCurrentState((prev) => {
      if (prev !== 'SpiderLeaving') return prev;

      console.log(`[Spider exit animation complete] time=${Date.now()}ms calling hide_reminder`);
      try {
        import('@tauri-apps/api/core')
          .then(({ invoke }) => {
            invoke('hide_reminder').catch(() => {
              getCurrentWindow().hide();
            });
          })
          .catch(() => {
            getCurrentWindow().hide();
          });
      } catch {
        getCurrentWindow().hide();
      }
      return 'Hidden';
    });
    setCurrentMessage('');
  };

  // 2. Dismiss sequence: Fade out card -> Slide Spider-Man up -> Hide window after animation
  const handleDismiss = () => {
    console.log(`[Dismiss clicked] time=${Date.now()}ms currentState=${currentState}`);
    import('@tauri-apps/api/event')
      .then(({ emit }) => emit('stop-reminder-sound'))
      .catch(() => {});

    if (currentState === 'ShowingCard') {
      setCurrentState('SpiderLeaving');
      // Schedule guaranteed window hide after exit animation completes (150ms fade + 600ms slide = 750ms)
      exitTimerRef.current = setTimeout(() => {
        handleExitComplete();
      }, 750);
    }
  };

  const showSpider = currentState !== 'Hidden';
  const showCard = currentState === 'ShowingCard';
  const isLeaving = currentState === 'SpiderLeaving';

  return (
    <div className="w-full h-screen bg-transparent flex items-start justify-end pr-4 pt-0 select-none overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Notification Container (Spider-Man is the anchor element) */}
      {showSpider && (
        <div className="relative inline-block">
          {/* Spider-Man PNG (Primary Animation: straight vertical translateY only, 700ms easeOut) */}
          <motion.img
            key={currentMessage}
            src={spiderManImg}
            alt="Spider-Man"
            initial={{ y: -650 }}
            animate={{ y: isLeaving ? -650 : 0 }}
            transition={{
              duration: isLeaving ? 0.6 : 0.7,
              ease: isLeaving ? 'easeIn' : 'easeOut',
            }}
            onAnimationComplete={() => {
              if (currentState === 'SpiderLeaving') {
                handleExitComplete();
              } else if (currentState === 'SpiderEntering') {
                handleSpiderArrived();
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
                  {currentMessage}
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
      )}
    </div>
  );
}
