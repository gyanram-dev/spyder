// ============================================================
// TIMEBOUND AUDIO STORE & PLAYBACK HELPER (IndexedDB + Web Audio API)
// ============================================================

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
 * Synthesize Timebound default chime using Web Audio API
 */
export const playDefaultChimeSound = (): { stop: () => void } => {
  let audioCtx: AudioContext | null = null;

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return { stop: () => {} };

    audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;

    // Chime notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const delays = [0, 0.12, 0.24, 0.36];

    notes.forEach((freq, index) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delays[index]);

      gain.gain.setValueAtTime(0, now + delays[index]);
      gain.gain.linearRampToValueAtTime(0.25, now + delays[index] + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delays[index] + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + delays[index]);
      osc.stop(now + delays[index] + 1.2);
    });
  } catch (e) {
    console.warn('Default chime audio playback error:', e);
  }

  return {
    stop: () => {
      try {
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close();
        }
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
    },
  };
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
    audio = new Audio(objectUrl);

    const playPromise = audio.play().catch((err) => {
      console.warn('Custom audio playback failed:', err);
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
    console.warn('Error initializing custom audio playback:', e);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return {
      promise: Promise.resolve(),
      stop: () => {},
    };
  }
};
