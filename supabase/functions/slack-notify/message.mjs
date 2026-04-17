// Pure message-building logic for the Slack notify edge function.
// Runs in Deno (edge function) and Node (scripts/slack-contract-lint.mjs).
// No Deno.env or network I/O here — accept all config as parameters.

export const DEFAULT_APP_URL = "https://sighthound-content-ops.vercel.app";
export const MAX_COMMENT_BODY_LENGTH = 3000;

export const EVENT_CONTENT_TYPE = {
  blog_created: "Blog",
  blog_comment_created: "Blog",
  writer_assigned: "Blog",
  writer_completed: "Blog",
  ready_to_publish: "Blog",
  published: "Blog",
  blog_publish_overdue: "Blog",
  social_post_created: "Social",
  social_comment_created: "Social",
  social_submitted_for_review: "Social",
  social_changes_requested: "Social",
  social_creative_approved: "Social",
  social_ready_to_publish: "Social",
  social_awaiting_live_link: "Social",
  social_published: "Social",
  social_live_link_reminder: "Social",
  social_review_overdue: "Social",
  social_publish_overdue: "Social",
};

export const EVENT_ACTION = {
  blog_created: "Created - draft is ready for work",
  blog_comment_created: "New comment",
  writer_assigned: "Assigned - work can start",
  writer_completed: "Writing complete - awaiting publishing review",
  ready_to_publish: "Ready to publish - awaiting publishing action",
  published: "Published",
  blog_publish_overdue: "Publish overdue - immediate action required",
  social_post_created: "Created - draft is ready for work",
  social_comment_created: "New comment",
  social_submitted_for_review: "Submitted for review - awaiting editorial approval",
  social_changes_requested: "Changes requested - awaiting revision",
  social_creative_approved: "Creative approved - awaiting next action",
  social_ready_to_publish: "Ready to publish - awaiting execution",
  social_awaiting_live_link: "Awaiting live link - awaiting submission",
  social_published: "Published",
  social_live_link_reminder: "Live link reminder - awaiting submission",
  social_review_overdue: "Review overdue - immediate action required",
  social_publish_overdue: "Publish overdue - immediate action required",
};

export const ROLE_LABELS = new Set([
  "writer",
  "publisher",
  "editor",
  "social editor",
  "admin",
]);

export const COMMENT_EVENT_TYPES = new Set([
  "blog_comment_created",
  "social_comment_created",
]);

export function isKnownEventType(eventType) {
  return (
    typeof eventType === "string" &&
    Object.prototype.hasOwnProperty.call(EVENT_CONTENT_TYPE, eventType) &&
    Object.prototype.hasOwnProperty.call(EVENT_ACTION, eventType)
  );
}

export function normalizeAppUrl(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\/$/, "");
}

export function resolveAppUrl({ appUrl, fallbackAppUrl } = {}) {
  return (
    normalizeAppUrl(appUrl) ??
    normalizeAppUrl(fallbackAppUrl) ??
    DEFAULT_APP_URL
  );
}

export function normalizeName(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (ROLE_LABELS.has(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
}

export function resolveAssignedTo(payload) {
  const names = Array.isArray(payload.targetUserNames)
    ? payload.targetUserNames
        .map((name) => normalizeName(name))
        .filter((name) => Boolean(name))
    : [];
  if (names.length > 0) {
    // Case-insensitive dedupe that preserves the first-seen casing.
    const seen = new Set();
    const deduped = [];
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(name);
    }
    return deduped.join(", ");
  }
  return normalizeName(payload.targetUserName) ?? "Team";
}

export function normalizeCommentBody(value, maxLength = MAX_COMMENT_BODY_LENGTH) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    return null;
  }
  const mentionSafe = normalized
    .replace(/@(?=(here|channel|everyone)\b)/gi, "@\u200B")
    .replace(/<@/g, "<@\u200B")
    .replace(/<!/g, "<!\u200B");
  if (mentionSafe.length <= maxLength) {
    return mentionSafe;
  }
  return `${mentionSafe.slice(0, maxLength - 3)}...`;
}

export function buildDeepLink(payload, appUrl) {
  if (payload.socialPostId) {
    return `${appUrl}/social-posts/${payload.socialPostId}`;
  }
  if (payload.blogId) {
    return `${appUrl}/blogs/${payload.blogId}`;
  }
  return null;
}

// Events that should surface a "Submit link" CTA — the worker's next action
// is to paste the published link, not to open the record generically.
const SUBMIT_LINK_EVENT_TYPES = new Set([
  "social_awaiting_live_link",
  "social_live_link_reminder",
]);

