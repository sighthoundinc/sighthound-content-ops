// Tree-shakable per-icon exports for the icons used by the Sighthound app.
//
// For eager import paths: prefer the per-icon component (e.g. `CheckIcon`,
// `HomeIcon`) so webpack includes ONLY the icons a given route actually
// renders. Each export is a thin wrapper that references exactly one
// lucide-react icon, so unused icons tree-shake.
//
// For back-compat: `AppIcon` and `AppIconName` are pure re-exported from
// `./icon-app`. Modules that still call `<AppIcon name="check" />` keep
// working unchanged. Once every eager call site has migrated to the
// per-icon form, `icon-app.tsx` (and its 41-icon barrel) drops out of any
// route that does not need it.

import type { LucideIcon, LucideProps } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Chrome,
  CircleAlert,
  CircleCheckBig,
  Copy,
  Download,
  Eye,
  EyeOff,
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
  Sparkle,
  Upload,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  boxClassName?: string;
  size?: number;
  strokeWidth?: number;
} & Omit<LucideProps, "size" | "strokeWidth">;

function renderIcon(Icon: LucideIcon, {
  className,
  boxClassName,
  size = 16,
  strokeWidth = 1.75,
  ...props
}: IconProps) {
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

// Per-icon exports (alphabetized). Each function references exactly one
// lucide icon so webpack can tree-shake the rest when a module only uses
// a subset.
export function AlertTriangleIcon(props: IconProps) { return renderIcon(AlertTriangle, props); }
export function ArrowRightIcon(props: IconProps) { return renderIcon(ArrowRight, props); }
export function ArrowUpIcon(props: IconProps) { return renderIcon(ArrowUp, props); }
export function BellIcon(props: IconProps) { return renderIcon(Bell, props); }
export function BookOpenIcon(props: IconProps) { return renderIcon(BookOpen, props); }
export function CalendarDaysIcon(props: IconProps) { return renderIcon(CalendarDays, props); }
export function CheckIcon(props: IconProps) { return renderIcon(Check, props); }
export function CheckSquareIcon(props: IconProps) { return renderIcon(CheckSquare, props); }
export function ChevronDownIcon(props: IconProps) { return renderIcon(ChevronDown, props); }
export function ChevronLeftIcon(props: IconProps) { return renderIcon(ChevronLeft, props); }
export function ChevronRightIcon(props: IconProps) { return renderIcon(ChevronRight, props); }
export function ChevronUpIcon(props: IconProps) { return renderIcon(ChevronUp, props); }
export function ChevronsUpDownIcon(props: IconProps) { return renderIcon(ChevronsUpDown, props); }
export function ChromeIcon(props: IconProps) { return renderIcon(Chrome, props); }
export function CircleAlertIcon(props: IconProps) { return renderIcon(CircleAlert, props); }
export function CircleCheckBigIcon(props: IconProps) { return renderIcon(CircleCheckBig, props); }
export function CopyIcon(props: IconProps) { return renderIcon(Copy, props); }
export function DownloadIcon(props: IconProps) { return renderIcon(Download, props); }
export function EyeIcon(props: IconProps) { return renderIcon(Eye, props); }
export function EyeOffIcon(props: IconProps) { return renderIcon(EyeOff, props); }
export function ExternalLinkIcon(props: IconProps) { return renderIcon(ExternalLink, props); }
export function FileTextIcon(props: IconProps) { return renderIcon(FileText, props); }
export function FilterXIcon(props: IconProps) { return renderIcon(FilterX, props); }
export function HouseIcon(props: IconProps) { return renderIcon(House, props); }
export function InfoIcon(props: IconProps) { return renderIcon(Info, props); }
export function KanbanIcon(props: IconProps) { return renderIcon(Kanban, props); }
export function LightbulbIcon(props: IconProps) { return renderIcon(Lightbulb, props); }
export function Link2Icon(props: IconProps) { return renderIcon(Link2, props); }
export function LoaderCircleIcon(props: IconProps) { return renderIcon(LoaderCircle, props); }
export function LockIcon(props: IconProps) { return renderIcon(Lock, props); }
export function MegaphoneIcon(props: IconProps) { return renderIcon(Megaphone, props); }
export function MoreHorizontalIcon(props: IconProps) { return renderIcon(MoreHorizontal, props); }
export function NotebookPenIcon(props: IconProps) { return renderIcon(NotebookPen, props); }
export function PenSquareIcon(props: IconProps) { return renderIcon(PenSquare, props); }
export function PlusIcon(props: IconProps) { return renderIcon(Plus, props); }
export function SearchIcon(props: IconProps) { return renderIcon(Search, props); }
export function SettingsIcon(props: IconProps) { return renderIcon(Settings, props); }
export function Share2Icon(props: IconProps) { return renderIcon(Share2, props); }
export function SlackIcon(props: IconProps) { return renderIcon(Slack, props); }
export function SparkleIcon(props: IconProps) { return renderIcon(Sparkle, props); }
export function UploadIcon(props: IconProps) { return renderIcon(Upload, props); }
export function XIcon(props: IconProps) { return renderIcon(X, props); }

// Convenience aliases matching the old `AppIconName` keys, so mechanical
// migration of `<AppIcon name="google" />` → `<GoogleIcon />` stays readable.
export { ChromeIcon as GoogleIcon };
export { BookOpenIcon as BlogIcon };
export { CalendarDaysIcon as CalendarIcon };
export { CheckSquareIcon as TaskIcon };
export { HouseIcon as HomeIcon };
export { Share2Icon as SocialIcon };
export { LightbulbIcon as IdeaIcon };
export { FilterXIcon as FilterXIconAlias };
export { NotebookPenIcon as WritingIcon };
export { AlertTriangleIcon as WarningIcon };
export { CircleCheckBigIcon as SuccessIcon };
export { CircleAlertIcon as ErrorIcon };
export { XIcon as CloseIcon };
export { FileTextIcon as FileIcon };
export { Link2Icon as LinkIcon };
export { MoreHorizontalIcon as MoreIcon };
export { PenSquareIcon as EditIcon };
export { LoaderCircleIcon as LoadingIcon };

// Pure re-exports. Modules that don't reference `AppIcon` or `AppIconName`
// will not pull `icon-app.tsx` (and its 41-icon barrel) via ESM tree-shaking.
export { AppIcon, type AppIconName } from "./icon-app";
