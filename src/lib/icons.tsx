import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Chrome,
  CircleAlert,
  CircleCheckBig,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FilterX,
  House,
  Info,
  Kanban,
  Lightbulb,
  Link2,
  LoaderCircle,
  Lock,
  Megaphone,
  MoreHorizontal,
  NotebookPen,
  PenSquare,
  Plus,
  Search,
  Settings,
  Share2,
  Slack,
  Upload,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const APP_ICON_MAP = {
  home: House,
  calendar: CalendarDays,
  blog: BookOpen,
  kanban: Kanban,
  social: Share2,
  google: Chrome,
  slack: Slack,
  task: CheckSquare,
  idea: Lightbulb,
  settings: Settings,
  plus: Plus,
  upload: Upload,
  download: Download,
  filterX: FilterX,
  search: Search,
  bell: Bell,
  writing: NotebookPen,
  megaphone: Megaphone,
  warning: AlertTriangle,
  success: CircleCheckBig,
  error: CircleAlert,
  info: Info,
  close: X,
  file: FileText,
  link: Link2,
  copy: Copy,
  externalLink: ExternalLink,
  more: MoreHorizontal,
  edit: PenSquare,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  check: Check,
  loading: LoaderCircle,
  lock: Lock,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof APP_ICON_MAP;

export function AppIcon({
  name,
  className,
  boxClassName,
  size = 16,
  strokeWidth = 1.75,
  ...props
}: {
  name: AppIconName;
  className?: string;
  boxClassName?: string;
  size?: number;
  strokeWidth?: number;
} & Omit<LucideProps, "size" | "strokeWidth">) {
  const Icon = APP_ICON_MAP[name];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md",
        boxClassName ?? "h-5 w-5"
      )}
    >
      <Icon
        aria-hidden="true"
        className={className}
        size={size}
        strokeWidth={strokeWidth}
        absoluteStrokeWidth
        {...props}
      />
    </span>
  );
}
