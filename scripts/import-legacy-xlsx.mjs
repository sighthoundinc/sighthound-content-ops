import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMPORT_CREATED_BY_USER_ID = process.env.IMPORT_CREATED_BY_USER_ID;
const USER_1_FALLBACK_ID = IMPORT_CREATED_BY_USER_ID;
const PRIMARY_CALENDAR_SHEET = process.env.LEGACY_CALENDAR_SHEET ?? "Calendar View";
const LEGACY_START_YEAR = Number.parseInt(process.env.LEGACY_START_YEAR ?? "2023", 10);
const XLSX_PATH =
  process.env.LEGACY_XLSX_PATH ??
  path.join(repoRoot, "critical-data", "Blog Content Tracking - Sighthound and Redactor (cleaned).xlsx");
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !IMPORT_CREATED_BY_USER_ID) {
  throw new Error(
    "Missing required env vars. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMPORT_CREATED_BY_USER_ID."
  );
}

if (!fs.existsSync(XLSX_PATH)) {
  throw new Error(`XLSX file not found at ${XLSX_PATH}`);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DAY_COLUMNS = [1, 2, 3, 4, 5, 6, 7];
const METADATA_COLUMNS = [8, 9, 10, 11, 12];
const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLookup(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeUrl(value) {
  const text = normalizeText(value);
  if (!text || !/^https?:\/\//i.test(text)) {
    return null;
  }
  return text.replace(/\/+$/, "");
}

function normalizeUrlKey(value) {
  const url = normalizeUrl(value);
  return url ? url.toLowerCase() : null;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return `${parsed.y.toString().padStart(4, "0")}-${parsed.m
        .toString()
        .padStart(2, "0")}-${parsed.d.toString().padStart(2, "0")}`;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }

  return null;
}

function isMissingBlogDateColumnsError(error) {
  if (!error) {
    return false;
  }
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    error.code === "42703" &&
    (
      text.includes("scheduled_publish_date") ||
      text.includes("display_published_date") ||
      text.includes("actual_published_at") ||
      text.includes("published_at")
    )
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractUrlFromText(value) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }
  const match = text.match(/https?:\/\/[^\s<>"')]+/i);
  return normalizeUrl(match?.[0] ?? "");
}

function parseMonthIndex(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return null;
  }
  for (const [token, monthIndex] of Object.entries(MONTHS)) {
    if (normalized === token || normalized.includes(token)) {
      return monthIndex;
    }
  }
  return null;
}

function parseDayNumber(value) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }
  const parsed = Number.parseInt(text, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 31) {
    return null;
  }
  return parsed;
}

function normalizeSite(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) {
    return null;
  }
  if (text === "sh" || text.includes("sighthound")) {
    return "sighthound.com";
  }
  if (text === "red" || text.includes("redactor")) {
    return "redactor.com";
  }
  return null;
}

function inferSiteFromUrl(value) {
  const url = normalizeUrl(value);
  if (!url) {
    return null;
  }
  if (url.includes("sighthound.com")) {
    return "sighthound.com";
  }
  if (url.includes("redactor.com")) {
    return "redactor.com";
  }
  return null;
}

function splitUrls(values) {
  let liveUrl = null;
  let googleDocUrl = null;
  for (const value of values) {
    const url = normalizeUrl(value);
    if (!url) {
      continue;
    }
    if (url.includes("docs.google.com")) {
      googleDocUrl = googleDocUrl ?? url;
      continue;
    }
    if (inferSiteFromUrl(url)) {
      liveUrl = liveUrl ?? url;
      continue;
    }
    googleDocUrl = googleDocUrl ?? url;
  }
  return { liveUrl, googleDocUrl };
}

function findValue(row, candidates) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const found = entries.find(([key]) =>
      key.toLowerCase().includes(candidate.toLowerCase())
    );
    if (found && normalizeText(found[1])) {
      return found[1];
    }
  }
  return null;
}

function getWorksheetCell(worksheet, rowIndex, colIndex) {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  const cell = worksheet[address];
  if (!cell) {
    return null;
  }

  const text = normalizeText(
    typeof cell.w === "string" ? cell.w : typeof cell.v === "string" ? cell.v : String(cell.v ?? "")
  );
  const linkedUrl = normalizeUrl(cell?.l?.Target ?? "");
  const extracted = extractUrlFromText(text);
  const url = linkedUrl ?? extracted;

  if (!text && !url) {
    return null;
  }

  return { text, url };
}

