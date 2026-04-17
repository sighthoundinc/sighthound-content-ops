/**
 * Safe links.
 *
 * Ask AI NEVER fabricates URLs. We derive a small, curated list of relevant
 * links from the grounded facts object on the server, and Gemini may only
 * reference these links by their stable `key`. That keeps the surface
 * completely safe from URL hallucination while still giving the assistant
 * natural "Open Google Doc" / "View Canva" affordances.
 */

import type { FactContext } from "./fact-provider";

export type AskAISafeLinkKind = "internal" | "external";

export interface AskAISafeLink {
  key: string;
  label: string;
  href: string;
  kind: AskAISafeLinkKind;
}

function internal(key: string, label: string, href: string): AskAISafeLink {
  return { key, label, href, kind: "internal" };
}

function external(key: string, label: string, href: string): AskAISafeLink {
  return { key, label, href, kind: "external" };
}

export function buildSafeLinks(
  entityType: "blog" | "social_post" | "idea" | "workspace",
  entityId: string | null,
  facts: FactContext
): AskAISafeLink[] {
  const links: AskAISafeLink[] = [];

  if (entityType === "blog" && entityId) {
    links.push(internal("blog_detail", "Open blog", `/blogs/${entityId}`));
    if (facts && facts.kind === "blog") {
      if (facts.googleDocUrl) {
        links.push(external("google_doc", "Open Google Doc", facts.googleDocUrl));
      }
      if (facts.liveUrl) {
        links.push(external("live_url", "View live blog", facts.liveUrl));
      }
    }
  }

  if (entityType === "social_post" && entityId) {
    links.push(internal("social_detail", "Open post", `/social-posts/${entityId}`));
    if (facts && facts.kind === "social_post") {
      if (facts.canvaUrl) {
        links.push(external("canva", "Open Canva", facts.canvaUrl));
      }
      if (facts.associatedBlogId) {
        links.push(
          internal(
            "associated_blog",
            "Open associated blog",
            `/blogs/${facts.associatedBlogId}`
          )
        );
      }
      for (const [index, url] of (facts.liveLinks ?? []).entries()) {
        links.push(external(`live_link_${index + 1}`, `View live post ${index + 1}`, url));
        if (index >= 1) break; // cap at two live-link chips
      }
    }
  }

  if (entityType === "idea" && entityId) {
    links.push(internal("idea_detail", "Open idea", `/ideas/${entityId}`));
    if (facts && facts.kind === "idea" && facts.convertedBlogId) {
      links.push(
        internal(
          "converted_blog",
          "Open converted blog",
          `/blogs/${facts.convertedBlogId}`
        )
      );
    }
  }

  if (entityType === "workspace") {
    links.push(internal("dashboard", "Go to dashboard", "/dashboard"));
    links.push(internal("my_tasks", "Open My Tasks", "/tasks"));
    links.push(internal("calendar", "Open calendar", "/calendar"));
  }

  // De-duplicate by key defensively (shouldn't happen but cheap).
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.key)) return false;
    seen.add(link.key);
    return true;
  });
}
