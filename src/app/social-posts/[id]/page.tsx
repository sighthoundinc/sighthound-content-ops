"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { DataPageHeader } from "@/components/data-page";
import { ExternalLink } from "@/components/external-link";
import { ProtectedPage } from "@/components/protected-page";
import { SocialPostStatusBadge } from "@/components/status-badge";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_POST_PRODUCTS,
  SOCIAL_POST_PRODUCT_LABELS,
  SOCIAL_POST_TYPES,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPE_LABELS,
} from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  BlogSite,
  SocialPlatform,
  SocialPostProduct,
  SocialPostStatus,
  SocialPostType,
} from "@/lib/types";
import { formatDateInput } from "@/lib/utils";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type BlogLookupResult = {
  id: string;
  title: string;
  slug: string | null;
  site: BlogSite;
  live_url?: string | null;
};

type SocialPostEditorRecord = {
  id: string;
  title: string;
  product: SocialPostProduct;
  type: SocialPostType;
  canva_url: string | null;
  canva_page: number | null;
  caption: string | null;
  platforms: SocialPlatform[];
  scheduled_date: string | null;
  status: SocialPostStatus;
  associated_blog_id: string | null;
  associated_blog: BlogLookupResult | null;
  updated_at: string;
};

type EditorFormState = {
  title: string;
  product: SocialPostProduct;
  type: SocialPostType;
  canva_url: string;
  canva_page: string;
  caption: string;
  platforms: SocialPlatform[];
  scheduled_date: string;
  status: SocialPostStatus;
  associated_blog_id: string | null;
};

const LINKEDIN_CAPTION_LIMIT = 3000;
const AUTOSAVE_DEBOUNCE_MS = 30000;
const PLATFORM_CAPTION_GUIDANCE: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn: lead with a strong hook, then add concise proof points.",
  facebook: "Facebook: keep it short, clear, and conversational with one CTA.",
  instagram: "Instagram: front-load impact and keep hashtag use intentional.",
};

// Unicode bold sans-serif characters for LinkedIn-compatible bold text
const BOLD_SANS_UPPER = "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭";
const BOLD_SANS_LOWER = "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇";
const BOLD_SANS_DIGITS = "𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵";

function toBoldFormat(input: string) {
  let output = "";
  for (const character of input) {
    if (character >= "A" && character <= "Z") {
      output += BOLD_SANS_UPPER[character.charCodeAt(0) - 65];
      continue;
    }
    if (character >= "a" && character <= "z") {
      output += BOLD_SANS_LOWER[character.charCodeAt(0) - 97];
      continue;
    }
    if (character >= "0" && character <= "9") {
      output += BOLD_SANS_DIGITS[character.charCodeAt(0) - 48];
      continue;
    }
    output += character;
  }
  return output;
}

function formatSavedTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizePostRow(row: Record<string, unknown>): SocialPostEditorRecord {
  const associatedBlogRaw = row.associated_blog;
  const associatedBlog = Array.isArray(associatedBlogRaw)
    ? ((associatedBlogRaw[0] ?? null) as BlogLookupResult | null)
    : ((associatedBlogRaw ?? null) as BlogLookupResult | null);
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    product: (row.product as SocialPostProduct) ?? "general_company",
    type: (row.type as SocialPostType) ?? "image",
    canva_url: typeof row.canva_url === "string" ? row.canva_url : null,
    canva_page:
      typeof row.canva_page === "number"
        ? row.canva_page
        : typeof row.canva_page === "string"
          ? Number(row.canva_page) || null
          : null,
    caption: typeof row.caption === "string" ? row.caption : null,
    platforms: Array.isArray(row.platforms)
      ? row.platforms.filter((platform): platform is SocialPlatform => typeof platform === "string")
      : [],
    scheduled_date: typeof row.scheduled_date === "string" ? row.scheduled_date : null,
    status: (row.status as SocialPostStatus) ?? "idea",
    associated_blog_id: typeof row.associated_blog_id === "string" ? row.associated_blog_id : null,
    associated_blog: associatedBlog,
    updated_at: String(row.updated_at ?? ""),
  };
}

