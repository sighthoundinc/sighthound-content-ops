// Machine-checkable rules for the Slack Display Contract.
// AGENTS.md §"Slack Notification Display Contract" is the source of truth.
//
// Each rule takes (message, fixture) and returns { pass, reason? } or an array of such.
// The scorer in scripts/slack-contract-lint.mjs aggregates all rule results.
//
// Keep rule IDs stable — the autoresearch loop tracks pass rate per rule ID.

const COMMENT_EVENTS = new Set(["blog_comment_created", "social_comment_created"]);

const FORBIDDEN_ROLE_TOKENS = [
  // Whole-word role labels that must never appear as the *value* after
  // "Assigned to:", "Assigned by:", or "By:".
  "Writer",
  "Publisher",
  "Editor",
  "Social Editor",
  "Admin",
];

const ROLE_VALUE_REGEXES = [
  /^Assigned to:\s*(.+?)\s*$/m,
  /^Assigned by:\s*(.+?)\s*$/m,
  /^By:\s*(.+?)\s*$/m,
];

function splitLines(message) {
  // Preserve empty lines so we can detect accidental blank gaps.
  return message.split("\n");
}

// ── Rules ─────────────────────────────────────────────────────────────

function ruleHeaderFormat(message, fixture) {
  if (fixture.aspirational) {
    // Aspirational fixtures assert header shape via `expect.headerContains`
    // and `expect.headerForbids` (see ruleHeaderExpectations). The strict
    // equality check here would mis-fire against the padded/raw inputs.
    return { pass: true };
  }
  const lines = splitLines(message);
  const header = lines[0] ?? "";
  const contentType = fixture.payload.socialPostId ? "Social" : "Blog";
  const ok = header === `[${contentType}] ${fixture.payload.title} (${fixture.payload.site})`;
  return {
    pass: ok,
    reason: ok ? undefined : `Header mismatch: "${header}"`,
  };
}

function ruleHeaderExpectations(message, fixture) {
  const expect = fixture.expect ?? {};
  const header = splitLines(message)[0] ?? "";
  const issues = [];
  for (const needle of expect.headerContains ?? []) {
    if (!header.includes(needle)) {
      issues.push({
        pass: false,
        reason: `Header "${header}" missing required substring "${needle}"`,
      });
    }
  }
  for (const needle of expect.headerForbids ?? []) {
    if (header.includes(needle)) {
      issues.push({
        pass: false,
        reason: `Header "${header}" contains forbidden substring "${needle}"`,
      });
    }
  }
  return issues.length > 0 ? issues : { pass: true };
}

function ruleAssignedToEquals(message, fixture) {
  const expect = fixture.expect ?? {};
  if (!expect.assignedToEquals) return { pass: true };
  const line = splitLines(message).find((l) => l.startsWith("Assigned to: ")) ?? "";
  const value = line.replace(/^Assigned to:\s*/, "");
  const ok = value === expect.assignedToEquals;
  return {
    pass: ok,
    reason: ok
      ? undefined
      : `Assigned to mismatch: expected "${expect.assignedToEquals}", got "${value}"`,
  };
}

function ruleActionLine(message) {
  const lines = splitLines(message);
  const line = lines[1] ?? "";
  const ok = /^Action: .+$/.test(line);
  return {
    pass: ok,
    reason: ok ? undefined : `Line 2 must be 'Action: …', got "${line}"`,
  };
}

function ruleWorkflowLineOrder(message, fixture) {
  if (COMMENT_EVENTS.has(fixture.payload.eventType)) {
    return { pass: true };
  }
  const lines = splitLines(message);
  const ok =
    /^Assigned to: /.test(lines[2] ?? "") &&
    /^Assigned by: /.test(lines[3] ?? "");
  return {
    pass: ok,
    reason: ok
      ? undefined
      : `Workflow lines must be: header, Action, Assigned to, Assigned by, [Open link]. Got:\n${message}`,
  };
}

function ruleCommentLineOrder(message, fixture) {
  if (!COMMENT_EVENTS.has(fixture.payload.eventType)) {
    return { pass: true };
  }
  const lines = splitLines(message);
  const ok =
    /^By: /.test(lines[2] ?? "") &&
    /^Comment:$/.test(lines[3] ?? "");
  return {
    pass: ok,
    reason: ok
      ? undefined
      : `Comment lines must be: header, Action: New comment, By:, Comment:\\n…, [Open link]. Got:\n${message}`,
  };
}

