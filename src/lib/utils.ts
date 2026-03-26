export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDateInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

export function formatDisplayDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const dateToken = value.slice(0, 10);
  const parsedDate = new Date(`${dateToken}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

export function isExternalHref(href: string) {
  const normalized = href.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (
    normalized.startsWith("/") ||
    normalized.startsWith("#") ||
    normalized.startsWith("?")
  ) {
    return false;
  }
  return (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("//")
  );
}
