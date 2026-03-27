import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requirePermission } from "@/lib/server-permissions";
import { createAdminClient } from "@/lib/supabase/server";
import type { AppRole, BlogSite } from "@/lib/types";
import { withApiContract } from "@/lib/api-contract";
import { findMatches } from "@/lib/user-matching";

const importRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  site: z.string(),
  title: z.string(),
  liveUrl: z.string(),
  writer: z.string(),
  publisher: z.string(),
  draftDocLink: z.string(),
  displayPublishDate: z.string(),
  actualPublishDate: z.string(),
});

const importRequestSchema = z.object({
  fileName: z.string().optional(),
  rows: z.array(importRowSchema).min(1),
  selectedColumns: z.array(z.string()).optional(),
  nameResolutions: z.record(
    z.string(),
    z.object({
      action: z.enum(["use_existing", "create_new"]),
      userId: z.string().optional(),
      selectedUserId: z.string().optional(),
    })
  ).optional(),
});

type ImportFailure = {
  rowNumber: number;
  message: string;
};

type FailedImportRow = z.infer<typeof importRowSchema> & {
  error: string;
};

type ValidatedImportRow = {
  rowNumber: number;
  site: BlogSite;
  title: string;
  liveUrl: string;
  writer: string;
  publisher: string;
  draftDocLink: string | null;
  displayPublishDate: string;
  actualPublishDate: string | null;
};

type ProfileCache = {
  byNormalizedName: Map<string, string>;
  profiles: Array<{
    id: string;
    full_name: string;
    display_name: string | null;
    username: string | null;
    email: string;
    role: string;
    first_name: string | null;
    last_name: string | null;
  }>;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeSite(value: string): BlogSite | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "sh" || normalized === "sighthound" || normalized === "sighthound.com") {
    return "sighthound.com";
  }
  if (normalized === "red" || normalized === "redactor" || normalized === "redactor.com") {
    return "redactor.com";
  }
  return null;
}

function canonicalizeLiveUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    parsed.protocol = "https:";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    parsed.pathname = parsed.pathname.toLowerCase().replace(/\/+$/, "");
    parsed.search = parsed.search.toLowerCase();
    parsed.hash = "";
    return parsed.toString().toLowerCase().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map((token) => Number.parseInt(token, 10));
  if (!year || !month || !day) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateRow(row: z.infer<typeof importRowSchema>, selectedColumns?: Set<string>) {
  const failures: string[] = [];
  const site = normalizeSite(row.site);
  if (!site) {
    failures.push("Invalid site value");
  }

  const title = row.title.trim();
  if (!title) {
    failures.push("Missing Blog Title");
  }

  const normalizedLiveUrl = canonicalizeLiveUrl(row.liveUrl);
  if (!row.liveUrl.trim()) {
    failures.push("Missing Live URL");
  } else if (!normalizedLiveUrl || !isValidHttpUrl(normalizedLiveUrl)) {
    failures.push("Invalid URL format");
  }

  const writer = row.writer.trim();
  if (!writer) {
    failures.push("Missing Writer");
  }

  const publisher = row.publisher.trim();
  if (!publisher) {
    failures.push("Missing Publisher");
  }

  const displayPublishDate = row.displayPublishDate.trim();
  if (!displayPublishDate) {
    failures.push("Missing Display Publish Date");
  } else if (!isValidDate(displayPublishDate)) {
    failures.push("Invalid date format for Display Publish Date");
  }

  const actualPublishDate = row.actualPublishDate.trim();
  if (selectedColumns?.has("actualPublishDate")) {
    if (actualPublishDate && !isValidDate(actualPublishDate)) {
      failures.push("Invalid date format for Actual Publish Date");
    }
  }

  const draftDocLink = row.draftDocLink.trim();
  if (selectedColumns?.has("draftDocLink")) {
    if (draftDocLink && !isValidHttpUrl(draftDocLink)) {
      failures.push("Invalid URL format for Draft Doc Link");
    }
  }

  if (failures.length > 0 || !site || !normalizedLiveUrl) {
    return {
      valid: false as const,
      failures,
    };
  }

  return {
    valid: true as const,
    row: {
      rowNumber: row.rowNumber,
      site,
      title,
      liveUrl: normalizedLiveUrl,
      writer,
      publisher,
      draftDocLink: draftDocLink || null,
      displayPublishDate,
      actualPublishDate: actualPublishDate || null,
    } satisfies ValidatedImportRow,
  };
}


