// Frozen Slack notification payload fixtures.
// These are the "golden set" used by scripts/slack-contract-lint.mjs.
// DO NOT modify during an autoresearch loop — this is the evaluation input.
//
// Each fixture: { id, payload, expect: { ... optional assertions ... } }

export const APP_URL = "https://sighthound-content-ops.vercel.app";

export const fixtures = [
  // ── Blog workflow events ──────────────────────────────────────────
  {
    id: "blog_created_basic",
    payload: {
      eventType: "blog_created",
      blogId: "b1",
      title: "Intro to Edge AI",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Jane Writer",
      appUrl: APP_URL,
    },
  },
  {
    id: "writer_assigned_role_label_actor",
    payload: {
      eventType: "writer_assigned",
      blogId: "b2",
      title: "Vision Agents 101",
      site: "SH",
      actorName: "Admin", // role label — must collapse to "Team"
      targetUserName: "Jane Writer",
      appUrl: APP_URL,
    },
  },
  {
    id: "writer_completed_role_label_target",
    payload: {
      eventType: "writer_completed",
      blogId: "b3",
      title: "Detection Pipelines",
      site: "RED",
      actorName: "Jane Writer",
      targetUserName: "Publisher", // role label — must collapse to "Team"
      appUrl: APP_URL,
    },
  },
  {
    id: "ready_to_publish_multi_assignees",
    payload: {
      eventType: "ready_to_publish",
      blogId: "b4",
      title: "Anomaly Alerts at Scale",
      site: "SH",
      actorName: "Dana Admin",
      targetUserNames: ["Pat Publisher", "Writer", "Sam Publisher"], // dedupe role label
      appUrl: APP_URL,
    },
  },
  {
    id: "published_basic",
    payload: {
      eventType: "published",
      blogId: "b5",
      title: "Scene Understanding Deep Dive",
      site: "SH",
      actorName: "Pat Publisher",
      targetUserName: "Jane Writer",
      appUrl: APP_URL,
    },
  },
  {
    id: "blog_publish_overdue_missing_actor",
    payload: {
      eventType: "blog_publish_overdue",
      blogId: "b6",
      title: "Forensic Search UX",
      site: "RED",
      // actorName missing — must become "Team"
      targetUserName: "Pat Publisher",
      appUrl: APP_URL,
    },
  },
  {
    id: "blog_comment_created_multiline_with_pings",
    payload: {
      eventType: "blog_comment_created",
      blogId: "b7",
      title: "Edge Inference Cost Model",
      site: "SH",
      actorName: "Dana Admin",
      commentBody:
        "Flagging for review.\n\n@channel please re-read lead.\n@here tight turn.\n<@U12345> assigning to you.\n<!subteam^ABCD> huddle at 2pm.",
      appUrl: APP_URL,
    },
  },
  {
    id: "blog_comment_created_empty_comment",
    payload: {
      eventType: "blog_comment_created",
      blogId: "b8",
      title: "Streaming Analytics Update",
      site: "SH",
      actorName: "Jane Writer",
      commentBody: "   ", // whitespace only → "(No comment text)"
      appUrl: APP_URL,
    },
  },

  // ── Social workflow events ────────────────────────────────────────
  {
    id: "social_post_created_basic",
    payload: {
      eventType: "social_post_created",
      socialPostId: "sp1",
      title: "LinkedIn Carousel — Vision ROI",
      site: "SH",
      actorName: "Ali Creator",
      targetUserName: "Ali Creator",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_submitted_for_review",
    payload: {
      eventType: "social_submitted_for_review",
      socialPostId: "sp2",
      title: "IG Post — Detection Demo",
      site: "SH",
      actorName: "Ali Creator",
      targetUserName: "Dana Admin",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_changes_requested",
    payload: {
      eventType: "social_changes_requested",
      socialPostId: "sp3",
      title: "FB Post — Anomaly Alerts",
      site: "RED",
      actorName: "Dana Admin",
      targetUserName: "Ali Creator",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_creative_approved",
    payload: {
      eventType: "social_creative_approved",
      socialPostId: "sp4",
      title: "LI Video — Retail Ops",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Dana Admin",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_ready_to_publish",
    payload: {
      eventType: "social_ready_to_publish",
      socialPostId: "sp5",
      title: "IG Reel — Platform Walkthrough",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Ali Creator",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_awaiting_live_link",
    payload: {
      eventType: "social_awaiting_live_link",
      socialPostId: "sp6",
      title: "FB Link — Thought Leadership",
      site: "SH",
      actorName: "Ali Creator",
      targetUserName: "Ali Creator",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_published",
    payload: {
      eventType: "social_published",
      socialPostId: "sp7",
      title: "LinkedIn Post — Partnership",
      site: "SH",
      actorName: "Ali Creator",
      targetUserName: "Ali Creator",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_live_link_reminder",
    payload: {
      eventType: "social_live_link_reminder",
      socialPostId: "sp8",
      title: "LI Post — Case Study",
      site: "RED",
      actorName: "Dana Admin",
      targetUserName: "Ali Creator",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_review_overdue",
    payload: {
      eventType: "social_review_overdue",
      socialPostId: "sp9",
      title: "IG Carousel — Product Features",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Dana Admin",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_publish_overdue",
    payload: {
      eventType: "social_publish_overdue",
      socialPostId: "sp10",
      title: "FB Video — Customer Story",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Ali Creator",
      appUrl: APP_URL,
    },
  },
  {
    id: "social_comment_created_normal",
    payload: {
      eventType: "social_comment_created",
      socialPostId: "sp11",
      title: "LI Post — Event Recap",
      site: "SH",
      actorName: "Dana Admin",
      commentBody: "Looks great!\nShip it Friday.",
      appUrl: APP_URL,
    },
  },

  // ── Edge cases ────────────────────────────────────────────────────
  {
    id: "missing_app_url_falls_back_to_default",
    payload: {
      eventType: "writer_assigned",
      blogId: "b9",
      title: "Fallback URL Case",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Jane Writer",
      // no appUrl — must resolve to DEFAULT_APP_URL
    },
    expect: {
      openLinkPrefix: "https://sighthound-content-ops.vercel.app/",
    },
  },
  {
    id: "trailing_slash_app_url_is_stripped",
    payload: {
      eventType: "writer_assigned",
      blogId: "b10",
      title: "Trailing Slash Case",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Jane Writer",
      appUrl: "https://example.com/",
    },
    expect: {
      openLinkContains: "https://example.com/blogs/b10",
      openLinkNotContains: "//blogs",
    },
  },
  {
    id: "long_comment_is_truncated",
    payload: {
      eventType: "blog_comment_created",
      blogId: "b11",
      title: "Long Comment Case",
      site: "SH",
      actorName: "Jane Writer",
      commentBody: "x".repeat(5000),
      appUrl: APP_URL,
    },
    expect: {
      commentMaxLength: 3000,
      commentEndsWithEllipsis: true,
    },
  },

  // ── Aspirational hardening (currently failing — targets for autoresearch) ─
  // The contract in AGENTS.md is the minimum bar; these fixtures exercise
  // additional defenses the autoresearch loop is expected to close.
  {
    id: "title_with_angle_brackets_must_be_escaped",
    payload: {
      eventType: "writer_assigned",
      blogId: "b12",
      title: "Edge AI <Beta> — first look",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Jane Writer",
      appUrl: APP_URL,
    },
    expect: {
      headerForbids: ["<Beta>"],
      headerContains: ["&lt;Beta&gt;", "&lt;", "&gt;"],
    },
    aspirational: true,
  },
  {
    id: "site_domain_must_canonicalize_to_SH",
    payload: {
      eventType: "writer_assigned",
      blogId: "b13",
      title: "Canonical Site Case — SH",
      site: "sighthound.com",
      actorName: "Dana Admin",
      targetUserName: "Jane Writer",
      appUrl: APP_URL,
    },
    expect: {
      headerContains: ["(SH)"],
      headerForbids: ["(sighthound.com)", "(Sighthound)"],
    },
    aspirational: true,
  },
  {
    id: "site_domain_must_canonicalize_to_RED",
    payload: {
      eventType: "writer_assigned",
      blogId: "b14",
      title: "Canonical Site Case — RED",
      site: "redactor.com",
      actorName: "Dana Admin",
      targetUserName: "Jane Writer",
      appUrl: APP_URL,
    },
    expect: {
      headerContains: ["(RED)"],
      headerForbids: ["(redactor.com)", "(Redactor)"],
    },
    aspirational: true,
  },
  {
    id: "assignee_dedupe_must_be_case_insensitive",
    payload: {
      eventType: "ready_to_publish",
      blogId: "b15",
      title: "Case-insensitive dedupe check",
      site: "SH",
      actorName: "Dana Admin",
      targetUserNames: ["Ali Creator", "ali creator", "ALI CREATOR", "Pat Publisher"],
      appUrl: APP_URL,
    },
    expect: {
      assignedToEquals: "Ali Creator, Pat Publisher",
    },
    aspirational: true,
  },
  {
    id: "title_whitespace_must_be_trimmed",
    payload: {
      eventType: "writer_assigned",
      blogId: "b16",
      title: "   Padded Title Case   ",
      site: "SH",
      actorName: "Dana Admin",
      targetUserName: "Jane Writer",
      appUrl: APP_URL,
    },
    expect: {
      headerContains: ["[Blog] Padded Title Case (SH)"],
      headerForbids: ["   Padded", "Case   "],
    },
    aspirational: true,
  },

  // ── Round 3 aspirational fixtures ───────────────────────────────────
  // Social post linked to a RED blog: the site header should reflect the
  // associated blog's site, not the social post's `product` slug.
  {
    id: "social_site_resolves_from_linked_blog",
    payload: {
      eventType: "social_submitted_for_review",
      socialPostId: "sp-r3-1",
      title: "IG Post linked to RED blog",
      site: "general_company", // what the current callers leak
      associatedBlogSite: "RED", // what the emitter should prefer
      actorName: "Ali Creator",
      targetUserName: "Dana Admin",
      appUrl: APP_URL,
    },
    expect: {
      headerContains: ["(RED)"],
      headerForbids: ["(general_company)", "(SH)"],
    },
    aspirational: true,
  },
  // Social post without a linked blog: site must fall back to SH, never
  // surface a product slug.
  {
    id: "social_site_defaults_to_SH_when_no_blog",
    payload: {
      eventType: "social_submitted_for_review",
      socialPostId: "sp-r3-2",
      title: "IG Post with no linked blog",
      site: "edge_vision", // product slug leak
      // no associatedBlogSite
      actorName: "Ali Creator",
      targetUserName: "Dana Admin",
      appUrl: APP_URL,
    },
    expect: {
      headerContains: ["(SH)"],
      headerForbids: ["(edge_vision)", "(platform)", "(general_company)"],
    },
    aspirational: true,
  },
  // Another linked-blog case covering a different event type (publish
  // overdue). Ensures the site derivation covers all social event code
  // paths, not just submit-for-review.
  {
    id: "social_publish_overdue_site_from_linked_blog",
    payload: {
      eventType: "social_publish_overdue",
      socialPostId: "sp-r3-3",
      title: "LinkedIn overdue post linked to SH blog",
      site: "platform", // product slug leak
      associatedBlogSite: "SH", // preferred source
      actorName: "Dana Admin",
      targetUserName: "Ali Creator",
      appUrl: APP_URL,
    },
    expect: {
      headerContains: ["(SH)"],
      headerForbids: ["(platform)"],
    },
    aspirational: true,
  },
  // Comment on a social post linked to a RED blog.
  {
    id: "social_comment_site_from_linked_blog",
    payload: {
      eventType: "social_comment_created",
      socialPostId: "sp-r3-4",
      title: "Comment on RED-linked social post",
      site: "general_company",
      associatedBlogSite: "RED",
      actorName: "Dana Admin",
      commentBody: "Looks great, ship it.",
      appUrl: APP_URL,
    },
    expect: {
      headerContains: ["(RED)"],
      headerForbids: ["(general_company)", "(SH)"],
    },
    aspirational: true,
  },
];
