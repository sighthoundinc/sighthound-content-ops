import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server-permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "manage_users");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { adminClient } = auth.context;

    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    const eventType = url.searchParams.get("event_type");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = adminClient
      .from("access_logs")
      .select(
        `
        id,
        user_id,
        event_type,
        created_at,
        auth_users:user_id(email)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (eventType && ["login", "dashboard_visit"].includes(eventType)) {
      query = query.eq("event_type", eventType);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching access logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch access logs" },
        { status: 500 }
      );
    }

    // Enrich with user profile data
    const logsWithProfiles = data
      ? await Promise.all(
          data.map(async (log: Record<string, unknown>) => {
            const authUser = Array.isArray(log.auth_users)
              ? log.auth_users[0]
              : log.auth_users;

            // Fetch profile to get full_name
            const { data: profile } = await adminClient
              .from("profiles")
              .select("full_name, email")
              .eq("id", log.user_id)
              .maybeSingle();

            return {
              id: log.id,
              user_id: log.user_id,
              event_type: log.event_type,
              created_at: log.created_at,
              email: (authUser as Record<string, unknown>)?.email || profile?.email || "",
              full_name: profile?.full_name || "",
            };
          })
        )
      : [];

    return NextResponse.json({
      logs: logsWithProfiles,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in access logs endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
