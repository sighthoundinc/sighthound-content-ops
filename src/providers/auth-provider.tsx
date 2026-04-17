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
import { isAllowedEmail } from "@/lib/allowed-email";

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

  const clearLocalAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setPermissions([]);
    setGoogleConnected(false);
    setSlackConnected(false);
  }, []);

  const applySession = async (nextSession: Session | null) => {
    // Defense in depth: reject sessions whose authenticated user is not on
    // an allowlisted email domain. This catches cases where a non-Sighthound
    // account completes OAuth before the provider-side `hd` hint can be
    // enforced, or where a stale session pre-dates the rule.
    if (nextSession?.user && !isAllowedEmail(nextSession.user.email)) {
      const supabase = getSupabaseBrowserClient();
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("Failed to sign out disallowed session:", signOutError);
      }
      clearLocalAuthState();
      if (typeof window !== "undefined") {
        const target = new URL("/login", window.location.origin);
        target.searchParams.set("reason", "domain");
        window.location.replace(target.toString());
      }
      return;
    }

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

      // Log login event when session is first established.
      // Fire-and-forget; the server action resolves the user id from the
      // session cookie and never trusts client-supplied values.
      void logLoginEvent();
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

    // Hydrate auth using `getUser()` as the server-authoritative source. The
    // previous implementation trusted `getSession()` which returns the locally
    // cached (potentially tampered) session. We still read the session for the
    // access token but only after the user is validated.
    (async () => {
      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError || !userData.user) {
          if (!isDisposed) clearLocalAuthState();
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        await applySession(sessionData.session);
      } catch (error) {
        console.error(error);
        if (!isDisposed) clearLocalAuthState();
      } finally {
        if (!isDisposed) setLoading(false);
      }
    })();

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
