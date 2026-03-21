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
  hasPermission: (permissionKey: AppPermissionKey) => boolean;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
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

  const applySession = async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user?.id) {
      setProfile(null);
      setPermissions([]);
      return;
    }

    try {
      const nextProfile = await fetchProfile(nextSession.user.id);
      setProfile(nextProfile);
      setPermissions(await resolvePermissionsForProfile(nextProfile));
      
      // Log login event when session is first established
      // Use fire-and-forget to avoid blocking auth flow
      void logLoginEvent(nextSession.user.id);
      
      // Auto-mark OAuth providers as connected
      // Check which identity provider was used for this session
      const identities = nextSession.user.identities ?? [];
      const hasSlackIdentity = identities.some(id => id.provider === 'slack_oidc');
      const hasGoogleIdentity = identities.some(id => id.provider === 'google');
      
      if (hasSlackIdentity || hasGoogleIdentity) {
        // Fire-and-forget: mark providers as connected without blocking auth
        void fetch('/api/users/integrations', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${nextSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slack_connected: hasSlackIdentity,
            google_connected: hasGoogleIdentity,
          }),
        }).catch((error) => {
          console.error('Failed to update integration status:', error);
        });
      }
    } catch (error) {
      console.error(error);
      setProfile(null);
      setPermissions([]);
    }
  };
  const refreshPermissions = useCallback(async () => {
    setPermissions(await resolvePermissionsForProfile(profile));
  }, [profile]);

  const refreshProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      setPermissions([]);
      return;
    }
    const nextProfile = await fetchProfile(user.id);
    setProfile(nextProfile);
    setPermissions(await resolvePermissionsForProfile(nextProfile));
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
    hasPermission,
    refreshProfile,
    refreshPermissions,
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