type NameResolutionInput = {
  action: "use_existing" | "create_new";
  userId?: string;
  selectedUserId?: string;
};
function buildImportEmail(name: string) {
  const local = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
  const safeLocal = local.length > 0 ? local : "import.user";
  return `${safeLocal}.${randomUUID().slice(0, 8)}@sighthound.com`;
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function getProfileFirstName(profile: {
  first_name: string | null;
  full_name: string;
  display_name: string | null;
  username: string | null;
  email: string;
}) {
  return normalizeName(
    profile.first_name ||
      getFirstName(profile.full_name) ||
      getFirstName(profile.display_name ?? "") ||
      profile.username ||
      profile.email.split("@")[0] ||
      ""
  );
}

function getProfileLastName(profile: {
  last_name: string | null;
  full_name: string;
  display_name: string | null;
}) {
  return normalizeName(
    profile.last_name ||
      getLastName(profile.full_name) ||
      getLastName(profile.display_name ?? "") ||
      ""
  );
}

async function loadProfileCache(adminClient: ReturnType<typeof createAdminClient>) {
  const { data, error } = await adminClient
    .from("profiles")
    .select("id,full_name,display_name,username,email,role,first_name,last_name")
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  const cache: ProfileCache = {
    byNormalizedName: new Map(),
    profiles: (data ?? []) as Array<{
      id: string;
      full_name: string;
      display_name: string | null;
      username: string | null;
      email: string;
      role: string;
      first_name: string | null;
      last_name: string | null;
    }>,
  };

  for (const profile of cache.profiles) {
    // Exact matches: full_name, display_name, username, email
    const fullName = normalizeName(profile.full_name);
    if (fullName) {
      cache.byNormalizedName.set(fullName, profile.id);
    }
    const displayName = normalizeName(profile.display_name ?? "");
    if (displayName) {
      cache.byNormalizedName.set(displayName, profile.id);
    }
    const username = normalizeName(profile.username ?? "");
    if (username) {
      cache.byNormalizedName.set(username, profile.id);
    }
    const email = normalizeName(profile.email ?? "");
    if (email) {
      cache.byNormalizedName.set(email, profile.id);
    }
    const emailLocal = normalizeName(profile.email.split("@")[0] ?? "");
    if (emailLocal) {
      cache.byNormalizedName.set(emailLocal, profile.id);
    }
    
    // First/last name matches
    const firstName = getProfileFirstName(profile);
    if (firstName) {
      // Store with a prefix to distinguish from full matches
      cache.byNormalizedName.set(`_first:${firstName}`, profile.id);
    }
    const lastName = getProfileLastName(profile);
    if (lastName) {
      cache.byNormalizedName.set(`_last:${lastName}`, profile.id);
    }
  }

  return cache;
}

async function resolveOrCreateProfileId(
  adminClient: ReturnType<typeof createAdminClient>,
  cache: ProfileCache,
  name: string,
  defaultRole: AppRole,
  nameResolutions?: Record<string, NameResolutionInput>
) {
  // Check if user provided explicit resolution for this name
  if (nameResolutions) {
    const resolution = nameResolutions[name];
    if (resolution) {
      const resolvedUserId = resolution.userId ?? resolution.selectedUserId;
      if (resolution.action === "use_existing" && resolvedUserId) {
        return resolvedUserId;
      }
      // If action is 'create_new', fall through to creation logic
    }
  }

  const normalized = normalizeName(name);
  if (!normalized) {
    return null;
  }
  
  // Try exact match first
  const existing = cache.byNormalizedName.get(normalized);
  if (existing) {
    return existing;
  }
  
  const scoredResolution = findMatches(name, cache.profiles);
  if (scoredResolution.bestMatch) {
    return scoredResolution.bestMatch.id;
  }

  // No match found, create new user
  const email = buildImportEmail(name);
  const password = `${randomUUID()}Aa1!`;
  const { data: created, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      role: defaultRole,
      user_roles: [defaultRole],
    },
  });
  if (createUserError || !created.user) {
    throw new Error(createUserError?.message ?? `Could not create profile for ${name}`);
  }

  const { error: upsertError } = await adminClient.from("profiles").upsert(
    {
      id: created.user.id,
      email,
      full_name: name,
      display_name: name,
      role: defaultRole,
      user_roles: [defaultRole],
      is_active: true,
    },
    { onConflict: "id" }
  );
  if (upsertError) {
    throw new Error(upsertError.message);
  }

  cache.byNormalizedName.set(normalized, created.user.id);
  return created.user.id;
}

