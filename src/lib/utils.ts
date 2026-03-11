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
