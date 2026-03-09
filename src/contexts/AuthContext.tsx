import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { fetchProfile } from "../services/authService";
import { getRemainingMinutes, isSessionExpired } from "../utils/session";
import { SESSION_CHECK_INTERVAL_MS } from "../constants/auth";
import type { UserProfile } from "../types/auth";
import type { AuthContextValue } from "../types/auth";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState(0);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await fetchProfile(auth.currentUser.uid);
      setUserProfile(profile);
    } catch {
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }
      try {
        const profile = await fetchProfile(user.uid);
        setUserProfile(profile);
      } catch {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSessionMinutesLeft(getRemainingMinutes());
    const interval = setInterval(() => {
      setSessionMinutesLeft(getRemainingMinutes());
      if (isSessionExpired() && auth.currentUser) {
        import("../services/authService").then((m) => m.logout()).catch(() => {});
      }
    }, SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const value: AuthContextValue = {
    firebaseUser,
    userProfile,
    loading,
    sessionMinutesLeft,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
