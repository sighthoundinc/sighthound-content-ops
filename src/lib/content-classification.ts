import { SOCIAL_POST_TYPE_LABELS } from "@/lib/status";
import type { SocialPostType } from "@/lib/types";

export type MixedContentFilterValue =
  | "blog"
  | "social_post"
  | "social_image"
  | "social_carousel"
  | "social_video"
  | "social_link";

export const MIXED_CONTENT_FILTER_LABELS: Record<MixedContentFilterValue, string> = {
  blog: "Blog",
  social_post: "Social Post (All)",
  social_image: "Social: Image",
  social_carousel: "Social: Carousel",
  social_video: "Social: Video",
  social_link: "Social: Link",
};

export const MIXED_CONTENT_FILTER_OPTIONS: Array<{
  value: MixedContentFilterValue;
  label: string;
}> = [
  { value: "blog", label: MIXED_CONTENT_FILTER_LABELS.blog },
  { value: "social_post", label: MIXED_CONTENT_FILTER_LABELS.social_post },
  { value: "social_image", label: MIXED_CONTENT_FILTER_LABELS.social_image },
  { value: "social_carousel", label: MIXED_CONTENT_FILTER_LABELS.social_carousel },
  { value: "social_video", label: MIXED_CONTENT_FILTER_LABELS.social_video },
  { value: "social_link", label: MIXED_CONTENT_FILTER_LABELS.social_link },
];

const SOCIAL_TYPE_TO_FILTER: Record<SocialPostType, MixedContentFilterValue> = {
  image: "social_image",
  carousel: "social_carousel",
  video: "social_video",
  link: "social_link",
};

export function getSocialSubtypeFilterValue(
  socialType: SocialPostType | null | undefined
): MixedContentFilterValue | null {
  if (!socialType) {
    return null;
  }
  return SOCIAL_TYPE_TO_FILTER[socialType] ?? null;
}

export function getMixedContentLabel({
  contentType,
  socialType,
}: {
  contentType: "blog" | "social_post";
  socialType?: SocialPostType | null;
}) {
  if (contentType === "blog") {
    return "Blog";
  }
  if (socialType && socialType in SOCIAL_POST_TYPE_LABELS) {
    return `Social Post · ${SOCIAL_POST_TYPE_LABELS[socialType]}`;
  }
  return "Social Post";
}

export function matchesMixedContentFilters({
  selectedFilters,
  contentType,
  socialType,
}: {
  selectedFilters: MixedContentFilterValue[];
  contentType: "blog" | "social_post";
  socialType?: SocialPostType | null;
}) {
  if (selectedFilters.length === 0) {
    return true;
  }
  if (contentType === "blog") {
    return selectedFilters.includes("blog");
  }
  if (selectedFilters.includes("social_post")) {
    return true;
  }
  const subtypeFilterValue = getSocialSubtypeFilterValue(socialType);
  if (!subtypeFilterValue) {
    return false;
  }
  return selectedFilters.includes(subtypeFilterValue);
}
