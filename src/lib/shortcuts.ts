export const QUICK_CREATE_SHORTCUT_KEY = "Q" as const;
export const NEW_BLOG_SHORTCUT_KEY = "N" as const;

export const MAIN_CREATE_SHORTCUTS = {
  newIdea: QUICK_CREATE_SHORTCUT_KEY,
  newBlog: NEW_BLOG_SHORTCUT_KEY,
  newSocialPost: QUICK_CREATE_SHORTCUT_KEY,
} as const;
