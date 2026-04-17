/**
 * Clipboard helpers with semantic feedback.
 *
 * Wraps `navigator.clipboard.writeText` so every copy action in the app
 * reports *what* was copied ("Copied Google Doc URL") instead of a
 * generic "Copied!" toast.
 *
 * AGENTS.md alignment:
 * - Alerts are transient feedback (bottom-left toast).
 * - Every action must produce visible feedback.
 * - No raw errors shown to users — a SafeCopy failure surfaces a
 *   user-friendly retry message.
 */

export type CopySubject =
  | "Google Doc URL"
  | "Live URL"
  | "Canva link"
  | "Blog summary"
  | "Social post summary"
  | "Link"
  | "Text";

export type CopyOptions = {
  /** Semantic subject inserted into the toast (e.g. "Google Doc URL"). */
  subject?: CopySubject;
  /** Called with the rendered success toast text. */
  onSuccess?: (message: string) => void;
  /** Called with the rendered error toast text. */
  onError?: (message: string) => void;
};

export async function copyText(
  value: string,
  options?: CopyOptions
): Promise<boolean> {
  const subject = options?.subject ?? "Text";
  if (!value || typeof value !== "string") {
    const errorMessage = `Nothing to copy for ${subject}.`;
    options?.onError?.(errorMessage);
    return false;
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      writeUsingFallback(value);
    }
    options?.onSuccess?.(`Copied ${subject}`);
    return true;
  } catch (error) {
    console.error("clipboard copy failed", error);
    options?.onError?.(`Couldn't copy ${subject}. Please try again.`);
    return false;
  }
}

function writeUsingFallback(value: string) {
  if (typeof document === "undefined") {
    throw new Error("Clipboard API unavailable");
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Shape summary text for a content row so `⌘C` on a selected list row
 * yields scannable context rather than a single URL.
 */
export function formatRowSummary(input: {
  kind: "Blog" | "Social post";
  title: string;
  status?: string;
  owner?: string | null;
  link?: string | null;
}): string {
  const parts = [`${input.kind}: ${input.title}`];
  if (input.status) {
    parts.push(`Status: ${input.status}`);
  }
  if (input.owner) {
    parts.push(`Assigned to: ${input.owner}`);
  }
  if (input.link) {
    parts.push(input.link);
  }
  return parts.join("\n");
}
