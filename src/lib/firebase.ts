import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { UserProfile, AuthState } from '../types';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Let's define the interface for Firebase Configuration
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Check for stored custom config, or environment variables
const getActiveConfig = (): FirebaseConfig | null => {
  // 1. Try to read from localStorage
  const stored = localStorage.getItem('vocal_notify_custom_firebase_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // Ignore parse error
    }
  }

  // 2. Try to read from Vite Environment Variables (client-side)
  const metaEnv = (import.meta as any).env || {};
  if (
    metaEnv.VITE_FIREBASE_API_KEY &&
    metaEnv.VITE_FIREBASE_AUTH_DOMAIN &&
    metaEnv.VITE_FIREBASE_PROJECT_ID
  ) {
    return {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: metaEnv.VITE_FIREBASE_APP_ID,
    };
  }

  // 3. Fallback to imported firebase-applet-config.json
  if (firebaseAppletConfig && firebaseAppletConfig.apiKey && firebaseAppletConfig.authDomain) {
    return {
      apiKey: firebaseAppletConfig.apiKey,
      authDomain: firebaseAppletConfig.authDomain,
      projectId: firebaseAppletConfig.projectId,
      storageBucket: firebaseAppletConfig.storageBucket,
      messagingSenderId: firebaseAppletConfig.messagingSenderId,
      appId: firebaseAppletConfig.appId,
    };
  }

  return null;
};

let app: any = null;
let auth: any = null;
let isInitialized = false;

const config = getActiveConfig();

if (config) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    isInitialized = true;
    console.log("Firebase Auth initialized successfully in LIVE mode.");
  } catch (err) {
    console.error("Failed to initialize Live Firebase Auth:", err);
  }
}

// Simulated Auth Database (fallback)
const getSimulatedUsers = (): UserProfile[] => {
  const users = localStorage.getItem('vocal_notify_simulated_users');
  return users ? JSON.parse(users) : [];
};

const saveSimulatedUser = (user: UserProfile) => {
  const users = getSimulatedUsers();
  const filtered = users.filter(u => u.uid !== user.uid);
  filtered.push(user);
  localStorage.setItem('vocal_notify_simulated_users', JSON.stringify(filtered));
};

// Simulated Current Session state
let simulatedCurrentUser: UserProfile | null = null;
const simulatedAuthListeners: ((user: UserProfile | null) => void)[] = [];

// Load initial simulated session
const storedSession = localStorage.getItem('vocal_notify_simulated_session');
if (storedSession && !isInitialized) {
  try {
    simulatedCurrentUser = JSON.parse(storedSession);
  } catch (e) {
    // Ignore
  }
}

export const getFirebaseMode = (): 'live' | 'simulated' => {
  return isInitialized ? 'live' : 'simulated';
};

export const getIsFirebaseInitialized = (): boolean => {
  return isInitialized;
};

// Standard login action
export const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
  const cleanEmail = email.trim().toLowerCase();

  if (isInitialized && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL,
        createdAt: new Date().toLocaleDateString(),
        isPremium: false // Will sync with app's active play subscription state
      };
    } catch (error: any) {
      throw new Error(error.message || 'Firebase Auth Login Error');
    }
  } else {
    // Simulated authentication
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate latency
    
    // Check local storage users
    const users = getSimulatedUsers();
    const foundUser = users.find(u => u.email === cleanEmail);
    
    if (!foundUser) {
      throw new Error('User not found. Please sign up or check credentials.');
    }
    
    // For demo purposes, we accept any password matching the username/profile
    simulatedCurrentUser = foundUser;
    localStorage.setItem('vocal_notify_simulated_session', JSON.stringify(foundUser));
    
    // Notify auth listeners
    simulatedAuthListeners.forEach(listener => listener(simulatedCurrentUser));
    
    return foundUser;
  }
};

// Standard register action
export const registerWithEmail = async (email: string, password: string, displayName: string): Promise<UserProfile> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName.trim() || cleanEmail.split('@')[0];

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  if (isInitialized && auth) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, { displayName: cleanName });
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: cleanName,
        photoURL: null,
        createdAt: new Date().toLocaleDateString(),
        isPremium: false
      };
    } catch (error: any) {
      throw new Error(error.message || 'Firebase Auth Signup Error');
    }
  } else {
    // Simulated signup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const users = getSimulatedUsers();
    if (users.some(u => u.email === cleanEmail)) {
      throw new Error('An account with this email already exists.');
    }

    const newUser: UserProfile = {
      uid: 'sim_uid_' + Math.random().toString(36).substr(2, 9),
      email: cleanEmail,
      displayName: cleanName,
      photoURL: null,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      isPremium: false
    };

    saveSimulatedUser(newUser);
    simulatedCurrentUser = newUser;
    localStorage.setItem('vocal_notify_simulated_session', JSON.stringify(newUser));

    // Notify auth listeners
    simulatedAuthListeners.forEach(listener => listener(simulatedCurrentUser));

    return newUser;
  }
};

// Sign out action
export const logoutUser = async (): Promise<void> => {
  if (isInitialized && auth) {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Firebase Sign Out Error');
    }
  } else {
    await new Promise(resolve => setTimeout(resolve, 300));
    simulatedCurrentUser = null;
    localStorage.removeItem('vocal_notify_simulated_session');
    
    // Notify auth listeners
    simulatedAuthListeners.forEach(listener => listener(null));
  }
};

// Monitor Auth State Changes
export const subscribeToAuthChanges = (callback: (user: UserProfile | null) => void) => {
  if (isInitialized && auth) {
    return fbOnAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        callback({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          photoURL: fbUser.photoURL,
          createdAt: new Date().toLocaleDateString(),
          isPremium: false
        });
      } else {
        callback(null);
      }
    });
  } else {
    // Simulated Auth subscriber
    simulatedAuthListeners.push(callback);
    // Call back instantly with current session
    callback(simulatedCurrentUser);

    // Return unsubscriber function
    return () => {
      const index = simulatedAuthListeners.indexOf(callback);
      if (index !== -1) {
        simulatedAuthListeners.splice(index, 1);
      }
    };
  }
};

// Save custom configuration manually
export const saveCustomFirebaseConfig = (newConfig: FirebaseConfig | null): boolean => {
  if (newConfig) {
    localStorage.setItem('vocal_notify_custom_firebase_config', JSON.stringify(newConfig));
  } else {
    localStorage.removeItem('vocal_notify_custom_firebase_config');
  }
  // Force hot reload of configuration or instruct window refresh
  return true;
};