function ruleNoForbiddenRoleLabels(message) {
  const issues = [];
  for (const regex of ROLE_VALUE_REGEXES) {
    const match = message.match(regex);
    if (!match) continue;
    const value = match[1].trim();
    for (const token of FORBIDDEN_ROLE_TOKENS) {
      // Exact value match OR role token appears as an isolated word in the value.
      const boundary = new RegExp(`(^|,\\s*)${token}(\\s*,|$)`, "i");
      if (value === token || boundary.test(value)) {
        issues.push({
          pass: false,
          reason: `Value "${value}" contains role label "${token}" — must be resolved name or "Team"`,
        });
      }
    }
  }
  return issues.length > 0 ? issues : { pass: true };
}

function ruleOpenLinkFormat(message, fixture) {
  if (!fixture.payload.blogId && !fixture.payload.socialPostId) {
    return { pass: true };
  }
  const lines = splitLines(message);
  const openLine = lines.find((l) => l.startsWith("Open link: "));
  if (!openLine) {
    return { pass: false, reason: "Missing 'Open link:' line" };
  }
  const url = openLine.replace(/^Open link:\s*/, "");
  const ok = /^https?:\/\//.test(url);
  return {
    pass: ok,
    reason: ok ? undefined : `Open link must be absolute URL, got "${url}"`,
  };
}

function ruleOpenLinkMatchesExpectations(message, fixture) {
  const expect = fixture.expect ?? {};
  const openLine = splitLines(message).find((l) => l.startsWith("Open link: ")) ?? "";
  const url = openLine.replace(/^Open link:\s*/, "");
  const issues = [];
  if (expect.openLinkPrefix && !url.startsWith(expect.openLinkPrefix)) {
    issues.push({
      pass: false,
      reason: `Open link "${url}" does not start with "${expect.openLinkPrefix}"`,
    });
  }
  if (expect.openLinkContains && !url.includes(expect.openLinkContains)) {
    issues.push({
      pass: false,
      reason: `Open link "${url}" missing required substring "${expect.openLinkContains}"`,
    });
  }
  if (expect.openLinkNotContains && url.includes(expect.openLinkNotContains)) {
    issues.push({
      pass: false,
      reason: `Open link "${url}" contains forbidden substring "${expect.openLinkNotContains}"`,
    });
  }
  return issues.length > 0 ? issues : { pass: true };
}

function ruleCommentPingsNeutralized(message, fixture) {
  if (!COMMENT_EVENTS.has(fixture.payload.eventType)) {
    return { pass: true };
  }
  // Only scan the comment body portion (after the "Comment:" line).
  const idx = message.indexOf("\nComment:\n");
  const body = idx >= 0 ? message.slice(idx + "\nComment:\n".length) : "";
  const issues = [];
  // Raw @channel/@here/@everyone (not preceded by zero-width space).
  if (/(^|[^\u200B])@(here|channel|everyone)\b/i.test(body)) {
    issues.push({ pass: false, reason: "Raw @here/@channel/@everyone not neutralized" });
  }
  // Raw <@USERID> mention token.
  if (/<@(?!\u200B)/.test(body)) {
    issues.push({ pass: false, reason: "Raw <@USER> mention not neutralized" });
  }
  // Raw <!subteam> / <!channel> / <!everyone> tokens.
  if (/<!(?!\u200B)/.test(body)) {
    issues.push({ pass: false, reason: "Raw <!subteam> mention not neutralized" });
  }
  return issues.length > 0 ? issues : { pass: true };
}

function ruleCommentPreservesLineBreaks(message, fixture) {
  if (!COMMENT_EVENTS.has(fixture.payload.eventType)) {
    return { pass: true };
  }
  const originalBody = fixture.payload.commentBody ?? "";
  const trimmed = originalBody.trim();
  if (!trimmed || !trimmed.includes("\n")) {
    return { pass: true }; // nothing to preserve
  }
  const idx = message.indexOf("\nComment:\n");
  if (idx < 0) return { pass: false, reason: "Missing Comment: body segment" };
  const body = message.slice(idx + "\nComment:\n".length);
  const ok = body.includes("\n");
  return {
    pass: ok,
    reason: ok ? undefined : "Multi-line comment body collapsed to single line",
  };
}

