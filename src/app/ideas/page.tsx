"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { parseApiResponseJson, isApiFailure, getApiErrorMessage } from "@/lib/api-response";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import { getUserRoles } from "@/lib/roles";
import { SITES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogIdeaRecord, BlogSite, IdeaCommentRecord } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

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
  const { hasPermission, profile, session, user } = useAuth();
  const { showError, showSuccess } = useSystemFeedback();
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const [ideas, setIdeas] = useState<BlogIdeaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickIdeaTitle, setQuickIdeaTitle] = useState("");
  const [title, setTitle] = useState("");
  const [site, setSite] = useState<BlogSite>("sighthound.com");
  const [description, setDescription] = useState("");
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSite, setEditSite] = useState<BlogSite>("sighthound.com");
  const [editDescription, setEditDescription] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ideaComments, setIdeaComments] = useState<Record<string, IdeaCommentRecord[]>>({});
  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null);

  const canCreateBlog = permissionContract.canCreateBlog;
  const isAdmin = useMemo(() => getUserRoles(profile).includes("admin"), [profile]);

  const loadIdeas = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from("blog_ideas")
      .select("id,title,site,description,created_by,created_at,is_converted,converted_blog_id")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(`Couldn't load ideas. ${loadError.message}`);
      setIsLoading(false);
      return;
    }

    setIdeas((data ?? []) as BlogIdeaRecord[]);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadIdeas();
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  const activeIdeas = useMemo(
    () => ideas.filter((idea) => !idea.is_converted),
    [ideas]
  );

  useEffect(() => {
    if (activeIdeas.length === 0) {
      setIdeaComments({});
      return;
    }

    const loadComments = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error: loadError } = await supabase
        .from("blog_idea_comments")
        .select("id,idea_id,comment,created_by,created_at,updated_at")
        .in(
          "idea_id",
          activeIdeas.map((idea) => idea.id)
        )
        .order("created_at", { ascending: true });

      if (loadError) {
        setError(`Couldn't load idea comments. ${loadError.message}`);
        return;
      }

      const nextComments = ((data ?? []) as IdeaCommentRecord[]).reduce<
        Record<string, IdeaCommentRecord[]>
      >((acc, comment) => {
        if (!acc[comment.idea_id]) {
          acc[comment.idea_id] = [];
        }
        acc[comment.idea_id].push(comment);
        return acc;
      }, {});
      setIdeaComments(nextComments);
    };

    void loadComments();
  }, [activeIdeas]);

  const visibleCommentsByIdea = useMemo(() => {
    return activeIdeas.reduce<
      Record<string, Array<{ id: string; comment: string; created_at: string }>>
    >((acc, idea) => {
      const combined: Array<{ id: string; comment: string; created_at: string }> = [];
      const descriptionComment = idea.description?.trim();
      if (descriptionComment) {
        combined.push({
          id: `description-${idea.id}`,
          comment: descriptionComment,
          created_at: idea.created_at,
        });
      }
      for (const comment of ideaComments[idea.id] ?? []) {
        combined.push({
          id: comment.id,
          comment: comment.comment,
          created_at: comment.created_at,
        });
      }
      acc[idea.id] = combined;
      return acc;
    }, {});
  }, [activeIdeas, ideaComments]);

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
      setError(`Couldn't create idea. ${insertError.message}`);
      setIsSubmitting(false);
      return false;
    }

    if (data) {
      setIdeas((previous) => [data as BlogIdeaRecord, ...previous]);
      showSuccess("Idea created");
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


  const openEditModal = (idea: BlogIdeaRecord) => {
    setEditingIdeaId(idea.id);
    setEditTitle(idea.title);
    setEditSite(idea.site);
    setEditDescription(idea.description || "");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingIdeaId(null);
    setEditTitle("");
    setEditSite("sighthound.com");
    setEditDescription("");
  };

  const updateIdea = async (ideaId: string, nextTitle: string, nextSite: BlogSite, nextDescription: string) => {
    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return false;
    }

    setIsSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: updateError } = await supabase
      .from("blog_ideas")
      .update({
        title: trimmedTitle,
        site: nextSite,
        description: nextDescription.trim() || null,
      })
      .eq("id", ideaId)
      .select("id,title,site,description,created_by,created_at,is_converted,converted_blog_id")
      .single();

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return false;
    }

    if (data) {
      setIdeas((previous) =>
        previous.map((idea) => (idea.id === ideaId ? (data as BlogIdeaRecord) : idea))
      );
      showSuccess("Idea updated.");
    }
    setIsSubmitting(false);
    return true;
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingIdeaId) return;
    const didSave = await updateIdea(editingIdeaId, editTitle, editSite, editDescription);
    if (!didSave) return;
    closeEditModal();
  };
  const handleDeleteIdea = async (idea: BlogIdeaRecord) => {
    if (!session?.access_token) {
      setError("You must be logged in.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${idea.title}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingIdeaId(idea.id);
    const response = await fetch(`/api/ideas/${idea.id}/delete`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
    });
    const payload = await parseApiResponseJson<Record<string, unknown>>(response);
    if (isApiFailure(response, payload)) {
      showError(getApiErrorMessage(payload, "Failed to delete idea."));
      setDeletingIdeaId(null);
      return;
    }

    setIdeas((previous) => previous.filter((existingIdea) => existingIdea.id !== idea.id));
    showSuccess("Idea deleted successfully");
    setDeletingIdeaId(null);
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
              New Idea
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
                    <p className="mt-2 text-xs text-slate-500">
                      Added {formatDateTime(idea.created_at)}
                    </p>

                    {/* Comments & References Section */}
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="text-sm font-medium text-slate-700">
                        Comments & References ({visibleCommentsByIdea[idea.id]?.length || 0})
                      </p>
                      {visibleCommentsByIdea[idea.id] &&
                      visibleCommentsByIdea[idea.id].length > 0 ? (
                        <ul className="mt-2 space-y-2 rounded-md bg-slate-50 p-3">
                          {visibleCommentsByIdea[idea.id].map((comment) => (
                            <li key={comment.id} className="border-l-2 border-slate-300 pl-3 text-sm">
                              <p className="text-slate-700">{comment.comment}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDateTime(comment.created_at)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No comments yet.</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {idea.created_by === user?.id || isAdmin ? (
                        <button
                          type="button"
                          disabled={deletingIdeaId === idea.id}
                          className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            void handleDeleteIdea(idea);
                          }}
                        >
                          {deletingIdeaId === idea.id ? "Deleting…" : "Delete"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          openEditModal(idea);
                        }}
                      >
                        Edit Idea
                      </button>
                      {canCreateBlog ? (
                        <button
                          type="button"
                          className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                          onClick={() => {
                            router.push(`/blogs/new?ideaId=${idea.id}`);
                          }}
                        >
                          Convert to Blog
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        onClick={() => {
                          const search = new URLSearchParams({
                            create: "1",
                            title: idea.title,
                          });
                          router.push(`/social-posts?${search.toString()}`);
                        }}
                      >
                        Convert to Social Post
                      </button>
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
                  <h3 className="text-base font-semibold text-slate-900">New Idea</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Keep it lightweight: title, site, and optional comments or references.
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
                    Comments & References (optional)
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                    }}
                    className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    maxLength={2000}
                    placeholder="Optional comments or reference links..."
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

        {isEditModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close edit idea modal"
              className="absolute inset-0 bg-slate-900/30"
              onClick={() => {
                if (!isSubmitting) {
                  closeEditModal();
                }
              }}
            />
            <div className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Edit Idea</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Update the title, site, or comments and references before converting.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    if (!isSubmitting) {
                      closeEditModal();
                    }
                  }}
                >
                  Close
                </button>
              </div>

              <form className="mt-4 space-y-4" onSubmit={handleEditSubmit}>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                  <input
                    required
                    value={editTitle}
                    onChange={(event) => {
                      setEditTitle(event.target.value);
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    maxLength={200}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Website</span>
                  <select
                    value={editSite}
                    onChange={(event) => {
                      setEditSite(event.target.value as BlogSite);
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
                    Comments & References (optional)
                  </span>
                  <textarea
                    value={editDescription}
                    onChange={(event) => {
                      setEditDescription(event.target.value);
                    }}
                    className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    maxLength={2000}
                    placeholder="Optional comments or reference links..."
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      if (!isSubmitting) {
                        closeEditModal();
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
