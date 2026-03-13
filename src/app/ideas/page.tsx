"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { hasRole } from "@/lib/roles";
import { SITES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogIdeaRecord, BlogSite } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function IdeasPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [ideas, setIdeas] = useState<BlogIdeaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickIdeaTitle, setQuickIdeaTitle] = useState("");
  const [title, setTitle] = useState("");
  const [site, setSite] = useState<BlogSite>("sighthound.com");
  const [description, setDescription] = useState("");

  const isAdmin = hasRole(profile, "admin");

  const loadIdeas = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from("blog_ideas")
      .select("id,title,site,description,created_by,created_at,is_converted,converted_blog_id")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setIsLoading(false);
      return;
    }

    setIdeas((data ?? []) as BlogIdeaRecord[]);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadIdeas();
  }, []);

  const activeIdeas = useMemo(
    () => ideas.filter((idea) => !idea.is_converted),
    [ideas]
  );

  const addIdea = async ({
    nextTitle,
    nextSite,
    nextDescription,
  }: {
    nextTitle: string;
    nextSite: BlogSite;
    nextDescription: string;
  }) => {
    if (!user?.id) {
      setError("You must be logged in.");
      return false;
    }

    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return false;
    }

    setError(null);
    setIsSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from("blog_ideas")
      .insert({
        title: trimmedTitle,
        site: nextSite,
        description: nextDescription.trim() || null,
        created_by: user.id,
      })
      .select("id,title,site,description,created_by,created_at,is_converted,converted_blog_id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return false;
    }

    if (data) {
      setIdeas((previous) => [data as BlogIdeaRecord, ...previous]);
    }
    setIsSubmitting(false);
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const didSave = await addIdea({
      nextTitle: title,
      nextSite: site,
      nextDescription: description,
    });
    if (!didSave) {
      return;
    }
    setTitle("");
    setSite("sighthound.com");
    setDescription("");
    setIsCreateModalOpen(false);
  };

  const handleQuickIdeaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const didSave = await addIdea({
      nextTitle: quickIdeaTitle,
      nextSite: "sighthound.com",
      nextDescription: "",
    });
    if (!didSave) {
      return;
    }
    setQuickIdeaTitle("");
  };

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Blog Ideas</h2>
              <p className="text-sm text-slate-600">
                Capture ideas quickly, then convert them into scheduled blog assignments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(true);
              }}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Add Idea
            </button>
          </header>

          <form
            onSubmit={handleQuickIdeaSubmit}
            className="rounded-md border border-slate-200 bg-slate-50 p-3"
          >
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick capture
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={quickIdeaTitle}
                onChange={(event) => {
                  setQuickIdeaTitle(event.target.value);
                }}
                placeholder="Add idea..."
                className="min-w-60 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </form>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Active Ideas
            </h3>

            {isLoading ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Loading ideas…
              </p>
            ) : activeIdeas.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No ideas yet. Add one in under 5 seconds.
              </p>
            ) : (
              <ul className="space-y-3">
                {activeIdeas.map((idea) => (
                  <li key={idea.id} className="rounded-md border border-slate-200 p-4">
                    <h4 className="text-base font-semibold text-slate-900">{idea.title}</h4>
                    <p className="mt-1 text-sm text-slate-600">Site: {idea.site}</p>
                    {idea.description ? (
                      <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {idea.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      Added {formatDateTime(idea.created_at)}
                    </p>
                    <div className="mt-3">
                      {isAdmin ? (
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            router.push(`/blogs/new?ideaId=${idea.id}`);
                          }}
                        >
                          Convert to Blog
                        </button>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Admins can convert ideas into blog assignments.
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>

        {isCreateModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close add idea modal"
              className="absolute inset-0 bg-slate-900/30"
              onClick={() => {
                if (!isSubmitting) {
                  setIsCreateModalOpen(false);
                }
              }}
            />
            <div className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Add Idea</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Keep it lightweight: title, site, and optional context.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    if (!isSubmitting) {
                      setIsCreateModalOpen(false);
                    }
                  }}
                >
                  Close
                </button>
              </div>

              <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                  <input
                    required
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    maxLength={200}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Website</span>
                  <select
                    value={site}
                    onChange={(event) => {
                      setSite(event.target.value as BlogSite);
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    {SITES.map((nextSite) => (
                      <option key={nextSite} value={nextSite}>
                        {nextSite}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Description (optional)
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                    }}
                    className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    maxLength={2000}
                    placeholder="Optional context..."
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Save Idea"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      if (!isSubmitting) {
                        setIsCreateModalOpen(false);
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </AppShell>
    </ProtectedPage>
  );
}
