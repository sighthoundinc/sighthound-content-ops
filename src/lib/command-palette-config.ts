export interface Command {
  id: string;
  label: string;
  description?: string;
  category: "navigation" | "create" | "actions";
  actionType: "navigate" | "create" | "action";
  targetUrl?: string;
  actionId?: "import_blogs" | "export_current_view" | "clear_all_filters";
  icon?: string;
  keyboard?: string;
}

export const allCommands: Command[] = [
  // Navigation Commands
  {
    id: "nav-dashboard",
    label: "Dashboard",
    description: "Go to dashboard",
    category: "navigation",
    actionType: "navigate",
    targetUrl: "/dashboard",
    icon: "Home",
  },
  {
    id: "nav-calendar",
    label: "Calendar",
    description: "Go to calendar",
    category: "navigation",
    actionType: "navigate",
    targetUrl: "/calendar",
    icon: "Calendar",
  },
  {
    id: "nav-blogs",
    label: "Blogs",
    description: "Go to blogs",
    category: "navigation",
    actionType: "navigate",
    targetUrl: "/blogs",
    icon: "BookOpen",
  },
  {
    id: "nav-social-posts",
    label: "Social Posts",
    description: "Go to social posts",
    category: "navigation",
    actionType: "navigate",
    targetUrl: "/social-posts",
    icon: "Share2",
  },
  {
    id: "nav-tasks",
    label: "Tasks",
    description: "Go to tasks",
    category: "navigation",
    actionType: "navigate",
    targetUrl: "/tasks",
    icon: "CheckSquare",
  },
  {
    id: "nav-ideas",
    label: "Ideas",
    description: "Go to ideas",
    category: "navigation",
    actionType: "navigate",
    targetUrl: "/ideas",
    icon: "Lightbulb",
  },
  {
    id: "nav-settings",
    label: "Settings",
    description: "Go to settings",
    category: "navigation",
    actionType: "navigate",
    targetUrl: "/settings",
    icon: "Settings",
  },

  // Create Commands
  {
    id: "create-blog",
    label: "New Blog",
    description: "Create a new blog post",
    category: "create",
    actionType: "create",
    icon: "Plus",
  },
  {
    id: "create-social-post",
    label: "New Social Post",
    description: "Create a new social post",
    category: "create",
    actionType: "create",
    icon: "Plus",
  },
  {
    id: "create-idea",
    label: "New Idea",
    description: "Create a new idea",
    category: "create",
    actionType: "create",
    icon: "Plus",
  },
  // Global Action Commands
  {
    id: "action-import-blogs",
    label: "Import Blogs",
    description: "Open blog import",
    category: "actions",
    actionType: "action",
    actionId: "import_blogs",
    icon: "Upload",
  },
  {
    id: "action-export-current-view",
    label: "Export Current View",
    description: "Export rows from the current page view",
    category: "actions",
    actionType: "action",
    actionId: "export_current_view",
    icon: "Download",
  },
  {
    id: "action-clear-all-filters",
    label: "Clear All Filters",
    description: "Reset active page filters",
    category: "actions",
    actionType: "action",
    actionId: "clear_all_filters",
    icon: "FilterX",
  },
];