export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "run_data_import");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = importRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const failures: ImportFailure[] = [];
    const failedRows: FailedImportRow[] = [];
    const validRows: ValidatedImportRow[] = [];
    const rawRowsByNumber = new Map<number, z.infer<typeof importRowSchema>>();

    const selectedColumnsSet = parsed.data.selectedColumns
      ? new Set(parsed.data.selectedColumns)
      : undefined;

    for (const row of parsed.data.rows) {
      rawRowsByNumber.set(row.rowNumber, row);
      // Convert empty strings to empty strings for validation (will be converted to null later)
      const normalizedRow = {
        ...row,
        actualPublishDate: row.actualPublishDate?.trim() || "",
        draftDocLink: row.draftDocLink?.trim() || "",
      };
      const validation = validateRow(normalizedRow, selectedColumnsSet);
      if (!validation.valid) {
        validation.failures.forEach((message) => {
          failures.push({ rowNumber: row.rowNumber, message });
          failedRows.push({
            ...row,
            error: message,
          });
        });
        continue;
      }
      validRows.push(validation.row);
    }

    if (validRows.length === 0) {
      return NextResponse.json({
        created: 0,
        updated: 0,
        failed: failures.length,
        failures,
        failedRows,
      });
    }

    const adminClient = auth.context.adminClient;
    const profileCache = await loadProfileCache(adminClient);
    const { data: existingBlogs, error: existingBlogsError } = await adminClient
      .from("blogs")
      .select("id,live_url")
      .not("live_url", "is", null);
    if (existingBlogsError) {
      console.error("Failed to load existing blogs for import:", existingBlogsError);
      return NextResponse.json({ error: "Failed to load existing blogs. Please try again." }, { status: 400 });
    }

    const existingByLiveUrl = new Map<string, { id: string }>();
    for (const row of existingBlogs ?? []) {
      if (!row.live_url) {
        continue;
      }
      const key = canonicalizeLiveUrl(row.live_url);
      if (!key) {
        continue;
      }
      existingByLiveUrl.set(key, { id: row.id });
    }

    let created = 0;
    let updated = 0;

    for (const row of validRows) {
      try {
        const writerId = await resolveOrCreateProfileId(
          adminClient,
          profileCache,
          row.writer,
          "writer",
          parsed.data.nameResolutions
        );
        const publisherId = await resolveOrCreateProfileId(
          adminClient,
          profileCache,
          row.publisher,
          "publisher",
          parsed.data.nameResolutions
        );
        const actualPublishedAt = row.actualPublishDate
          ? `${row.actualPublishDate}T00:00:00.000Z`
          : null;

        const existing = existingByLiveUrl.get(row.liveUrl);
        if (existing) {
          const updateData: Record<string, unknown> = {
            writer_id: writerId,
            publisher_id: publisherId,
            display_published_date: row.displayPublishDate,
          };
          if (row.draftDocLink) {
            updateData.google_doc_url = row.draftDocLink;
          }
          if (actualPublishedAt) {
            updateData.actual_published_at = actualPublishedAt;
            updateData.published_at = actualPublishedAt;
          }
          const { error: updateError } = await adminClient
            .from("blogs")
            .update(updateData)
            .eq("id", existing.id);
          if (updateError) {
            console.error(`Import row ${row.rowNumber} update failed:`, updateError);
            failures.push({ rowNumber: row.rowNumber, message: "Failed to update existing blog" });
            const raw = rawRowsByNumber.get(row.rowNumber);
            if (raw) {
              failedRows.push({ ...raw, error: "Failed to update existing blog" });
            }
            continue;
          }
          updated += 1;
          continue;
        }

        const insertData: Record<string, unknown> = {
          site: row.site,
          title: row.title,
          live_url: row.liveUrl,
          writer_id: writerId,
          publisher_id: publisherId,
          // Imported blogs with live_url are already published, so mark both as completed
          writer_status: "completed",
          publisher_status: "completed",
          target_publish_date: row.displayPublishDate,
          scheduled_publish_date: row.displayPublishDate,
          display_published_date: row.displayPublishDate,
          created_by: auth.context.userId,
        };
        if (row.draftDocLink) {
          insertData.google_doc_url = row.draftDocLink;
        }
        if (actualPublishedAt) {
          insertData.actual_published_at = actualPublishedAt;
          insertData.published_at = actualPublishedAt;
        }
        const { data: inserted, error: insertError } = await adminClient
          .from("blogs")
          .insert(insertData)
          .select("id,live_url")
          .single();
        if (insertError || !inserted) {
          console.error(`Import row ${row.rowNumber} insert failed:`, insertError);
          const message = "Failed to insert blog";
          failures.push({ rowNumber: row.rowNumber, message });
          const raw = rawRowsByNumber.get(row.rowNumber);
          if (raw) {
            failedRows.push({ ...raw, error: message });
          }
          continue;
        }
        existingByLiveUrl.set(row.liveUrl, { id: inserted.id });
        created += 1;
      } catch (error) {
        console.error(`Import row ${row.rowNumber} unexpected error:`, error);
        const message = "Unexpected import error";
        failures.push({ rowNumber: row.rowNumber, message });
        const raw = rawRowsByNumber.get(row.rowNumber);
        if (raw) {
          failedRows.push({ ...raw, error: message });
        }
      }
    }

    await adminClient.from("blog_import_logs").insert({
      imported_by: auth.context.userId,
      imported_at: new Date().toISOString(),
      file_name: parsed.data.fileName ?? null,
      rows_created: created,
      rows_updated: updated,
      rows_failed: failures.length,
    });

    return NextResponse.json({
      created,
      updated,
      failed: failures.length,
      failures,
      failedRows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
});