function ruleCommentLengthCap(message, fixture) {
  if (!COMMENT_EVENTS.has(fixture.payload.eventType)) {
    return { pass: true };
  }
  const expect = fixture.expect ?? {};
  if (!expect.commentMaxLength) return { pass: true };
  const idx = message.indexOf("\nComment:\n");
  const body = idx >= 0 ? message.slice(idx + "\nComment:\n".length) : "";
  // Strip optional Open link trailing portion for length check
  const openIdx = body.lastIndexOf("\nOpen link: ");
  const pureBody = openIdx >= 0 ? body.slice(0, openIdx) : body;
  const issues = [];
  if (pureBody.length > expect.commentMaxLength) {
    issues.push({
      pass: false,
      reason: `Comment body length ${pureBody.length} exceeds cap ${expect.commentMaxLength}`,
    });
  }
  if (expect.commentEndsWithEllipsis && !pureBody.endsWith("...")) {
    issues.push({ pass: false, reason: "Long comment must end with '...'" });
  }
  return issues.length > 0 ? issues : { pass: true };
}

function ruleEmptyCommentFallback(message, fixture) {
  if (!COMMENT_EVENTS.has(fixture.payload.eventType)) {
    return { pass: true };
  }
  const raw = fixture.payload.commentBody;
  if (typeof raw !== "string" || raw.trim().length > 0) {
    return { pass: true };
  }
  const ok = message.includes("\nComment:\n(No comment text)");
  return {
    pass: ok,
    reason: ok ? undefined : "Empty/whitespace comments must fall back to '(No comment text)'",
  };
}

function ruleNoBlankLinesBetweenStructuralLines(message, fixture) {
  // The contract specifies consecutive structural lines (header / Action / Assigned to / Assigned by / Open link).
  // Comment bodies are allowed multi-line. We check only the structural prefix.
  const lines = splitLines(message);
  const isCommentEvent = COMMENT_EVENTS.has(fixture.payload.eventType);
  const structuralCount = isCommentEvent ? 3 : 4; // up to start of Comment: or Open link
  for (let i = 0; i < Math.min(structuralCount, lines.length - 1); i++) {
    if (lines[i] === "") {
      return {
        pass: false,
        reason: `Blank line inside structural prefix (index ${i})`,
      };
    }
  }
  return { pass: true };
}

function ruleMultiAssigneeJoin(message, fixture) {
  const names = fixture.payload.targetUserNames;
  if (!Array.isArray(names) || names.length === 0) return { pass: true };
  const cleanNames = names
    .filter((n) => typeof n === "string" && n.trim().length > 0)
    // role labels must have been filtered out before display
    .filter((n) => !["writer", "publisher", "editor", "social editor", "admin"].includes(n.toLowerCase()));
  if (cleanNames.length < 2) return { pass: true };
  const expected = cleanNames.join(", ");
  const ok = message.includes(`Assigned to: ${expected}`);
  return {
    pass: ok,
    reason: ok
      ? undefined
      : `Multi-assignee join must be 'comma + space': expected 'Assigned to: ${expected}'`,
  };
}

export const rules = [
  { id: "header_format", fn: ruleHeaderFormat, weight: 1 },
  { id: "action_line", fn: ruleActionLine, weight: 1 },
  { id: "workflow_line_order", fn: ruleWorkflowLineOrder, weight: 2 },
  { id: "comment_line_order", fn: ruleCommentLineOrder, weight: 2 },
  { id: "no_forbidden_role_labels", fn: ruleNoForbiddenRoleLabels, weight: 2 },
  { id: "open_link_format", fn: ruleOpenLinkFormat, weight: 1 },
  { id: "open_link_expectations", fn: ruleOpenLinkMatchesExpectations, weight: 1 },
  { id: "comment_pings_neutralized", fn: ruleCommentPingsNeutralized, weight: 2 },
  { id: "comment_preserves_line_breaks", fn: ruleCommentPreservesLineBreaks, weight: 1 },
  { id: "comment_length_cap", fn: ruleCommentLengthCap, weight: 1 },
  { id: "empty_comment_fallback", fn: ruleEmptyCommentFallback, weight: 1 },
  { id: "no_blank_structural_lines", fn: ruleNoBlankLinesBetweenStructuralLines, weight: 1 },
  { id: "multi_assignee_join", fn: ruleMultiAssigneeJoin, weight: 1 },
  // Aspirational hardening rules — heavy weight so fixes move the metric meaningfully:
  { id: "header_expectations", fn: ruleHeaderExpectations, weight: 5 },
  { id: "assigned_to_equals", fn: ruleAssignedToEquals, weight: 5 },
];