export default function SocialPostEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSaving, showSuccess, showError, updateStatus } = useSystemFeedback();
  const postId = params?.id ?? "";
  const captionRef = useRef<HTMLTextAreaElement | null>(null);

  const [post, setPost] = useState<SocialPostEditorRecord | null>(null);
  const [form, setForm] = useState<EditorFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blogSearchQuery, setBlogSearchQuery] = useState("");
  const [blogSearchResults, setBlogSearchResults] = useState<BlogLookupResult[]>([]);
  const [isBlogSearchOpen, setIsBlogSearchOpen] = useState(false);
  const [isBlogSearchLoading, setIsBlogSearchLoading] = useState(false);

  const loadPost = useCallback(async () => {
    if (!postId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from("social_posts")
      .select(
        "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,associated_blog_id,updated_at,associated_blog:associated_blog_id(id,title,slug,site,live_url)"
      )
      .eq("id", postId)
      .single();
    if (loadError) {
      setError(`Couldn't load post. ${loadError.message}`);
      setIsLoading(false);
      return;
    }
    const normalized = normalizePostRow((data ?? {}) as Record<string, unknown>);
    setPost(normalized);
    setForm({
      title: normalized.title,
      product: normalized.product,
      type: normalized.type,
      canva_url: normalized.canva_url ?? "",
      canva_page: normalized.canva_page ? String(normalized.canva_page) : "",
      caption: normalized.caption ?? "",
      platforms: normalized.platforms,
      scheduled_date: formatDateInput(normalized.scheduled_date),
      status: normalized.status,
      associated_blog_id: normalized.associated_blog_id,
    });
    setBlogSearchQuery(normalized.associated_blog?.title ?? "");
    setIsLoading(false);
  }, [postId]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    const query = blogSearchQuery.trim();
    if (!isBlogSearchOpen || query.length === 0) {
      setBlogSearchResults([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        setIsBlogSearchLoading(true);
        const { data, error: searchError } = await supabase.rpc("search_blog_lookup", {
          p_query: query,
          p_limit: 8,
        });
        if (searchError) {
          showError(`Couldn't search blogs. ${searchError.message}`);
          setBlogSearchResults([]);
          setIsBlogSearchLoading(false);
          return;
        }
        setBlogSearchResults((data ?? []) as BlogLookupResult[]);
        setIsBlogSearchLoading(false);
      })();
    }, 220);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [blogSearchQuery, isBlogSearchOpen, showError]);

  const persistPost = useCallback(
    async (nextForm: EditorFormState, reason: "autosave" | "manual" = "autosave") => {
      if (!post) {
        return;
      }
      const statusId = showSaving(reason === "autosave" ? "Saving…" : "Updating post…");
      setIsSaving(true);
      const supabase = getSupabaseBrowserClient();
      const canvaPage =
        nextForm.canva_page.trim().length > 0 && !Number.isNaN(Number(nextForm.canva_page))
          ? Math.max(1, Number(nextForm.canva_page))
          : null;
      const { data, error: saveError } = await supabase
        .from("social_posts")
        .update({
          title: nextForm.title.trim(),
          product: nextForm.product,
          type: nextForm.type,
          canva_url: nextForm.canva_url.trim() || null,
          canva_page: canvaPage,
          caption: nextForm.caption,
          platforms: Array.from(new Set(nextForm.platforms)),
          scheduled_date: nextForm.scheduled_date || null,
          status: nextForm.status,
          associated_blog_id: nextForm.associated_blog_id,
        })
        .eq("id", post.id)
        .select(
          "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,associated_blog_id,updated_at,associated_blog:associated_blog_id(id,title,slug,site,live_url)"
        )
        .single();
      if (saveError) {
        updateStatus(statusId, { type: "error", message: `Couldn't save. ${saveError.message}` });
        setIsSaving(false);
        return;
      }
      const normalized = normalizePostRow((data ?? {}) as Record<string, unknown>);
      setPost(normalized);
      updateStatus(statusId, { type: "success", message: "Post saved" });
      setIsSaving(false);
    },
    [post, showSaving, updateStatus]
  );

  useEffect(() => {
    if (!form || !post) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void persistPost(form, "autosave");
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [form, post, persistPost]);

  const captionLength = form?.caption.length ?? 0;
  const isOverLimit = captionLength > LINKEDIN_CAPTION_LIMIT;
  const hasTitle = Boolean(form?.title.trim());
  const hasCaption = Boolean(form?.caption.trim());
  const hasPlatform = Boolean(form && form.platforms.length > 0);
  const hasPublishDate = Boolean(form?.scheduled_date);
  const hasCanvaLink = Boolean(form?.canva_url.trim());
  const hasLinkedBlog = Boolean(form?.associated_blog_id);
  const isDraftComplete =
    hasTitle && hasCaption && hasPlatform && hasPublishDate && hasCanvaLink;
  const canTransitionToReview =
    isDraftComplete || form?.status === "review" || form?.status === "published";
  const canTransitionToPublished =
    isDraftComplete && (form?.status === "review" || form?.status === "published");

  const checklistItems = useMemo(
    () => [
      { label: "Title exists", done: hasTitle, required: true },
      { label: "Platform selected", done: hasPlatform, required: true },
      { label: "Publish date set", done: hasPublishDate, required: true },
      { label: "Canva link added", done: hasCanvaLink, required: true },
      { label: "Caption written", done: hasCaption, required: true },
      { label: "Blog linked", done: hasLinkedBlog, required: false },
    ],
    [hasCanvaLink, hasCaption, hasLinkedBlog, hasPlatform, hasPublishDate, hasTitle]
  );
  const finalAction = useMemo(() => {
    if (form?.status === "idea") {
      if (!isDraftComplete) {
        return {
          label: "Save Draft",
          nextStatus: "idea" as SocialPostStatus,
          helper: "Complete required checklist items to move this to Review.",
        };
      }
      return {
        label: "Move to Review",
        nextStatus: "review" as SocialPostStatus,
        helper: "Draft is complete. Move this post to Review.",
      };
    }
    if (form?.status === "review") {
      if (!isDraftComplete) {
        return {
          label: "Save Draft",
          nextStatus: "idea" as SocialPostStatus,
          helper: "Review requires all required items. Saving this back to Draft.",
        };
      }
      return {
        label: "Mark Published",
        nextStatus: "published" as SocialPostStatus,
        helper: "Review is complete. Mark this post as Published.",
      };
    }
    return {
      label: "Save Changes",
      nextStatus: "published" as SocialPostStatus,
      helper: "Update details for this published post.",
    };
  }, [form?.status, isDraftComplete]);

  const applyCaptionEdit = (nextCaption: string, selectionStart: number, selectionEnd: number) => {
    setForm((previous) => (previous ? { ...previous, caption: nextCaption } : previous));
    window.setTimeout(() => {
      if (!captionRef.current) {
        return;
      }
      captionRef.current.focus();
      captionRef.current.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  };

  const handleBoldFormat = () => {
    if (!captionRef.current || !form) {
      return;
    }
    const start = captionRef.current.selectionStart;
    const end = captionRef.current.selectionEnd;
    if (start === end) {
      showError("Select text first.");
      return;
    }
    const selected = form.caption.slice(start, end);
    const transformed = toBoldFormat(selected);
    const next = `${form.caption.slice(0, start)}${transformed}${form.caption.slice(end)}`;
    applyCaptionEdit(next, start, start + transformed.length);
    showSuccess("Bold format applied");
  };

  const handleInsertBullet = () => {
    if (!captionRef.current || !form) {
      return;
    }
    const start = captionRef.current.selectionStart;
    const end = captionRef.current.selectionEnd;
    const prefix = start > 0 && form.caption[start - 1] !== "\n" ? "\n" : "";
    const insertion = `${prefix}• `;
    const next = `${form.caption.slice(0, start)}${insertion}${form.caption.slice(end)}`;
    const cursor = start + insertion.length;
    applyCaptionEdit(next, cursor, cursor);
  };

  const handleCaptionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!form) {
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    const target = event.currentTarget;
    const cursor = target.selectionStart;
    const lineStart = form.caption.lastIndexOf("\n", cursor - 1) + 1;
    const lineEnd = form.caption.indexOf("\n", cursor);
    const currentLine = form.caption.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (!currentLine.startsWith("• ")) {
      return;
    }
    event.preventDefault();
    const contentAfterBullet = currentLine.slice(2).trim();
    if (contentAfterBullet.length === 0) {
      const replacement = "\n";
      const next = `${form.caption.slice(0, lineStart)}${replacement}${form.caption.slice(cursor)}`;
      applyCaptionEdit(next, lineStart + 1, lineStart + 1);
      return;
    }
    const insertion = "\n• ";
    const next = `${form.caption.slice(0, cursor)}${insertion}${form.caption.slice(cursor)}`;
    const nextCursor = cursor + insertion.length;
    applyCaptionEdit(next, nextCursor, nextCursor);
  };

  const copyText = async (text: string) => {
    if (!text.trim()) {
      showError("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Copied to clipboard");
    } catch {
      showError("Copy failed. Try again");
    }
  };
  const handleFinalAction = () => {
    if (!form) {
      return;
    }
    const nextForm: EditorFormState = {
      ...form,
      status: finalAction.nextStatus,
    };
    setForm(nextForm);
    void persistPost(nextForm, "manual");
  };

  if (isLoading) {
    return (
      <ProtectedPage>
        <AppShell>
          <div className="space-y-4">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-72 w-full" />
          </div>
        </AppShell>
      </ProtectedPage>
    );
  }

  if (!form || !post) {
    return (
      <ProtectedPage>
        <AppShell>
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error ?? "Post not found."}
          </div>
        </AppShell>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-5">
          <DataPageHeader
            title={form.title || "Social Post"}
            description="Follow the natural flow: Setup → Link Context → Write Caption → Review & Publish."
            primaryAction={
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    router.push("/social-posts");
                  }}
                >
                  Back to Social Posts
                </Button>
              </div>
            }
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    1
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Setup</h3>
                    <p className="text-sm text-slate-600">
                      Define the post essentials before writing or review.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                    <span className="font-medium">Post Title</span>
                    <input
                      value={form.title}
                      onChange={(event) => {
                        setForm((previous) =>
                          previous ? { ...previous, title: event.target.value } : previous
                        );
                      }}
                      className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                    <span className="font-medium">Platform(s)</span>
                    <div className="flex flex-wrap gap-2">
                      {SOCIAL_PLATFORMS.map((platform) => {
                        const isSelected = form.platforms.includes(platform);
                        return (
                          <Button
                            key={platform}
                            size="xs"
                            variant={isSelected ? "primary" : "secondary"}
                            onClick={() => {
                              setForm((previous) => {
                                if (!previous) {
                                  return previous;
                                }
                                const nextPlatforms = previous.platforms.includes(platform)
                                  ? previous.platforms.filter((entry) => entry !== platform)
                                  : [...previous.platforms, platform];
                                return { ...previous, platforms: nextPlatforms };
                              });
                            }}
                          >
                            {SOCIAL_PLATFORM_LABELS[platform]}
                          </Button>
                        );
                      })}
                    </div>
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-medium">Publish Date</span>
                    <input
                      type="date"
                      value={form.scheduled_date}
                      onChange={(event) => {
                        setForm((previous) =>
                          previous ? { ...previous, scheduled_date: event.target.value } : previous
                        );
                      }}
                      className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-medium">Canva Link</span>
                    <input
                      type="url"
                      value={form.canva_url}
                      onChange={(event) => {
                        setForm((previous) =>
                          previous ? { ...previous, canva_url: event.target.value } : previous
                        );
                      }}
                      className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="https://www.canva.com/..."
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-medium">Canva Page</span>
                    <input
                      value={form.canva_page}
                      onChange={(event) => {
                        setForm((previous) =>
                          previous ? { ...previous, canva_page: event.target.value } : previous
                        );
                      }}
                      className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="e.g. 23"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-medium">Product</span>
                    <select
                      value={form.product}
                      onChange={(event) => {
                        setForm((previous) =>
                          previous
                            ? { ...previous, product: event.target.value as SocialPostProduct }
                            : previous
                        );
                      }}
                      className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_PRODUCTS.map((product) => (
                        <option key={product} value={product}>
                          {SOCIAL_POST_PRODUCT_LABELS[product]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span className="font-medium">Type</span>
                    <select
                      value={form.type}
                      onChange={(event) => {
                        setForm((previous) =>
                          previous ? { ...previous, type: event.target.value as SocialPostType } : previous
                        );
                      }}
                      className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {SOCIAL_POST_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    2
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Link Context <span className="text-slate-500">(optional)</span>
                    </h3>
                    <p className="text-sm text-slate-600">
                      Link a related blog so caption and publishing context stay connected.
                    </p>
                  </div>
                </div>
                <label className="space-y-1 text-sm text-slate-700">
                  <span className="font-medium">Associated Blog Search</span>
                  <input
                    value={blogSearchQuery}
                    onFocus={() => setIsBlogSearchOpen(true)}
                    onChange={(event) => {
                      setBlogSearchQuery(event.target.value);
                      setIsBlogSearchOpen(true);
                    }}
                    className="focus-field w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Search blog title..."
                  />
                </label>
                {isBlogSearchOpen ? (
                  <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white">
                    {isBlogSearchLoading ? (
                      <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
                    ) : blogSearchResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-500">No matching blogs.</p>
                    ) : (
                      blogSearchResults.map((blog) => (
                        <button
                          key={blog.id}
                          type="button"
                          className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                          onClick={() => {
                            setForm((previous) =>
                              previous ? { ...previous, associated_blog_id: blog.id } : previous
                            );
                            setPost((previous) =>
                              previous ? { ...previous, associated_blog_id: blog.id, associated_blog: blog } : previous
                            );
                            setBlogSearchQuery(blog.title);
                            setBlogSearchResults([]);
                            setIsBlogSearchOpen(false);
                          }}
                        >
                          <p className="text-sm font-medium text-slate-900">{blog.title}</p>
                          <p className="text-xs text-slate-500">
                            {blog.slug || "no-slug"} • {blog.site}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
                {form.associated_blog_id ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-900">
                      {post.associated_blog?.title ?? "Blog linked"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {post.associated_blog?.site ?? "Linked blog"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          void copyText(post.associated_blog?.live_url ?? "");
                        }}
                      >
                        Copy URL
                      </Button>
                      {post.associated_blog?.live_url ? (
                        <ExternalLink
                          href={post.associated_blog.live_url}
                          className="text-xs font-medium text-blue-600 underline"
                        >
                          Open Blog
                        </ExternalLink>
                      ) : null}
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          setForm((previous) =>
                            previous ? { ...previous, associated_blog_id: null } : previous
                          );
                          setPost((previous) =>
                            previous
                              ? { ...previous, associated_blog_id: null, associated_blog: null }
                              : previous
                          );
                          setBlogSearchQuery("");
                          setBlogSearchResults([]);
                          setIsBlogSearchOpen(false);
                        }}
                      >
                        Clear Link
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No linked blog yet.</p>
                )}
              </section>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    3
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Write Caption</h3>
                    <p className="text-sm text-slate-600">
                      Use the editor like a focused notepad, then copy from one menu.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700">Caption Editor (UTF-8)</p>
                    <div className="flex items-center gap-1">
                      <span className="tooltip-container">
                        <Button
                          variant="icon"
                          size="icon"
                          aria-label="Bold format"
                          onClick={handleBoldFormat}
                        >
                          <strong>B</strong>
                        </Button>
                        <span className="tooltip-bubble">Bold Sans (LinkedIn)</span>
                      </span>
                      <span className="tooltip-container">
                        <Button
                          variant="icon"
                          size="icon"
                          aria-label="Insert bullet"
                          onClick={handleInsertBullet}
                        >
                          •
                        </Button>
                        <span className="tooltip-bubble">Insert bullet</span>
                      </span>
                    </div>
                  </div>
                  <textarea
                    ref={captionRef}
                    value={form.caption}
                    onChange={(event) => {
                      setForm((previous) =>
                        previous ? { ...previous, caption: event.target.value } : previous
                      );
                    }}
                    onKeyDown={handleCaptionKeyDown}
                    className="focus-field min-h-[24rem] w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed"
                    placeholder="Write your social caption..."
                  />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p
                        className={`text-xs font-medium ${
                          isOverLimit ? "text-rose-700" : "text-slate-500"
                        }`}
                      >
                        {captionLength} / {LINKEDIN_CAPTION_LIMIT}
                      </p>
                      {form.platforms.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          Select at least one platform for platform-specific guidance.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {form.platforms.map((platform) => (
                            <li key={platform} className="text-xs text-slate-500">
                              {PLATFORM_CAPTION_GUIDANCE[platform]}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <details className="relative">
                      <summary className="list-none cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Copy
                      </summary>
                      <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            void copyText(form.caption);
                          }}
                        >
                          Caption
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            const url = post.associated_blog?.live_url ?? "";
                            void copyText(`${form.caption}\n\n${url}`.trim());
                          }}
                        >
                          Caption + URL
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            void copyText(post.associated_blog?.live_url ?? "");
                          }}
                        >
                          URL only
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    4
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Review & Publish</h3>
                    <p className="text-sm text-slate-600">
                      Validate checklist items, manage transitions, and run the final stage action.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Checklist + Validation
                  </p>
                  <ul className="space-y-1">
                    {checklistItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                            item.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {item.done ? "✓" : "•"}
                        </span>
                        <span>{item.label}</span>
                        <span className="text-xs text-slate-500">
                          {item.required ? "(required)" : "(optional)"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status Transition Controls
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant={form.status === "idea" ? "primary" : "secondary"}
                      onClick={() => {
                        setForm((previous) =>
                          previous ? { ...previous, status: "idea" } : previous
                        );
                      }}
                    >
                      Draft
                    </Button>
                    <Button
                      size="sm"
                      variant={form.status === "review" ? "primary" : "secondary"}
                      disabled={!canTransitionToReview}
                      onClick={() => {
                        setForm((previous) =>
                          previous ? { ...previous, status: "review" } : previous
                        );
                      }}
                    >
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant={form.status === "published" ? "primary" : "secondary"}
                      disabled={!canTransitionToPublished}
                      onClick={() => {
                        setForm((previous) =>
                          previous ? { ...previous, status: "published" } : previous
                        );
                      }}
                    >
                      Published
                    </Button>
                    <SocialPostStatusBadge status={form.status} />
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm text-slate-600">{finalAction.helper}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Next stage: {SOCIAL_POST_STATUS_LABELS[finalAction.nextStatus]}
                  </p>
                  {isOverLimit ? (
                    <p className="mt-1 text-xs text-rose-700">
                      Caption exceeds the LinkedIn character limit.
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isSaving || isOverLimit}
                      onClick={handleFinalAction}
                    >
                      {isSaving ? "Saving…" : finalAction.label}
                    </Button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <section className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Workflow Progress
                </p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {hasTitle && hasPlatform && hasPublishDate && hasCanvaLink ? "✓" : "1"}
                    </span>
                    Setup
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {hasLinkedBlog ? "✓" : "2"}
                    </span>
                    Link Context (optional)
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {hasCaption ? "✓" : "3"}
                    </span>
                    Write Caption
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {form.status === "published" ? "✓" : "4"}
                    </span>
                    Review & Publish
                  </li>
                </ul>
              </section>
              <section className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current Snapshot
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <SocialPostStatusBadge status={form.status} />
                </div>
                <p className="text-xs text-slate-600">
                  Product: {SOCIAL_POST_PRODUCT_LABELS[form.product]}
                </p>
                <p className="text-xs text-slate-600">Type: {SOCIAL_POST_TYPE_LABELS[form.type]}</p>
                <p className="text-xs text-slate-600">
                  Last saved: {formatSavedTimestamp(post.updated_at)}
                </p>
              </section>
            </aside>
          </div>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
