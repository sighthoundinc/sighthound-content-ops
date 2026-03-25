"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  isRolePermissionsSchemaMissingError,
  normalizeRolePermissionRows,
  resolvePermissionsForRoles,
} from "@/lib/permissions";
import { getUserRoles } from "@/lib/roles";
import { logLoginEvent } from "@/app/actions/log-login";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppPermissionKey, ProfileRecord } from "@/lib/types";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRecord | null;
  permissions: AppPermissionKey[];
  googleConnected: boolean;
  slackConnected: boolean;
  hasPermission: (permissionKey: AppPermissionKey) => boolean;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  refreshIntegrations: () => Promise<void>;
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

async function fetchIntegrations(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_integrations")
    .select("google_connected,slack_connected")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch integrations", error);
    return {
      googleConnected: false,
      slackConnected: false,
    };
  }

  return {
    googleConnected: data?.google_connected ?? false,
    slackConnected: data?.slack_connected ?? false,
  };
}

async function resolvePermissionsForProfile(profile: ProfileRecord | null) {
  if (!profile) {
    return [] as AppPermissionKey[];
  }

  const roles = getUserRoles(profile);
  const fallbackPermissions = resolvePermissionsForRoles(roles);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("role,permission_key,enabled");

  if (error) {
    if (isRolePermissionsSchemaMissingError(error)) {
      return fallbackPermissions;
    }
    throw error;
  }

  const normalizedRows = normalizeRolePermissionRows(data ?? []);
  return resolvePermissionsForRoles(roles, normalizedRows);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [permissions, setPermissions] = useState<AppPermissionKey[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  const applySession = async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user?.id) {
      setProfile(null);
      setPermissions([]);
      setGoogleConnected(false);
      setSlackConnected(false);
      return;
    }

    try {
      const [nextProfile, nextIntegrations] = await Promise.all([
        fetchProfile(nextSession.user.id),
        fetchIntegrations(nextSession.user.id),
      ]);
      setProfile(nextProfile);
      setPermissions(await resolvePermissionsForProfile(nextProfile));
      setGoogleConnected(nextIntegrations.googleConnected);
      setSlackConnected(nextIntegrations.slackConnected);
      
      // Log login event when session is first established
      // Use fire-and-forget to avoid blocking auth flow
      void logLoginEvent(nextSession.user.id);
      // Note: We do NOT auto-update OAuth connection status here.
      // Users control which providers are "connected" via Settings → Connected Services.
      // This respects manual disconnects — logging in with Google doesn't force
      // Google to show as "connected" if the user previously disconnected it.
    } catch (error) {
      console.error(error);
      setProfile(null);
      setPermissions([]);
      setGoogleConnected(false);
      setSlackConnected(false);
    }
  };
  const refreshPermissions = useCallback(async () => {
    setPermissions(await resolvePermissionsForProfile(profile));
  }, [profile]);

  const refreshProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setPermissions([]);
      setGoogleConnected(false);
      setSlackConnected(false);
      return;
    }
    const nextProfile = await fetchProfile(user.id);
    setProfile(nextProfile);
    setPermissions(await resolvePermissionsForProfile(nextProfile));
  };

  const refreshIntegrations = useCallback(async () => {
    if (!user?.id) {
      setGoogleConnected(false);
      setSlackConnected(false);
      return;
    }
    const nextIntegrations = await fetchIntegrations(user.id);
    setGoogleConnected(nextIntegrations.googleConnected);
    setSlackConnected(nextIntegrations.slackConnected);
  }, [user?.id]);

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
          setPermissions([]);
          return;
        }
        return applySession(data.session);
      })
      .catch((error) => {
        console.error(error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setPermissions([]);
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

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const hasPermission = useCallback(
    (permissionKey: AppPermissionKey) => permissionSet.has(permissionKey),
    [permissionSet]
  );

  const value: AuthContextValue = {
    loading,
    session,
    user,
    profile,
    permissions,
    googleConnected,
    slackConnected,
    hasPermission,
    refreshProfile,
    refreshPermissions,
    refreshIntegrations,
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
