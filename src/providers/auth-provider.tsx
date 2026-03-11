"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProfileRecord } from "@/lib/types";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRecord | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ProfileRecord | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);

  const applySession = async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user?.id) {
      setProfile(null);
      return;
    }

    try {
      setProfile(await fetchProfile(nextSession.user.id));
    } catch (error) {
      console.error(error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    const nextProfile = await fetchProfile(user.id);
    setProfile(nextProfile);
  };

  useEffect(() => {
    let isDisposed = false;
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }
        return applySession(data.session);
      })
      .catch((error) => {
        console.error(error);
        setSession(null);
        setUser(null);
        setProfile(null);
      })
      .finally(() => {
        if (!isDisposed) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        try {
          await applySession(nextSession);
        } finally {
          if (!isDisposed) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      isDisposed = true;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    loading,
    session,
    user,
    profile,
    refreshProfile,
    signOut: async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
