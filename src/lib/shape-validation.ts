/**
 * Shape validation helpers to prevent null-reference errors from unsafe casting.
 * All external data should be shape-validated before use.
 */
import type { BlogSite } from "./types";

export interface ValidAuthor {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Safely validate and extract an author object.
 * Handles both single objects and arrays (from PostgREST relation responses).
 */
export function validateAuthor(data: unknown): ValidAuthor | null {
  let author = data;

  // Handle PostgREST array response format for single relations
  if (Array.isArray(author)) {
    author = author[0] ?? null;
  }

  // Validate object shape
  if (
    author &&
    typeof author === "object" &&
    typeof (author as Record<string, unknown>).id === "string" &&
    typeof (author as Record<string, unknown>).full_name === "string" &&
    typeof (author as Record<string, unknown>).email === "string"
  ) {
    return author as ValidAuthor;
  }

  return null;
}

/**
 * Safely validate a blog lookup relation.
 * Matches BlogLookupResult type: {id, title, slug, site, live_url?}
 */
export interface ValidBlogRelation {
  id: string;
  title: string;
  slug: string | null;
  site: BlogSite;
  live_url?: string | null;
}

export function validateBlogRelation(data: unknown): ValidBlogRelation | null {
  let blog = data;

  // Handle PostgREST array response format
  if (Array.isArray(blog)) {
    blog = blog[0] ?? null;
  }

  // Validate object shape
  if (
    blog &&
    typeof blog === "object" &&
    typeof (blog as Record<string, unknown>).id === "string" &&
    typeof (blog as Record<string, unknown>).title === "string" &&
    typeof (blog as Record<string, unknown>).site === "string"
  ) {
    const slug = (blog as Record<string, unknown>).slug ?? null;
    return {
      ...(blog as Record<string, unknown>),
      slug,
    } as ValidBlogRelation;
  }

  return null;
}
