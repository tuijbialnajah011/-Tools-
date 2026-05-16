import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Instead of hardcoding from a missing json file, try to initialize Firebase if possible config exists
let auth: any = null;
try {
  // Check if we have env vars, mostly for development
  if (import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
} catch (error) {
  console.warn("Firebase config error:", error);
}

export function HeaderAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!auth) {
      setError("Firebase is not configured. Please run set_up_firebase tool first.");
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      // Use popup for AI Studio environment
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login failed:", err);
      // Don't show confusing popup closed errors, only real errors
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!auth) {
    return (
      <button 
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-full cursor-not-allowed"
        title="Firebase setup required"
        disabled
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Setup Required</span>
      </button>
    );
  }

  return (
    <div className="relative z-50">
      {loading ? (
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
      ) : user ? (
        <div className="group relative">
          <button className="flex items-center gap-2 p-1 pl-3 pr-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:shadow-md transition-all">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-7 h-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </button>
          
          <div className="absolute right-0 top-full mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all isolate">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={handleLogin}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-sm shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In</span>
        </button>
      )}
      
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-12 right-0 w-64 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl shadow-lg z-50 text-center"
          >
            {error}
            <button 
              onClick={() => setError(null)}
              className="absolute top-1 right-1 p-1 hover:bg-red-100 rounded-md"
            >
              x
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