function cleanCalendarTitle(value) {
  const title = normalizeText(value)
    .replace(/^B[\s?:.\-]*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) {
    return "";
  }

  const lowered = title.toLowerCase();
  if (
    lowered === "sh" ||
    lowered === "red" ||
    lowered === "key" ||
    lowered === "-" ||
    lowered === "--" ||
    lowered === "-----" ||
    lowered.includes("this week")
  ) {
    return "";
  }
  return title;
}

function alignDateToDay(baseDate, targetDay, yearHint, leftMonthHint = null, rightMonthHint = null) {
  if (baseDate.getUTCDate() === targetDay) {
    return baseDate;
  }

  const monthHints = [leftMonthHint, rightMonthHint].filter((value) => value !== null);
  for (const monthIndex of monthHints) {
    const candidate = new Date(Date.UTC(yearHint, monthIndex, targetDay));
    if (Number.isNaN(candidate.getTime())) {
      continue;
    }
    const diffDays = Math.abs(candidate.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays <= 45) {
      return candidate;
    }
  }

  const forward = new Date(baseDate);
  for (let i = 0; i < 45; i += 1) {
    if (forward.getUTCDate() === targetDay) {
      return forward;
    }
    forward.setUTCDate(forward.getUTCDate() + 1);
  }

  return baseDate;
}

function parseStatusHints(values) {
  const joined = values
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let writerStatus = null;
  let publisherStatus = null;

  if (joined.includes("needs revision")) {
    writerStatus = "pending_review";
  }
  if (joined.includes("ready to publish")) {
    writerStatus = writerStatus ?? "completed";
    publisherStatus = publisherStatus ?? "not_started";
  }
  if (joined.includes("published")) {
    writerStatus = "completed";
    publisherStatus = "completed";
  }
  if (joined.includes("under review") || joined.includes("in progress") || joined.includes("draft")) {
    writerStatus = writerStatus ?? "writing";
  }
  if (joined.includes("planned") || joined.includes("backlog")) {
    writerStatus = writerStatus ?? "assigned";
    publisherStatus = publisherStatus ?? "not_started";
  }

  return {
    writerStatus,
    publisherStatus,
    hasExplicitStatus: writerStatus !== null || publisherStatus !== null,
  };
}

async function loadUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const byEmail = new Map();
  const byName = new Map();
  const byAlias = new Map();
  for (const user of data ?? []) {
    if (user.email) {
      byEmail.set(user.email.toLowerCase(), user.id);
      byAlias.set(normalizeLookup(user.email), user.id);
      const localPart = user.email.split("@")[0]?.toLowerCase();
      if (localPart) {
        byAlias.set(normalizeLookup(localPart), user.id);
      }
    }
    if (user.full_name) {
      byName.set(user.full_name.toLowerCase(), user.id);
      const tokens = user.full_name
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3);
      for (const token of tokens) {
        byAlias.set(normalizeLookup(token), user.id);
        if (token.length > 3) {
          byAlias.set(normalizeLookup(token.slice(0, 3)), user.id);
        }
      }
    }
  }
  return { byEmail, byName, byAlias };
}

function resolveUserId(rawValue, userIndex) {
  const text = normalizeText(rawValue).toLowerCase();
  if (!text) {
    return null;
  }
  if (userIndex.byEmail.has(text)) {
    return userIndex.byEmail.get(text);
  }
  if (userIndex.byName.has(text)) {
    return userIndex.byName.get(text);
  }
  const alias = normalizeLookup(text);
  if (alias && userIndex.byAlias.has(alias)) {
    return userIndex.byAlias.get(alias);
  }
  return null;
}