// Per-event CTA label mapping. Used as the `|label>` tail in Slack link syntax
// so each notification communicates its specific next action instead of a
// generic "Open".
export function ctaLabelFor(eventType) {
  if (COMMENT_EVENT_TYPES.has(eventType)) return "Open thread";
  if (SUBMIT_LINK_EVENT_TYPES.has(eventType)) return "Submit link";
  if (typeof eventType === "string" && eventType.startsWith("social_")) {
    return "Open post";
  }
  return "Open blog";
}

export function buildOpenLinkLine(eventType, deepLink) {
  if (!deepLink) return null;
  const label = ctaLabelFor(eventType);
  // Emit the bare Slack link (`<URL|label>`) as its own line. The `|label>`
  // tail IS the visible clickable text in Slack, so a prefix like
  // "Open link: Open blog" would render redundantly as "Open link: Open blog"
  // where both halves describe the same action.
  return `<${deepLink}|${label}>`;
}

export function normalizeTitle(title) {
  if (typeof title !== "string") return "";
  return title.trim();
}

// Slack interprets raw `<` / `>` as link or mention delimiters. Escape them
// in the header only — comment bodies keep their formatting via mention-safe
// normalization in normalizeCommentBody().
export function escapeHeaderTitle(title) {
  if (typeof title !== "string") return "";
  return title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function canonicalizeSite(site) {
  if (typeof site !== "string") return "SH";
  const normalized = site.trim().toLowerCase();
  if (!normalized) return "SH";
  if (
    normalized === "sh" ||
    normalized === "sighthound" ||
    normalized === "sighthound.com"
  ) {
    return "SH";
  }
  if (
    normalized === "red" ||
    normalized === "redactor" ||
    normalized === "redactor.com"
  ) {
    return "RED";
  }
  // Unknown values (e.g. social post `product` slugs like "general_company",
  // "platform", "edge_vision") must not leak into the header. Default to SH
  // so the notification is readable; callers that want RED must pass a known
  // canonical form.
  return "SH";
}

export function buildMessage(payload, options = {}) {
  const appUrl = resolveAppUrl({
    appUrl: payload?.appUrl,
    fallbackAppUrl: options.fallbackAppUrl,
  });
  const deepLink = buildDeepLink(payload, appUrl);

  const contentType = EVENT_CONTENT_TYPE[payload.eventType];
  const action = EVENT_ACTION[payload.eventType];
  const assignedBy = normalizeName(payload.actorName) ?? "Team";
  const isCommentEvent = COMMENT_EVENT_TYPES.has(payload.eventType);

  const title = escapeHeaderTitle(normalizeTitle(payload.title));
  // Prefer the linked blog's site when callers provide it. Social post
  // callers historically leaked `product` slugs (e.g. "general_company",
  // "edge_vision") into the raw `site` field; when the emitter has
  // resolved the associated blog's site, that value is authoritative.
  // canonicalizeSite still runs so the SH/RED canonical form is enforced
  // and any remaining unknown value falls back to "SH".
  const rawSite =
    typeof payload.associatedBlogSite === "string" &&
    payload.associatedBlogSite.trim().length > 0
      ? payload.associatedBlogSite
      : payload.site;
  const site = canonicalizeSite(rawSite);
  const headerLine = `[${contentType}] ${title} (${site})`;
  const actionLine = `Action: ${action}`;
  // Slack link syntax `<URL|label>` guarantees a clickable hyperlink across
  // desktop/mobile clients even with unfurl_links: false. A bare URL is not
  // reliably auto-linkified when unfurl is suppressed. The `|label>` tail
  // comes from ctaLabelFor() so each notification describes its own next
  // action (e.g. "Submit link" for live-link reminders).
  const openLine = buildOpenLinkLine(payload.eventType, deepLink);

  if (isCommentEvent) {
    const commentBody = normalizeCommentBody(payload.commentBody);
    const byLine = `By: ${assignedBy}`;
    const commentLine = commentBody
      ? `Comment:\n${commentBody}`
      : "Comment:\n(No comment text)";
    const parts = [headerLine, actionLine, byLine, commentLine];
    if (openLine) parts.push(openLine);
    return parts.join("\n");
  }

  const assignedTo = resolveAssignedTo(payload);
  const assignedToLine = `Assigned to: ${assignedTo}`;
  const assignedByLine = `Assigned by: ${assignedBy}`;

  const parts = [headerLine, actionLine, assignedToLine, assignedByLine];
  if (openLine) parts.push(openLine);
  return parts.join("\n");
}

export const SLACK_DELIVERY_FLAGS = Object.freeze({
  unfurl_links: false,
  unfurl_media: false,
});
