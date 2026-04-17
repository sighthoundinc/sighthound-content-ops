/**
 * Record deep-link helpers.
 *
 * List pages use `?record=<type>:<id>` to share a drawer-focused URL.
 * This module centralizes parsing/encoding so all pages agree on the
 * format (dashboard, tasks, blogs, social-posts).
 */

export type RecordType = "blog" | "social";

export type RecordDeepLink = {
  type: RecordType;
  id: string;
};

const PARAM_NAME = "record";

export function parseRecordDeepLink(
  searchParams: URLSearchParams | null | undefined
): RecordDeepLink | null {
  if (!searchParams) {
    return null;
  }
  const raw = searchParams.get(PARAM_NAME);
  if (!raw) {
    return null;
  }
  const [type, id] = raw.split(":", 2);
  if (!type || !id) {
    return null;
  }
  if (type !== "blog" && type !== "social") {
    return null;
  }
  return { type, id };
}

export function buildRecordDeepLink(link: RecordDeepLink): string {
  return `${link.type}:${link.id}`;
}

export function withRecordDeepLink(
  basePath: string,
  link: RecordDeepLink | null,
  existingSearch?: string
): string {
  const params = new URLSearchParams(existingSearch ?? "");
  if (link) {
    params.set(PARAM_NAME, buildRecordDeepLink(link));
  } else {
    params.delete(PARAM_NAME);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export const RECORD_DEEP_LINK_PARAM = PARAM_NAME;