function extractAssigneeHints(cells, userIndex) {
  const metadata = METADATA_COLUMNS.map((col) => cells.get(col)?.text ?? "").filter(Boolean);
  if (metadata.length === 0) {
    return { writerRaw: null, publisherRaw: null };
  }

  const joined = metadata.join(" ");
  const writtenBy = joined.match(/written by[:\s]+([a-z0-9@._-]+)/i)?.[1] ?? null;
  const publishedBy = joined.match(/published by[:\s]+([a-z0-9@._-]+)/i)?.[1] ?? null;

  const stopWords = new Set([
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "published",
    "review",
    "approved",
    "article",
    "existing",
    "brief",
    "week",
    "promo",
    "written",
    "red",
    "sh",
  ]);

  const resolvedTokens = [];
  const tokens = joined
    .split(/[^a-zA-Z0-9@._-]+/)
    .map((token) => normalizeText(token))
    .filter((token) => token.length >= 3);
  for (const token of tokens) {
    if (stopWords.has(token.toLowerCase())) {
      continue;
    }
    if (!resolveUserId(token, userIndex)) {
      continue;
    }
    if (!resolvedTokens.includes(token)) {
      resolvedTokens.push(token);
    }
  }

  let writerRaw = writtenBy ?? resolvedTokens[0] ?? null;
  let publisherRaw = publishedBy ?? resolvedTokens[1] ?? null;
  if (writerRaw && publisherRaw && normalizeLookup(writerRaw) === normalizeLookup(publisherRaw)) {
    publisherRaw = null;
  }

  return { writerRaw, publisherRaw };
}

function getRecordKey(record) {
  return `${record.site}::${normalizeLookup(record.title)}`;
}

function mergeRecords(baseRecord, nextRecord) {
  return {
    title: baseRecord.title || nextRecord.title,
    site: baseRecord.site || nextRecord.site,
    scheduledPublishDate: baseRecord.scheduledPublishDate ?? nextRecord.scheduledPublishDate ?? null,
    displayPublishedDate: baseRecord.displayPublishedDate ?? nextRecord.displayPublishedDate ?? null,
    liveUrl: baseRecord.liveUrl ?? nextRecord.liveUrl ?? null,
    googleDocUrl: baseRecord.googleDocUrl ?? nextRecord.googleDocUrl ?? null,
    writerRaw: baseRecord.writerRaw ?? nextRecord.writerRaw ?? null,
    publisherRaw: baseRecord.publisherRaw ?? nextRecord.publisherRaw ?? null,
    writerStatus: baseRecord.writerStatus ?? nextRecord.writerStatus ?? null,
    publisherStatus: baseRecord.publisherStatus ?? nextRecord.publisherStatus ?? null,
    hasExplicitStatus: baseRecord.hasExplicitStatus || nextRecord.hasExplicitStatus,
  };
}

function extractCalendarRecords(workbook, userIndex) {
  const worksheet = workbook.Sheets[PRIMARY_CALENDAR_SHEET];
  if (!worksheet) {
    console.warn(`Primary calendar sheet not found: ${PRIMARY_CALENDAR_SHEET}`);
    return [];
  }

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const weekDateByColumn = new Map();
  const recordsByKey = new Map();
  let currentYear = LEGACY_START_YEAR;
  let lastDate = null;

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const cells = new Map();
    for (let col = 0; col <= 12; col += 1) {
      const cell = getWorksheetCell(worksheet, row, col);
      if (cell) {
        cells.set(col, cell);
      }
    }
    if (cells.size === 0) {
      continue;
    }

    const explicitYear = Number.parseInt(cells.get(0)?.text ?? "", 10);
    if (!Number.isNaN(explicitYear) && explicitYear >= 2000) {
      currentYear = explicitYear;
    }

    const dayEntries = [];
    for (const col of DAY_COLUMNS) {
      const dayValue = parseDayNumber(cells.get(col)?.text ?? "");
      if (dayValue !== null) {
        dayEntries.push({ col, day: dayValue });
      }
    }

    if (dayEntries.length >= 4) {
      const leftMonth = parseMonthIndex(cells.get(0)?.text ?? "");
      const rightMonth = parseMonthIndex(cells.get(8)?.text ?? "");
      let cursorDate;

      if (lastDate) {
        cursorDate = new Date(lastDate);
        cursorDate.setUTCDate(cursorDate.getUTCDate() + 1);
      } else {
        const seedMonth = leftMonth ?? rightMonth ?? 0;
        cursorDate = new Date(Date.UTC(currentYear, seedMonth, dayEntries[0].day));
      }

      cursorDate = alignDateToDay(cursorDate, dayEntries[0].day, currentYear, leftMonth, rightMonth);
      for (const entry of dayEntries) {
        cursorDate = alignDateToDay(cursorDate, entry.day, currentYear, leftMonth, rightMonth);
        weekDateByColumn.set(entry.col, cursorDate.toISOString().slice(0, 10));
        lastDate = new Date(cursorDate);
        cursorDate = new Date(cursorDate);
        cursorDate.setUTCDate(cursorDate.getUTCDate() + 1);
      }
      continue;
    }

    let site = normalizeSite(cells.get(1)?.text ?? "");
    let titleCell = null;
    for (const col of DAY_COLUMNS) {
      if (col === 1) {
        continue;
      }
      const candidate = cells.get(col);
      if (!candidate) {
        continue;
      }
      const cleaned = cleanCalendarTitle(candidate.text);
      if (!cleaned || /^\d+$/.test(cleaned)) {
        continue;
      }

      const score = cleaned.length + (candidate.url ? 40 : 0);
      if (!titleCell || score > titleCell.score) {
        titleCell = {
          col,
          text: cleaned,
          url: candidate.url,
          score,
        };
      }
    }

    if (!titleCell) {
      continue;
    }

    const title = cleanCalendarTitle(titleCell.text);
    if (!title) {
      continue;
    }

    const urls = [titleCell.url];
    for (const cell of cells.values()) {
      if (cell.url) {
        urls.push(cell.url);
      }
    }
    const { liveUrl, googleDocUrl } = splitUrls(urls);
    site = site ?? inferSiteFromUrl(liveUrl) ?? inferSiteFromUrl(googleDocUrl);
    if (!site) {
      continue;
    }

    const statusHints = parseStatusHints(Array.from(cells.values()).map((cell) => cell.text));
    const assigneeHints = extractAssigneeHints(cells, userIndex);

    const record = {
      title,
      site,
      scheduledPublishDate: weekDateByColumn.get(titleCell.col) ?? null,
      displayPublishedDate: weekDateByColumn.get(titleCell.col) ?? null,
      liveUrl,
      googleDocUrl,
      writerRaw: assigneeHints.writerRaw,
      publisherRaw: assigneeHints.publisherRaw,
      writerStatus: statusHints.writerStatus,
      publisherStatus: statusHints.publisherStatus,
      hasExplicitStatus: statusHints.hasExplicitStatus,
    };

    const key = getRecordKey(record);
    const existing = recordsByKey.get(key);
    recordsByKey.set(key, existing ? mergeRecords(existing, record) : record);
  }

  return Array.from(recordsByKey.values());
}

