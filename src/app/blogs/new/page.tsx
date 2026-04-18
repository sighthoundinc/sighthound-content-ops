"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import { SITES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogSite, ProfileRecord } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";

// Utility: Format date as YYYY-MM-DD for input[type="date"]
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}


function NewBlogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, session, user } = useAuth();
  const { showError } = useAlerts();
  const sourceIdeaId = searchParams.get("ideaId");
  const requestedScheduledPublishDate = searchParams.get("scheduled_publish_date");
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [title, setTitle] = useState("");
  const [site, setSite] = useState<BlogSite>("sighthound.com");
  const [writerId, setWriterId] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [googleDocUrl, setGoogleDocUrl] = useState("");
  const [scheduledPublishDate, setScheduledPublishDate] = useState("");
  const [displayPublishDate, setDisplayPublishDate] = useState("");
  const [syncDisplayToScheduled, setSyncDisplayToScheduled] = useState(true);
  const [initialComment, setInitialComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilledIdeaId, setPrefilledIdeaId] = useState<string | null>(null);
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);
  const [convertedIdeaBlogId, setConvertedIdeaBlogId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastPublisherName, setLastPublisherName] = useState<string | null>(null);
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canCreateComments = permissionContract.canCreateComment;
  const canManageWriterAssignment = permissionContract.canChangeWriterAssignment;
  const canManagePublisherAssignment = permissionContract.canChangePublisherAssignment;
  const isAdmin = canManageWriterAssignment && canManagePublisherAssignment;

  useEffect(() => {
    const loadUsers = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (usersError) {
        console.error("Load users failed:", usersError);
        setError("Couldn't load team members. Please try again.");
        return;
      }
      setUsers((data ?? []) as ProfileRecord[]);
    };

    void loadUsers();
  }, []);

  useEffect(() => {
    const loadIdeaPrefill = async () => {
      if (!sourceIdeaId) {
        setPrefilledIdeaId(null);
        setPrefillNotice(null);
        setConvertedIdeaBlogId(null);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: ideaData, error: ideaError } = await supabase
        .from("blog_ideas")
        .select("id,title,site,description,is_converted,converted_blog_id")
        .eq("id", sourceIdeaId)
        .maybeSingle();

      if (ideaError) {
        console.error("Idea prefill load failed:", ideaError);
        setError("Couldn't load idea details. Please try again.");
        return;
      }
      if (!ideaData) {
        setError("Idea not found.");
        return;
      }

      if (ideaData.is_converted) {
        setPrefillNotice("This idea has already been converted.");
        setConvertedIdeaBlogId(ideaData.converted_blog_id ?? null);
        setPrefilledIdeaId(null);
        return;
      }

      setTitle((previous) => previous || ideaData.title || "");
      setSite(ideaData.site as BlogSite);
      setInitialComment((previous) => previous || ideaData.description || "");
      setPrefilledIdeaId(ideaData.id);
      setPrefillNotice(
        "Idea converted to blog. Continue assigning writer and schedule."
      );
      setConvertedIdeaBlogId(null);
    };

    void loadIdeaPrefill();
  }, [sourceIdeaId]);

  // Initialize defaults: today's date for scheduled, sync display to scheduled, and assignments
  useEffect(() => {
    if (isInitialized) return;
    setIsInitialized(true);

    const today = formatDateForInput(new Date());
    setScheduledPublishDate(today);
    setDisplayPublishDate(today);
    setSyncDisplayToScheduled(true);
    
    // Non-admin users: default writer to self (current user)
    // Admin users: leave writer blank (they'll assign explicitly)
    if (!isAdmin && user?.id) {
      setWriterId(user.id);
    }
    
    // Remember last publisher selection from localStorage
    // Validate that the saved publisher still exists in current users list
    if (typeof window !== 'undefined') {
      const savedPublisherId = localStorage.getItem('last_publisher_id');
      if (savedPublisherId && users.length > 0) {
        const savedPublisherUser = users.find((u) => u.id === savedPublisherId);
        if (savedPublisherUser) {
          setPublisherId(savedPublisherId);
          setLastPublisherName(savedPublisherUser.full_name);
        } else {
          // Saved publisher no longer exists, clear it
          localStorage.removeItem('last_publisher_id');
        }
      }
    }
  }, [isInitialized, isAdmin, user?.id, users]);

  // Handle requested scheduled date from query params
  useEffect(() => {
    if (
      !requestedScheduledPublishDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(requestedScheduledPublishDate)
    ) {
      return;
    }
    setScheduledPublishDate((previous) => previous || requestedScheduledPublishDate);
    // If sync is enabled, update display date too
    if (syncDisplayToScheduled) {
      setDisplayPublishDate(requestedScheduledPublishDate);
    }
  }, [requestedScheduledPublishDate, syncDisplayToScheduled]);

  // Sync display date when scheduled date changes and sync is enabled
  useEffect(() => {
    if (syncDisplayToScheduled && scheduledPublishDate) {
      setDisplayPublishDate(scheduledPublishDate);
    }
  }, [scheduledPublishDate, syncDisplayToScheduled]);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (canManageWriterAssignment && !writerId) {
      setError("Writer is required.");
      return;
    }
    if (!user?.id) {
      setError("You must be logged in.");
      return;
    }
    if (!session?.access_token) {
      setError("Session expired. Refresh and try again.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    // For blog creation, both admin and non-admin users can set display date
    // Client-side: display_published_date always has a value (never NULL)
    // Fallback: display_published_date = displayPublishDate || scheduledPublishDate || today
    const finalDisplayPublishDate = displayPublishDate || scheduledPublishDate || scheduledPublishDate;
    
    // Assignment logic:
    // - Admins can assign writer/publisher explicitly via permissions
    // - Non-admins: writer defaults to self, can optionally assign publisher
    const finalWriterId = canManageWriterAssignment 
      ? writerId || null 
      : user?.id || null; // Non-admin: default to self
    
    const finalPublisherId = canManagePublisherAssignment 
      ? publisherId || null 
      : publisherId || null; // Non-admin: allow selecting publisher if desired
    
    const payload = {
      title: title.trim(),
      slug: slugify(title),
      site,
      writer_id: finalWriterId,
      publisher_id: finalPublisherId,
      writer_status: finalWriterId ? "in_progress" : "not_started",
      publisher_status: "not_started",
      google_doc_url: googleDocUrl.trim() || null,
      scheduled_publish_date: scheduledPublishDate || null,
      display_published_date: finalDisplayPublishDate || null,
      target_publish_date: scheduledPublishDate || null,
    };
    const createResponse = await fetch("/api/blogs", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!createResponse) {
      setError("Couldn't create blog. Please try again.");
      setIsSubmitting(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const createPayload = await parseApiResponseJson<Record<string, unknown>>(
      createResponse
    );
    if (isApiFailure(createResponse, createPayload)) {
      setError(getApiErrorMessage(createPayload, "Couldn't create blog. Please try again."));
      setIsSubmitting(false);
      return;
    }

    const createdBlog =
      typeof createPayload.blog === "object" && createPayload.blog !== null
        ? (createPayload.blog as Record<string, unknown>)
        : null;
    const createdBlogId =
      createdBlog && typeof createdBlog.id === "string" ? createdBlog.id : null;
    if (!createdBlogId) {
      setError("Couldn't create blog. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const trimmedInitialComment = initialComment.trim();
    if (trimmedInitialComment) {
      if (!canCreateComments) {
        setError("You do not have permission to add comments.");
        setIsSubmitting(false);
        return;
      }
      const commentResponse = await fetch(`/api/blogs/${createdBlogId}/comments`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ comment: trimmedInitialComment }),
      }).catch(() => null);
      if (!commentResponse) {
        setError("Blog created, but the initial comment couldn't be saved.");
        setIsSubmitting(false);
        return;
      }
      const commentPayload = await parseApiResponseJson<Record<string, unknown>>(commentResponse);
      if (isApiFailure(commentResponse, commentPayload)) {
        setError(
          getApiErrorMessage(
            commentPayload,
            "Blog created, but the initial comment couldn't be saved."
          )
        );
        setIsSubmitting(false);
        return;
      }
    }

    if (prefilledIdeaId) {
      const { error: ideaUpdateError } = await supabase
        .from("blog_ideas")
        .update({
          is_converted: true,
          converted_blog_id: createdBlogId,
        })
        .eq("id", prefilledIdeaId)
        .eq("is_converted", false);

      if (ideaUpdateError) {
        console.warn("Blog was created, but idea conversion flag failed:", ideaUpdateError);
      }
    }

    setIsSubmitting(false);
    router.push(`/blogs/${createdBlogId}`);
  };

  return (
    <ProtectedPage requiredPermissions={["create_blog"]}>
      <AppShell>
        <div className="max-w-3xl space-y-6">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-xs text-navy-500"
          >
            <Link href="/dashboard" className="hover:text-navy-500">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/blogs" className="hover:text-navy-500">
              Blogs
            </Link>
            <span>/</span>
            <span className="text-navy-500">New</span>
          </nav>
          <header>
            <h2 className="text-xl font-semibold text-ink">Add Blog</h2>
            <p className="text-sm text-navy-500">
              Create a new blog assignment for Sighthound or Redactor.
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {prefillNotice ? (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  convertedIdeaBlogId
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                <p>{prefillNotice}</p>
                {convertedIdeaBlogId ? (
                  <Link
                    href={`/blogs/${convertedIdeaBlogId}`}
                    className="mt-1 inline-flex font-medium underline"
                  >
                    View Blog
                  </Link>
                ) : null}
              </div>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-navy-500">
                Title
              </span>
              <input
                required
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-navy-500">
                  Site
                </span>
                <select
                  value={site}
                  onChange={(event) => {
                    setSite(event.target.value as BlogSite);
                  }}
                  className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                >
                  {SITES.map((nextSite) => (
                    <option key={nextSite} value={nextSite}>
                      {nextSite}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-navy-500">
                  Scheduled Publish Date
                </span>
                <input
                  type="date"
                  value={scheduledPublishDate}
                  onChange={(event) => {
                    setScheduledPublishDate(event.target.value);
                  }}
                  className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={syncDisplayToScheduled}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSyncDisplayToScheduled(checked);
                    if (checked && scheduledPublishDate) {
                      setDisplayPublishDate(scheduledPublishDate);
                    }
                  }}
                  className="rounded border-[color:var(--sh-gray-200)]"
                />
                <span className="text-sm font-medium text-navy-500">
                  Same as Scheduled Publish Date
                </span>
              </div>
              <span className="mb-1 block text-sm font-medium text-navy-500">
                Display Publish Date
              </span>
              <input
                type="date"
                value={displayPublishDate}
                disabled={syncDisplayToScheduled}
                onChange={(event) => {
                  setDisplayPublishDate(event.target.value);
                }}
                className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-blurple-50 disabled:text-navy-500"
              />
            </label>

            {/* Assignment section: admins can assign both, non-admins can select writer (defaults to self) */}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-navy-500">
                  Writer
                </span>
                <select
                  required={canManageWriterAssignment}
                  value={writerId}
                  onChange={(event) => {
                    setWriterId(event.target.value);
                  }}
                  className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                >
                  <option value="">Select writer</option>
                  {users.map((nextUser) => (
                    <option key={nextUser.id} value={nextUser.id}>
                      {nextUser.full_name} ({nextUser.role})
                    </option>
                  ))}
                </select>
                {!canManageWriterAssignment && writerId && (
                  <p className="mt-1 text-xs text-navy-500">
                    Defaults to you, but you can select another writer if needed.
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-2">
                  <span className="block text-sm font-medium text-navy-500">
                    Publisher
                  </span>
                  {lastPublisherName && (
                    <span className="text-xs text-navy-500">
                      (Last used: {lastPublisherName})
                    </span>
                  )}
                </span>
                <select
                  disabled={!canManagePublisherAssignment}
                  value={publisherId}
                  onChange={(event) => {
                    const newPublisherId = event.target.value;
                    setPublisherId(newPublisherId);
                    // Save selection to localStorage if not empty
                    if (newPublisherId && typeof window !== 'undefined') {
                      localStorage.setItem('last_publisher_id', newPublisherId);
                      // Update the last used name for UI
                      const selectedUser = users.find((u) => u.id === newPublisherId);
                      if (selectedUser) {
                        setLastPublisherName(selectedUser.full_name);
                      }
                    } else if (!newPublisherId && typeof window !== 'undefined') {
                      // Clear if unassigned
                      localStorage.removeItem('last_publisher_id');
                      setLastPublisherName(null);
                    }
                  }}
                  className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {users.map((nextUser) => (
                    <option key={nextUser.id} value={nextUser.id}>
                      {nextUser.full_name} ({nextUser.role})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-navy-500">
                Google Doc URL
              </span>
              <input
                type="url"
                value={googleDocUrl}
                onChange={(event) => {
                  setGoogleDocUrl(event.target.value);
                }}
                className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                placeholder="https://docs.google.com/..."
              />
            </label>

            <section className="rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                Comments
              </h3>
              <p className="mt-1 text-xs text-navy-500">
                Optional comment to start discussion before writing or publishing.
              </p>
              <textarea
                disabled={!canCreateComments}
                value={initialComment}
                onChange={(event) => {
                  setInitialComment(event.target.value);
                }}
                className="mt-3 min-h-20 w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-blurple-50 disabled:text-navy-500"
                placeholder="Add an initial comment..."
                maxLength={2000}
              />
              {!canCreateComments ? (
                <p className="mt-2 text-xs text-navy-500">
                  You do not have permission to add comments.
                </p>
              ) : null}
            </section>


            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create Blog"}
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--sh-gray-200)] px-4 py-2 text-sm font-medium text-navy-500 hover:bg-blurple-50"
                onClick={() => {
                  router.push("/dashboard");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}

export default function NewBlogPage() {
  return (
    <Suspense fallback={null}>
      <NewBlogPageContent />
    </Suspense>
  );
}
