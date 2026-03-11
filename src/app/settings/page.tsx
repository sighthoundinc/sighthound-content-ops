"use client";

import { FormEvent, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppRole, AppSettingsRecord, ProfileRecord } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const WEEK_DAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

export default function SettingsPage() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<AppSettingsRecord | null>(null);
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("writer");

  useEffect(() => {
    const loadData = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);

      const [{ data: settingsData, error: settingsError }, { data: usersData, error: usersError }] =
        await Promise.all([
          supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        ]);

      if (settingsError || usersError) {
        setError(settingsError?.message ?? usersError?.message ?? "Failed to load settings");
        setIsLoading(false);
        return;
      }

      setSettings((settingsData as AppSettingsRecord) ?? null);
      setUsers((usersData ?? []) as ProfileRecord[]);
      setIsLoading(false);
    };

    void loadData();
  }, []);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setError(null);
    setSuccess(null);

    const { error: saveError } = await supabase
      .from("app_settings")
      .update({
        timezone: settings.timezone,
        week_start: settings.week_start,
        stale_draft_days: settings.stale_draft_days,
      })
      .eq("id", 1);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSuccess("Settings saved.");
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.access_token) {
      setError("Missing active session token.");
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        fullName: newFullName,
        role: newRole,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to create user.");
      return;
    }

    setSuccess("User created successfully.");
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setNewRole("writer");

    const supabase = getSupabaseBrowserClient();
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers((usersData ?? []) as ProfileRecord[]);
  };

  return (
    <ProtectedPage allowedRoles={["admin"]}>
      <AppShell>
        <div className="space-y-6">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
            <p className="text-sm text-slate-600">
              Configure timezone/week start and manage internal accounts.
            </p>
          </header>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          {isLoading || !settings ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading settings…
            </p>
          ) : (
            <>
              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Calendar & Dashboard Defaults
                </h3>
                <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={saveSettings}>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Timezone
                    </span>
                    <input
                      value={settings.timezone}
                      onChange={(event) => {
                        setSettings((prev) =>
                          prev ? { ...prev, timezone: event.target.value } : prev
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Week Start
                    </span>
                    <select
                      value={settings.week_start}
                      onChange={(event) => {
                        setSettings((prev) =>
                          prev
                            ? { ...prev, week_start: Number(event.target.value) }
                            : prev
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {WEEK_DAYS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Stale Draft Days
                    </span>
                    <input
                      min={1}
                      max={120}
                      type="number"
                      value={settings.stale_draft_days}
                      onChange={(event) => {
                        setSettings((prev) =>
                          prev
                            ? {
                                ...prev,
                                stale_draft_days: Number(event.target.value) || 1,
                              }
                            : prev
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Create Internal User
                </h3>
                <form className="mt-3 grid gap-3 md:grid-cols-4" onSubmit={createUser}>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Full Name
                    </span>
                    <input
                      required
                      value={newFullName}
                      onChange={(event) => {
                        setNewFullName(event.target.value);
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Email
                    </span>
                    <input
                      required
                      type="email"
                      value={newEmail}
                      onChange={(event) => {
                        setNewEmail(event.target.value);
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Password
                    </span>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Role
                    </span>
                    <select
                      value={newRole}
                      onChange={(event) => {
                        setNewRole(event.target.value as AppRole);
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="admin">Admin</option>
                      <option value="writer">Writer</option>
                      <option value="publisher">Publisher</option>
                    </select>
                  </label>

                  <div className="md:col-span-4">
                    <button
                      type="submit"
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Create User
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Active Users
                </h3>
                <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((nextUser) => (
                        <tr key={nextUser.id}>
                          <td className="px-3 py-2">{nextUser.full_name}</td>
                          <td className="px-3 py-2 text-slate-600">{nextUser.email}</td>
                          <td className="px-3 py-2">{nextUser.role}</td>
                          <td className="px-3 py-2">
                            {nextUser.is_active ? "Yes" : "No"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
