import fahhWavUrl from './assets/sounds/fahh.wav';
import fahhAudioUrl from './assets/sounds/fahh.mp3';

const DB_NAME = 'TimeboundAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB max

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate audio file format and size
 */
export const validateAudioFile = (file: File): AudioValidationResult => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const filename = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Invalid file type. Only .mp3, .wav, .ogg, and .m4a files are supported.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds 15MB limit.',
    };
  }

  return { valid: true };
};

/**
 * Open or initialize IndexedDB
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save audio file binary to IndexedDB
 */
export const saveAudioFile = async (
  file: File
): Promise<{ soundId: string; soundName: string }> => {
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid audio file');
  }

  const db = await openDB();
  const soundId = `sound_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type || 'audio/mpeg' });

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const putReq = store.put(blob, soundId);

    putReq.onsuccess = () => {
      resolve({
        soundId,
        soundName: file.name,
      });
    };
    putReq.onerror = () => reject(putReq.error);
  });
};

/**
 * Retrieve audio file Blob from IndexedDB
 */
export const getAudioFile = async (soundId: string): Promise<Blob | null> => {
  if (!soundId) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(soundId);

      getReq.onsuccess = () => {
        const result = getReq.result;
        resolve(result instanceof Blob ? result : null);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (e) {
    console.error('Failed to read audio from IndexedDB:', e);
    return null;
  }
};

/**
 * Delete audio file from IndexedDB
 */
export const deleteAudioFile = async (soundId: string): Promise<void> => {
  if (!soundId) return;
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(soundId);
  } catch (e) {
    console.warn('Failed to delete audio from IndexedDB:', e);
  }
};

/**
 * Play Timebound default sound (fahh.mp3)
 */
export type SoundType = 'none' | 'default' | 'custom';

// Pre-unlock browser/WebKitGTK audio context on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudioContext = () => {
    try {
      const a = new Audio(fahhAudioUrl);
      a.volume = 0.001;
      const p = a.play();
      if (p) {
        p.then(() => {
          a.pause();
          a.currentTime = 0;
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  };
  window.addEventListener('click', unlockAudioContext, { once: true });
  window.addEventListener('keydown', unlockAudioContext, { once: true });
}

/**
 * Pure Web Audio API Synthesizer Chime Fallback
 * Generates a clean digital chime sound (E5 -> G#5 -> B5 melody)
 * Works 100% in software without external MP3 files, GStreamer decoders, or network requests.
 */
export const playSynthesizedChime = (): { stop: () => void } => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      console.warn('[AUDIO FALLBACK ERROR] AudioContext not supported in this browser engine.');
      return { stop: () => {} };
    }

    const ctx = new AudioCtx();
    console.log('[AUDIO FALLBACK] Playing Web Audio API synthesized chime melody.');

    const notes = [659.25, 830.61, 987.77]; // E5, G#5, B5 frequencies
    const startTime = ctx.currentTime;
    const oscs: OscillatorNode[] = [];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.15);

      gain.gain.setValueAtTime(0.001, startTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.3, startTime + idx * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + idx * 0.15);
      osc.stop(startTime + idx * 0.15 + 0.45);

      oscs.push(osc);
    });

    return {
      stop: () => {
        try {
          oscs.forEach((osc) => osc.stop());
          ctx.close();
        } catch {
          // ignore
        }
      },
    };
  } catch (e) {
    console.warn('[AUDIO FALLBACK ERROR] Synthesizer chime failed:', e);
    return { stop: () => {} };
  }
};

/**
 * Play Timebound default WAV sound asset
 */
export const playDefaultChimeSound = (): { stop: () => void } => {
  let audio: HTMLAudioElement | null = null;
  let synthStop: (() => void) | null = null;

  try {
    console.log('[AUDIO] attempting reminder sound');
    console.log('[AUDIO] sound URL/path:', fahhWavUrl);
    audio = new Audio(fahhWavUrl);

    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          console.log('[AUDIO] playback started');
        })
        .catch((err) => {
          console.warn('[AUDIO ERROR] Default WAV audio playback rejected/failed:', err);
          console.log('[AUDIO FALLBACK] Triggering Web Audio API synthesizer chime fallback.');
          const synth = playSynthesizedChime();
          synthStop = synth.stop;
        });
    }

    return {
      stop: () => {
        try {
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
          if (synthStop) {
            synthStop();
          }
        } catch (e) {
          console.warn('[AUDIO ERROR] Error stopping default audio:', e);
        }
      },
    };
  } catch (e) {
    console.warn('[AUDIO ERROR] Default WAV audio initialization error:', e);
    console.log('[AUDIO FALLBACK] Triggering Web Audio API synthesizer chime fallback.');
    return playSynthesizedChime();
  }
};

/**
 * Canonical sound playback function for Preview, Test Reminder, and Scheduled Reminders
 */
export const playReminderSound = (
  soundType: SoundType = 'default',
  customSoundId?: string
): { stop: () => void } => {
  console.log(`[REMINDER] trigger received | soundType=${soundType}`);

  if (soundType === 'none') {
    console.log('[AUDIO] Sound set to none. Skipping playback.');
    return { stop: () => {} };
  }

  const isLinux =
    typeof navigator !== 'undefined' &&
    /linux/i.test(navigator.userAgent || navigator.platform);

  if (isLinux && soundType === 'default') {
    console.log('[AUDIO] Linux platform detected. Triggering Rust native audio command play_native_sound.');
    import('@tauri-apps/api/core')
      .then(({ invoke }) => {
        invoke('play_native_sound').catch((err) => {
          console.warn('[AUDIO ERROR] Tauri play_native_sound invoke failed:', err);
          playDefaultChimeSound();
        });
      })
      .catch(() => {
        playDefaultChimeSound();
      });

    return { stop: () => {} };
  }

  if (soundType === 'custom' && customSoundId) {
    console.log(`[AUDIO] Attempting custom sound playback | soundId=${customSoundId}`);
    let customController: { stop: () => void } | null = null;
    getAudioFile(customSoundId)
      .then((blob) => {
        if (blob) {
          const res = playCustomAudioBlob(blob);
          customController = { stop: res.stop };
        } else {
          console.warn('[AUDIO ERROR] Custom sound file not found. Falling back to default WAV sound.');
          customController = playDefaultChimeSound();
        }
      })
      .catch((err) => {
        console.warn('[AUDIO ERROR] Failed to load custom sound:', err);
        customController = playDefaultChimeSound();
      });

    return {
      stop: () => {
        if (customController) customController.stop();
      },
    };
  }

  return playDefaultChimeSound();
};

/**
 * Play custom audio Blob
 */
export const playCustomAudioBlob = (
  blob: Blob
): { stop: () => void; promise: Promise<void> } => {
  let objectUrl = '';
  let audio: HTMLAudioElement | null = null;

  try {
    objectUrl = URL.createObjectURL(blob);
    console.log('[AUDIO] Playing custom audio blob URL:', objectUrl);
    audio = new Audio(objectUrl);

    const playPromise = audio.play().catch((err) => {
      console.warn('[AUDIO ERROR] Custom audio playback failed:', err);
    });

    return {
      promise: playPromise,
      stop: () => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio = null;
        }
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = '';
        }
      },
    };
  } catch (e) {
    console.warn('[AUDIO ERROR] Error initializing custom audio playback:', e);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return {
      promise: Promise.resolve(),
      stop: () => {},
    };
  }
};