function isNoiseTitle(value) {
  const title = normalizeText(value).toLowerCase();
  if (!title) {
    return true;
  }
  return (
    title.includes("legend on colors") ||
    title.includes("briefs / articles") ||
    title === "links" ||
    title.includes("comments/next steps")
  );
}

function extractSupplementalRecords(workbook) {
  const sheetConfigs = [
    { name: "Redactor", site: "redactor.com" },
    { name: "Sighthound", site: "sighthound.com" },
    { name: "Blog Posts- Redactor", site: "redactor.com" },
    { name: "Blog Posts- Sighthound", site: "sighthound.com" },
  ];
  const recordsByKey = new Map();

  for (const sheetConfig of sheetConfigs) {
    const worksheet = workbook.Sheets[sheetConfig.name];
    if (!worksheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    });

    for (const row of rows) {
      const title = normalizeText(findValue(row, ["Title", "Blogs"]));
      if (!title || isNoiseTitle(title)) {
        continue;
      }

      const urls = [
        findValue(row, ["Article (Live link)", "Live link", "Live URL"]),
        findValue(row, ["Article (Drive Link)", "Drive Link"]),
        findValue(row, ["Link", "URL"]),
      ];
      const { liveUrl, googleDocUrl } = splitUrls(urls);

      const site =
        sheetConfig.site ??
        normalizeSite(findValue(row, ["Site", "Brand"])) ??
        inferSiteFromUrl(liveUrl) ??
        inferSiteFromUrl(googleDocUrl);
      if (!site) {
        continue;
      }

      const statusHints = parseStatusHints([
        findValue(row, ["Status", "Overall Status"]),
        findValue(row, ["Writer Status"]),
        findValue(row, ["Publisher Status"]),
      ]);

      const record = {
        title,
        site,
        scheduledPublishDate: normalizeDate(
          findValue(row, ["Scheduled", "Target Date", "Planned Date", "Calendar Date", "Date"])
        ),
        displayPublishedDate: normalizeDate(
          findValue(row, ["CMS Date", "Display Date", "Public Date", "Published Date", "Publish Date"])
        ),
        liveUrl,
        googleDocUrl,
        writerRaw: findValue(row, ["Writer", "Author", "Assigned"]),
        publisherRaw: findValue(row, ["Publisher", "Publishing", "Editor"]),
        writerStatus: statusHints.writerStatus,
        publisherStatus: statusHints.publisherStatus,
        hasExplicitStatus: statusHints.hasExplicitStatus,
      };

      const key = getRecordKey(record);
      const existing = recordsByKey.get(key);
      recordsByKey.set(key, existing ? mergeRecords(existing, record) : record);
    }
  }

  return Array.from(recordsByKey.values());
}

