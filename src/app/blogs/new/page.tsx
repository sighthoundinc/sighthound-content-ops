"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { isMissingBlogDateColumnsError } from "@/lib/blog-schema";
import { notifySlack } from "@/lib/notifications";
import { SITES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogSite, ProfileRecord } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewBlogPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
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
    if (!writerId) {
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
      writer_id: writerId || null,
      publisher_id: publisherId || null,
      writer_status: writerId ? "in_progress" : "not_started",
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
      const { error: commentInsertError } = await supabase
        .schema("public")
        .from("blog_comments")
        .insert({
          blog_id: data.id,
          comment: trimmedInitialComment,
          created_by: user.id,
        });
      if (commentInsertError) {
        setError(commentInsertError.message);
        setIsSubmitting(false);
        return;
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

    setIsSubmitting(false);
    router.push(`/blogs/${data.id}`);
  };

  return (
    <ProtectedPage allowedRoles={["admin"]}>
      <AppShell>
        <div className="max-w-3xl space-y-6">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">Add Blog</h2>
            <p className="text-sm text-slate-600">
              Create a new blog assignment for Sighthound or Redactor.
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit}>
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

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Writer
                </span>
                <select
                  required
                  value={writerId}
                  onChange={(event) => {
                    setWriterId(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                  value={publisherId}
                  onChange={(event) => {
                    setPublisherId(event.target.value);
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                value={initialComment}
                onChange={(event) => {
                  setInitialComment(event.target.value);
                }}
                className="mt-3 min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Add an initial comment..."
                maxLength={2000}
              />
            </section>

            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

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
