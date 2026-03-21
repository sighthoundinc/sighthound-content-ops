"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppIcon } from "@/lib/icons";

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
    description: "Sign in with your Google Workspace account (@sighthound.com)",
    connectedAtKey: "google_connected_at" as const,
    purpose: "Sign-in",
  },
  {
    key: "slack" as const,
    name: "Slack",
    icon: "slack" as const,
    description: "Receive workflow notifications and reminders in Slack",
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

  // Fetch integration status on mount
  useEffect(() => {
    const fetchServices = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error("No access token available");
        }

        const response = await fetch("/api/users/integrations", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch integrations: ${response.statusText}`);
        }

        const data = (await response.json()) as ConnectedServicesState;
        setServices(data);
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
    };

    fetchServices();
  }, [user?.id, showError]);

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

      if (!response.ok) {
        throw new Error(`Failed to disconnect: ${response.statusText}`);
      }

      const updated = (await response.json()) as ConnectedServicesState;
      setServices(updated);
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
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Loading connected services…</p>
      </div>
    );
  }

  if (!services) {
    return (
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Unable to load connected services.</p>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Connected Services
      </h3>
      <p className="mt-1 text-sm text-slate-600">
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
              className="flex items-start justify-between rounded-md border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <AppIcon
                  name={service.icon}
                  boxClassName="h-10 w-10 bg-slate-50"
                  size={20}
                  className={isConnected ? "text-slate-700" : "text-slate-400"}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-slate-900">
                      {service.name}
                    </h4>
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {service.purpose}
                    </span>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Not connected
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {service.description}
                  </p>
                  {isConnected && connectedDate && (
                    <p className="mt-1 text-xs text-slate-500">
                      Connected on {connectedDate}
                    </p>
                  )}
                </div>
              </div>

              {isConnected ? (
                <button
                  type="button"
                  disabled={disconnectingService === service.key}
                  className="ml-4 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleDisconnect(service.key)}
                >
                  {disconnectingService === service.key ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <a
                  href={`/login?reconnect=${service.key}`}
                  className="ml-4 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
                >
                  Connect
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