function buildImportRecords(workbook, userIndex) {
  const primaryRecords = extractCalendarRecords(workbook, userIndex);
  const supplementalRecords = extractSupplementalRecords(workbook);
  const merged = new Map(primaryRecords.map((record) => [getRecordKey(record), record]));

  for (const supplementalRecord of supplementalRecords) {
    const key = getRecordKey(supplementalRecord);
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, mergeRecords(existing, supplementalRecord));
    } else {
      merged.set(key, supplementalRecord);
    }
  }

  return Array.from(merged.values());
}

function inferStatuses(record) {
  let writerStatus = record.writerStatus;
  let publisherStatus = record.publisherStatus;

  if (writerStatus === "not_started") {
    writerStatus = "assigned";
  } else if (writerStatus === "in_progress") {
    writerStatus = "writing";
  } else if (writerStatus === "needs_revision") {
    writerStatus = "pending_review";
  }

  if (publisherStatus === "in_progress") {
    publisherStatus = "publishing";
  }

  if (!writerStatus && !publisherStatus && record.liveUrl) {
    writerStatus = "completed";
    publisherStatus = "completed";
  }
  if (!writerStatus && !publisherStatus && record.scheduledPublishDate) {
    writerStatus = record.googleDocUrl || record.writerRaw ? "writing" : "assigned";
    publisherStatus = "not_started";
  }

  writerStatus = writerStatus ?? (record.googleDocUrl ? "writing" : "assigned");
  publisherStatus = publisherStatus ?? (record.liveUrl ? "completed" : "not_started");

  if (publisherStatus === "completed") {
    writerStatus = "completed";
  }

  return { writerStatus, publisherStatus };
}


function buildPayload(
  record,
  userIndex,
  existingRow = null,
  options = { includeAdvancedDateColumns: true, importTimestamp: new Date().toISOString() }
) {
  const statuses = inferStatuses(record);
  let writerId = resolveUserId(record.writerRaw, userIndex) ?? existingRow?.writer_id ?? null;
  let publisherId = resolveUserId(record.publisherRaw, userIndex) ?? existingRow?.publisher_id ?? null;

  if (statuses.writerStatus !== "assigned" && !writerId) {
    writerId = USER_1_FALLBACK_ID;
  }
  if (statuses.publisherStatus !== "not_started" && !publisherId) {
    publisherId = USER_1_FALLBACK_ID;
  }
  if (statuses.publisherStatus === "completed" && statuses.writerStatus !== "completed") {
    statuses.writerStatus = "completed";
  }

  const scheduledPublishDate =
    record.scheduledPublishDate ??
    existingRow?.scheduled_publish_date ??
    existingRow?.target_publish_date ??
    null;
  const displayPublishedDate =
    record.displayPublishedDate ??
    existingRow?.display_published_date ??
    scheduledPublishDate ??
    null;
  const liveUrl = record.liveUrl ?? existingRow?.live_url ?? null;
  const googleDocUrl = record.googleDocUrl ?? existingRow?.google_doc_url ?? null;
  const actualPublishedAt =
    existingRow?.actual_published_at ??
    existingRow?.published_at ??
    (liveUrl && statuses.publisherStatus === "completed"
      ? options.importTimestamp ?? new Date().toISOString()
      : null);
  const publishedAt = actualPublishedAt ?? null;
  const payload = {
    title: record.title,
    site: record.site,
    writer_id: writerId,
    publisher_id: publisherId,
    writer_status: statuses.writerStatus,
    publisher_status: statuses.publisherStatus,
    google_doc_url: googleDocUrl,
    live_url: liveUrl,
    target_publish_date: scheduledPublishDate,
  };

  if (options.includeAdvancedDateColumns) {
    payload.scheduled_publish_date = scheduledPublishDate;
    payload.display_published_date = displayPublishedDate;
    payload.actual_published_at = actualPublishedAt;
    payload.published_at = publishedAt;
  }

  return payload;
}

