import type { BlogSite } from "@/lib/types";

export const SITE_LABELS: Record<BlogSite, string> = {
  "sighthound.com": "Sighthound",
  "redactor.com": "Redactor",
};

export const SITE_SHORT_LABELS: Record<BlogSite, string> = {
  "sighthound.com": "SH",
  "redactor.com": "RED",
};

export const SITE_BADGE_CLASSES: Record<BlogSite, string> = {
  "sighthound.com": "border-[color:var(--sh-blurple-100)] bg-blurple-50 text-blurple-700",
  "redactor.com": "border-orange-200 bg-orange-50 text-orange-700",
};

export function getSiteLabel(site: BlogSite) {
  return SITE_LABELS[site];
}

export function getSiteShortLabel(site: BlogSite) {
  return SITE_SHORT_LABELS[site];
}

export function getSiteBadgeClasses(site: BlogSite) {
  return SITE_BADGE_CLASSES[site];
}
