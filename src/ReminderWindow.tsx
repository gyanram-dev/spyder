import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import spidermanImg from './assets/spiderman.png';
import animeGirlImg from './assets/anime girl.png';
import ninjaImg from './assets/black ninja.png';
import foxSpiritImg from './assets/fox spirit.png';
import littlePandaImg from './assets/little panda.png';

export type ReminderCharacter =
  | 'spiderman'
  | 'animeGirl'
  | 'ninja'
  | 'foxSpirit'
  | 'littlePanda';

export const characterAssets: Record<ReminderCharacter, string> = {
  spiderman: spidermanImg,
  animeGirl: animeGirlImg,
  ninja: ninjaImg,
  foxSpirit: foxSpiritImg,
  littlePanda: littlePandaImg,
};

export const characterNames: Record<ReminderCharacter, string> = {
  spiderman: '🕷 Spider-Man',
  animeGirl: '🌸 Anime Girl',
  ninja: '🥷 Black Ninja',
  foxSpirit: '🦊 Fox Spirit',
  littlePanda: '🐼 Little Panda',
};

export const isValidCharacter = (char: any): char is ReminderCharacter => {
  return [
    'spiderman',
    'animeGirl',
    'ninja',
    'foxSpirit',
    'littlePanda',
  ].includes(char);
};

export const getValidCharacter = (char: any): ReminderCharacter => {
  if (isValidCharacter(char)) return char;
  return 'spiderman';
};

// Preload character image assets into browser memory to eliminate high-res image decode lag
if (typeof window !== 'undefined') {
  Object.values(characterAssets).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

export interface ReminderQueueItem {
  message: string;
  character: ReminderCharacter;
}

type ReminderState = 'Hidden' | 'SpiderEntering' | 'ShowingCard' | 'SpiderLeaving';

export default function ReminderWindow() {
  const [queue, setQueue] = useState<ReminderQueueItem[]>([]);
  const [currentState, setCurrentState] = useState<ReminderState>('Hidden');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [currentCharacter, setCurrentCharacter] = useState<ReminderCharacter>('spiderman');
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Listen for trigger-reminder event from Tauri backend
  useEffect(() => {
    let active = true;
    let unlistenFn: (() => void) | null = null;

    console.log(`[FRONTEND DIAGNOSTIC] ReminderWindow mounted | href=${typeof window !== 'undefined' ? window.location.href : 'unknown'}`);

    getCurrentWindow()
      .listen<{ message: string; character?: ReminderCharacter }>('trigger-reminder', (event) => {
        console.log(`[FRONTEND DIAGNOSTIC] ReminderWindow RECEIVED 'trigger-reminder' event! time=${Date.now()}ms payload=`, event.payload);
        const msg = event.payload?.message || 'Time to drink water! 💧';
        const char = getValidCharacter(event.payload?.character);
        setQueue((prev) => [...prev, { message: msg, character: char }]);
      })
      .then((fn) => {
        if (active) {
          console.log('[FRONTEND DIAGNOSTIC] trigger-reminder listener attached successfully.');
          unlistenFn = fn;
        } else {
          fn();
        }
      })
      .catch((err) => {
        console.warn('[FRONTEND DIAGNOSTIC ERROR] Failed to listen for trigger-reminder event:', err);
      });

    return () => {
      active = false;
      if (unlistenFn) {
        unlistenFn();
      }
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Ensure window is hidden on initial application mount while event listener remains active
  useEffect(() => {
    if (currentState === 'Hidden' && queue.length === 0) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => {
          invoke('hide_reminder').catch(() => {
            getCurrentWindow().hide();
          });
        })
        .catch(() => {
          getCurrentWindow().hide();
        });
    }
  }, []);

  // Process queue when state is Hidden
  useEffect(() => {
    if (currentState === 'Hidden' && queue.length > 0) {
      setQueue((prev) => {
        if (prev.length === 0) return prev;
        const [nextItem, ...remaining] = prev;
        setCurrentMessage(nextItem.message);
        setCurrentCharacter(getValidCharacter(nextItem.character));
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

  // 1. Character arrives at final position -> Wait 150ms -> Show card
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

  // 2. Dismiss sequence: Fade out card -> Slide character up -> Hide window after animation
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

  const validCharacterKey = getValidCharacter(currentCharacter);
  const activeCharacterAsset = characterAssets[validCharacterKey] || characterAssets.spiderman;

  return (
    <div className="w-full h-screen bg-transparent flex items-start justify-end pr-2 pt-0 select-none overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Notification Container */}
      {showSpider && (
        <div className="relative inline-block">
          {/* Character PNG */}
          <motion.img
            key={currentMessage + validCharacterKey}
            src={activeCharacterAsset}
            alt={validCharacterKey}
            initial={{ y: -440 }}
            animate={{ y: isLeaving ? -440 : 0 }}
            transition={{
              duration: isLeaving ? 0.5 : 0.6,
              ease: isLeaving ? 'easeIn' : 'easeOut',
            }}
            onAnimationComplete={() => {
              if (currentState === 'SpiderLeaving') {
                handleExitComplete();
              } else if (currentState === 'SpiderEntering') {
                handleSpiderArrived();
              }
            }}
            className="w-[200px] max-h-[300px] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)] pointer-events-none block"
          />

          {/* Reminder Card (Positioned absolutely to the LEFT of character anchor) */}
          <AnimatePresence>
            {showCard && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute right-full mr-3 top-[90px] w-[240px] bg-[#0c061e] text-white rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-purple-500/30 z-30"
              >
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-pink-400 mb-1.5">
                  REMINDER
                </div>
                <p className="text-white font-bold text-xs leading-snug break-words mb-3">
                  {currentMessage}
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
