"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import {
  isMissingBlogCommentsTableError,
  isMissingBlogDateColumnsError,
} from "@/lib/blog-schema";
import { notifySlack } from "@/lib/notifications";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import { SITES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogSite, ProfileRecord } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isMissingBlogCommentUserIdColumnError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text =
    `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return code === "42703" && text.includes("user_id");
}

function NewBlogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, user, profile } = useAuth();
  const { showError } = useSystemFeedback();
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
  const [initialComment, setInitialComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilledIdeaId, setPrefilledIdeaId] = useState<string | null>(null);
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);
  const [convertedIdeaBlogId, setConvertedIdeaBlogId] = useState<string | null>(null);
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canCreateComments = permissionContract.canCreateComment;
  const canManageWriterAssignment = permissionContract.canChangeWriterAssignment;
  const canManagePublisherAssignment = permissionContract.canChangePublisherAssignment;
  const canManageAssignments = canManageWriterAssignment || canManagePublisherAssignment;

  useEffect(() => {
    const loadUsers = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true });
      if (usersError) {
        setError(usersError.message);
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
        setError(ideaError.message);
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

  useEffect(() => {
    if (
      !requestedScheduledPublishDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(requestedScheduledPublishDate)
    ) {
      return;
    }
    setScheduledPublishDate((previous) => previous || requestedScheduledPublishDate);
    setDisplayPublishDate((previous) => previous || requestedScheduledPublishDate);
  }, [requestedScheduledPublishDate]);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  const selectedWriter = useMemo(
    () => users.find((nextUser) => nextUser.id === writerId) ?? null,
    [users, writerId]
  );

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

    setIsSubmitting(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const payload = {
      title: title.trim(),
      slug: slugify(title),
      site,
      writer_id: canManageWriterAssignment ? writerId || null : null,
      publisher_id: canManagePublisherAssignment ? publisherId || null : null,
      writer_status: canManageWriterAssignment && writerId ? "in_progress" : "not_started",
      publisher_status: "not_started",
      google_doc_url: googleDocUrl.trim() || null,
      scheduled_publish_date: scheduledPublishDate || null,
      display_published_date: displayPublishDate || scheduledPublishDate || null,
      target_publish_date: scheduledPublishDate || null,
      created_by: user.id,
    };

    let { data, error: insertError } = await supabase
      .from("blogs")
      .insert(payload)
      .select("id,title,site")
      .single();

    if (isMissingBlogDateColumnsError(insertError)) {
      const legacyPayload = {
        ...payload,
      };
      delete (legacyPayload as { scheduled_publish_date?: string | null }).scheduled_publish_date;
      delete (legacyPayload as { display_published_date?: string | null }).display_published_date;

      const fallbackInsert = await supabase
        .from("blogs")
        .insert(legacyPayload)
        .select("id,title,site")
        .single();
      data = fallbackInsert.data;
      insertError = fallbackInsert.error;
    }

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }
    if (!data) {
      setError("Failed to create blog.");
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
      let { error: commentInsertError } = await supabase
        .schema("public")
        .from("blog_comments")
        .insert({
          blog_id: data.id,
          comment: trimmedInitialComment,
          user_id: user.id,
        });

      if (isMissingBlogCommentUserIdColumnError(commentInsertError)) {
        const fallback = await supabase
          .schema("public")
          .from("blog_comments")
          .insert({
            blog_id: data.id,
            comment: trimmedInitialComment,
            created_by: user.id,
          });
        commentInsertError = fallback.error;
      }
      if (commentInsertError) {
        if (isMissingBlogCommentsTableError(commentInsertError)) {
          console.warn(
            "Initial comment skipped because public.blog_comments is unavailable in schema cache.",
            commentInsertError
          );
        } else {
          setError(commentInsertError.message);
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (writerId && selectedWriter) {
      await notifySlack({
        eventType: "writer_assigned",
        blogId: data.id,
        title: data.title,
        site: data.site,
        actorName: profile?.full_name ?? "Admin",
        targetEmail: selectedWriter.email,
      });
    }

    if (prefilledIdeaId) {
      const { error: ideaUpdateError } = await supabase
        .from("blog_ideas")
        .update({
          is_converted: true,
          converted_blog_id: data.id,
        })
        .eq("id", prefilledIdeaId)
        .eq("is_converted", false);

      if (ideaUpdateError) {
        console.warn("Blog was created, but idea conversion flag failed:", ideaUpdateError);
      }
    }

    setIsSubmitting(false);
    router.push(`/blogs/${data.id}`);
  };

  return (
    <ProtectedPage requiredPermissions={["create_blog"]}>
      <AppShell>
        <div className="max-w-3xl space-y-6">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">Add Blog</h2>
            <p className="text-sm text-slate-600">
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
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Title
              </span>
              <input
                required
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Site
                </span>
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
                  Scheduled Publish Date
                </span>
                <input
                  type="date"
                  value={scheduledPublishDate}
                  onChange={(event) => {
                    setScheduledPublishDate(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Display Publish Date
              </span>
              <input
                type="date"
                value={displayPublishDate}
                onChange={(event) => {
                  setDisplayPublishDate(event.target.value);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            {canManageAssignments ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Writer
                  </span>
                  <select
                    required={canManageWriterAssignment}
                    disabled={!canManageWriterAssignment}
                    value={writerId}
                    onChange={(event) => {
                      setWriterId(event.target.value);
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    <option value="">Select writer</option>
                    {users.map((nextUser) => (
                      <option key={nextUser.id} value={nextUser.id}>
                        {nextUser.full_name} ({nextUser.role})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Publisher
                  </span>
                  <select
                    disabled={!canManagePublisherAssignment}
                    value={publisherId}
                    onChange={(event) => {
                      setPublisherId(event.target.value);
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
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
            ) : (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Blog will be created without assignment unless assignment permissions are enabled.
              </p>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Google Doc URL
              </span>
              <input
                type="url"
                value={googleDocUrl}
                onChange={(event) => {
                  setGoogleDocUrl(event.target.value);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://docs.google.com/..."
              />
            </label>

            <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Comments
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Optional comment to start discussion before writing or publishing.
              </p>
              <textarea
                disabled={!canCreateComments}
                value={initialComment}
                onChange={(event) => {
                  setInitialComment(event.target.value);
                }}
                className="mt-3 min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Add an initial comment..."
                maxLength={2000}
              />
              {!canCreateComments ? (
                <p className="mt-2 text-xs text-slate-500">
                  You do not have permission to add comments.
                </p>
              ) : null}
            </section>


            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create Blog"}
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