function diffPayload(existingRow, payload) {
  const changed = {};
  for (const [key, value] of Object.entries(payload)) {
    if ((existingRow[key] ?? null) !== (value ?? null)) {
      changed[key] = value;
    }
  }
  return changed;
}

async function main() {
  console.log(`Reading workbook: ${XLSX_PATH}`);
  const workbook = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const importTimestamp = new Date().toISOString();
  const userIndex = await loadUsers();
  const importRecords = buildImportRecords(workbook, userIndex);

  let includeAdvancedDateColumns = true;
  let { data: existingBlogs, error: existingError } = await supabase.from("blogs").select(
    "id,title,slug,site,writer_id,publisher_id,writer_status,publisher_status,google_doc_url,live_url,target_publish_date,scheduled_publish_date,display_published_date,actual_published_at,published_at,is_archived"
  );

  if (isMissingBlogDateColumnsError(existingError)) {
    includeAdvancedDateColumns = false;
    const fallback = await supabase.from("blogs").select(
      "id,title,slug,site,writer_id,publisher_id,writer_status,publisher_status,google_doc_url,live_url,target_publish_date,is_archived"
    );
    existingBlogs = fallback.data;
    existingError = fallback.error;
    console.warn(
      "Detected legacy blogs schema (missing scheduled/display/actual publish date columns). Import will use target_publish_date compatibility mode."
    );
  }
  if (existingError) {
    throw existingError;
  }

  const existingByKey = new Map();
  const existingByLiveUrl = new Map();
  const existingByGoogleDoc = new Map();
  const existingSlugs = new Set();
  for (const row of existingBlogs ?? []) {
    existingByKey.set(`${row.site}::${normalizeLookup(row.title)}`, row);
    const liveUrlKey = normalizeUrlKey(row.live_url);
    if (liveUrlKey) {
      existingByLiveUrl.set(liveUrlKey, row);
    }
    const docUrlKey = normalizeUrlKey(row.google_doc_url);
    if (docUrlKey) {
      existingByGoogleDoc.set(docUrlKey, row);
    }
    const slug = normalizeText(row.slug).toLowerCase();
    if (slug) {
      existingSlugs.add(slug);
    }
  }

  function makeUniqueSlug(title) {
    const base = slugify(title) || "legacy-blog";
    let candidate = base;
    let counter = 2;
    while (existingSlugs.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    existingSlugs.add(candidate);
    return candidate;
  }

  const rowsToInsert = [];
  const rowsToUpdate = [];

  for (const record of importRecords) {
    const key = getRecordKey(record);
    const liveKey = normalizeUrlKey(record.liveUrl);
    const docKey = normalizeUrlKey(record.googleDocUrl);
    const existingRow =
      (liveKey ? existingByLiveUrl.get(liveKey) : null) ??
      existingByKey.get(key) ??
      (docKey ? existingByGoogleDoc.get(docKey) : null) ??
      null;

    const payload = buildPayload(record, userIndex, existingRow, {
      includeAdvancedDateColumns,
      importTimestamp,
    });

    if (existingRow) {
      if (!existingRow.slug) {
        payload.slug = makeUniqueSlug(payload.title);
      }
      const updates = diffPayload(existingRow, payload);
      if (Object.keys(updates).length > 0) {
        rowsToUpdate.push({ id: existingRow.id, payload: updates });
      }
      continue;
    }

    rowsToInsert.push({
      ...payload,
      slug: makeUniqueSlug(payload.title),
      created_by: IMPORT_CREATED_BY_USER_ID,
    });
  }

  console.log(
    `Prepared ${rowsToInsert.length} insert(s) and ${rowsToUpdate.length} update(s) from ${importRecords.length} merged record(s).`
  );
  if (rowsToInsert.length === 0 && rowsToUpdate.length === 0) {
    return;
  }

  if (DRY_RUN) {
    console.log("Dry-run mode enabled. Sample rows:");
    console.log({
      inserts: rowsToInsert.slice(0, 5),
      updates: rowsToUpdate.slice(0, 5),
    });
    return;
  }

  for (const row of rowsToUpdate) {
    const { error } = await supabase.from("blogs").update(row.payload).eq("id", row.id);
    if (error) {
      throw error;
    }
  }

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from("blogs").insert(rowsToInsert);
    if (error) {
      throw error;
    }
  }

  console.log(
    `Import complete. Inserted ${rowsToInsert.length} row(s), updated ${rowsToUpdate.length} row(s).`
  );
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
