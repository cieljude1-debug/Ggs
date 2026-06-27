import { VoiceProfile } from '../types';

const DB_NAME = 'VocalNotifyDB';
const DB_VERSION = 1;
const STORE_NAME = 'voice_profiles';

export interface DbVoiceProfile {
  id: string;
  name: string;
  type: 'record' | 'import';
  blob: Blob;
  duration: number;
  createdAt: string;
}

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveVoiceProfile(profile: Omit<DbVoiceProfile, 'createdAt'>): Promise<VoiceProfile> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const fullProfile: DbVoiceProfile = {
      ...profile,
      createdAt: new Date().toISOString(),
    };

    const request = store.put(fullProfile);

    request.onsuccess = () => {
      // Create temporary Object URL for the preview/playback session
      const url = URL.createObjectURL(profile.blob);
      resolve({
        id: fullProfile.id,
        name: fullProfile.name,
        type: fullProfile.type,
        blob: fullProfile.blob,
        url,
        duration: fullProfile.duration,
        createdAt: fullProfile.createdAt,
      });
    };

    request.onerror = () => {
      reject(new Error('Failed to save voice profile to local storage'));
    };
  });
}

export async function getAllVoiceProfiles(): Promise<VoiceProfile[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const dbProfiles: DbVoiceProfile[] = request.result || [];
      const profiles: VoiceProfile[] = dbProfiles.map((dbProf) => {
        const url = URL.createObjectURL(dbProf.blob);
        return {
          id: dbProf.id,
          name: dbProf.name,
          type: dbProf.type,
          blob: dbProf.blob,
          url,
          duration: dbProf.duration,
          createdAt: dbProf.createdAt,
        };
      });
      resolve(profiles);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve voice profiles from local storage'));
    };
  });
}

export async function deleteVoiceProfile(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete voice profile from local storage'));
    };
  });
}
