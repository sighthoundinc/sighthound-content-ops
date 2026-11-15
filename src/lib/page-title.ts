/**
 * Browser-tab title for a route: "<Page> · Content Relay".
 *
 * Used instead of Next's `title.template`, which stops applying below any
 * nested layout that sets its own title (e.g. /blogs → /blogs/new).
 */
export function pageTitle(name: string) {
  return `${name} · Content Relay`;
}
