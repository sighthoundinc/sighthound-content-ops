"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { AppIcon } from "@/lib/icons";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";

interface ConnectedServicesState {
  google_connected: boolean;
  google_connected_at: string | null;
  slack_connected: boolean;
  slack_connected_at: string | null;
}

const SERVICES = [
  {
    key: "google" as const,
    name: "Google",
    icon: "google" as const,
    descriptionDisconnected: "Sign in with your Google Workspace account (@sighthound.com)",
    descriptionConnected: "Your Google account is linked for sign-in.",
    connectedAtKey: "google_connected_at" as const,
    purpose: "Sign-in",
  },
  {
    key: "slack" as const,
    name: "Slack",
    icon: "slack" as const,
    descriptionDisconnected: "Connect Slack to receive workflow notifications and reminders.",
    descriptionConnected: "You will receive workflow notifications and reminders in Slack.",
    connectedAtKey: "slack_connected_at" as const,
    purpose: "Notifications",
  },
];

export function ConnectedServicesForm() {
  const { user, session } = useAuth();
  const { showSuccess, showError } = useAlerts();

  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<ConnectedServicesState | null>(null);
  const [disconnectingService, setDisconnectingService] = useState<string | null>(null);
  const [connectingService, setConnectingService] = useState<string | null>(null);

  // Helper function to fetch services
  const fetchServices = useCallback(async (token: string | undefined) => {
    if (!user?.id || !token) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/users/integrations", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const payload = await parseApiResponseJson<ConnectedServicesState>(response);
      if (isApiFailure(response, payload)) {
        throw new Error(
          getApiErrorMessage(payload, "Failed to fetch connected services.")
        );
      }
      setServices({
        google_connected: Boolean(payload.google_connected),
        google_connected_at: payload.google_connected_at ?? null,
        slack_connected: Boolean(payload.slack_connected),
        slack_connected_at: payload.slack_connected_at ?? null,
      });
    } catch (error) {
      console.error("Error fetching connected services:", error);
      showError("Failed to load connected services. Please refresh.");
      // Set defaults on error
      setServices({
        google_connected: false,
        google_connected_at: null,
        slack_connected: false,
        slack_connected_at: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, showError]);

  // Fetch integration status on mount and when session changes
  useEffect(() => {
    void fetchServices(session?.access_token);
  }, [user?.id, session?.access_token, fetchServices]);

  const handleConnect = async (serviceKey: string) => {
    if (!session?.access_token) return;

    try {
      setConnectingService(serviceKey);
      const supabase = getSupabaseBrowserClient();
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        window.location.origin;

      const provider = serviceKey === "google" ? "google" : "slack_oidc";
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider as "google" | "slack_oidc",
        options: {
          redirectTo: `${appUrl}/settings?reconnect=${serviceKey}`,
        },
      });

      if (oauthError) {
        showError(
          getApiErrorMessage(
            { error: oauthError.message },
            `Failed to connect ${serviceKey === "google" ? "Google" : "Slack"}.`
          )
        );
      }
    } catch (error) {
      console.error("Error initiating OAuth connect:", error);
      showError("Failed to connect. Please try again.");
    } finally {
      setConnectingService(null);
    }
  };

  const handleDisconnect = async (serviceKey: string) => {
    if (!user?.id || !services || !session?.access_token) return;

    try {
      setDisconnectingService(serviceKey);

      const updates: Record<string, boolean> = {
        [`${serviceKey}_connected`]: false,
      };

      const response = await fetch("/api/users/integrations", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      const payload = await parseApiResponseJson<ConnectedServicesState>(response);
      if (isApiFailure(response, payload)) {
        throw new Error(getApiErrorMessage(payload, "Failed to disconnect service."));
      }
      setServices({
        google_connected: Boolean(payload.google_connected),
        google_connected_at: payload.google_connected_at ?? null,
        slack_connected: Boolean(payload.slack_connected),
        slack_connected_at: payload.slack_connected_at ?? null,
      });
      showSuccess(`${SERVICES.find(s => s.key === serviceKey)?.name} disconnected.`);
    } catch (error) {
      console.error("Error disconnecting service:", error);
      showError("Failed to disconnect. Please try again.");
    } finally {
      setDisconnectingService(null);
    }
  };

  const formatConnectedDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[color:var(--sh-gray-200)] p-4">
        <p className="text-sm text-navy-500">Loading connected services…</p>
      </div>
    );
  }

  if (!services) {
    return (
      <div className="rounded-lg border border-[color:var(--sh-gray-200)] p-4">
        <p className="text-sm text-navy-500">Unable to load connected services.</p>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-[color:var(--sh-gray-200)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
        Connected Services
      </h3>
      <p className="mt-1 text-sm text-navy-500">
        Manage your connected accounts for sign-in and notifications.
      </p>

      <div className="mt-4 space-y-3">
        {SERVICES.map((service) => {
          const isConnected = services[`${service.key}_connected` as keyof ConnectedServicesState];
          const connectedAt = services[service.connectedAtKey];
          const connectedDate = formatConnectedDate(connectedAt);

          return (
            <div
              key={service.key}
              className="flex items-start justify-between rounded-md border border-[color:var(--sh-gray-200)] bg-white px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <AppIcon
                  name={service.icon}
                  boxClassName="h-10 w-10 bg-[color:var(--sh-gray)]"
                  size={20}
                  className={isConnected ? "text-navy-500" : "text-navy-500/60"}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-ink">
                      {service.name}
                    </h4>
                    <span className="inline-flex rounded-full bg-blurple-50 px-2 py-0.5 text-xs font-medium text-navy-500">
                      {service.purpose}
                    </span>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blurple-50 px-2 py-0.5 text-xs font-medium text-navy-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--sh-gray-400)]" />
                        Not connected
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-navy-500">
                    {isConnected ? service.descriptionConnected : service.descriptionDisconnected}
                  </p>
                  {isConnected && connectedDate && (
                    <p className="mt-1 text-xs text-navy-500">
                      Connected on {connectedDate}
                    </p>
                  )}
                </div>
              </div>

              {isConnected ? (
                <button
                  type="button"
                  disabled={disconnectingService === service.key}
                  className="ml-4 rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-1.5 text-xs font-medium text-navy-500 transition hover:bg-blurple-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleDisconnect(service.key)}
                >
                  {disconnectingService === service.key ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={connectingService === service.key}
                  className="ml-4 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleConnect(service.key)}
                >
                  {connectingService === service.key ? "Connecting…" : "Connect"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
