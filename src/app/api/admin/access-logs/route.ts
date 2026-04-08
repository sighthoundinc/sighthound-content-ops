import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";
type AccessLogRow = {
  id: string;
  user_id: string;
  event_type: string;
  created_at: string;
};

type AccessLogProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export const GET = withApiContract(async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { adminClient, userId: currentUserId, profile } = auth.context;
    const isAdmin = profile.role === "admin";

    const url = new URL(request.url);
    let userId: string | null = url.searchParams.get("user_id");
    let eventType: string | null = url.searchParams.get("event_type");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Non-admins can only see their own logs
    if (!isAdmin) {
      userId = currentUserId;
      // Non-admins cannot see login history, only dashboard visits
      eventType = "dashboard_visit";
    }

    let query = adminClient
      .from("access_logs")
      .select(
        `
        id,
        user_id,
        event_type,
        created_at
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

    const logs = (data ?? []) as AccessLogRow[];
    const userIds = Array.from(
      new Set(
        logs
          .map((log) => log.user_id)
          .filter((userId): userId is string => typeof userId === "string" && userId.length > 0)
      )
    );

    let profileByUserId = new Map<string, AccessLogProfile>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await adminClient
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (profilesError) {
        console.warn("Failed to batch load profiles for access logs:", profilesError);
      } else {
        profileByUserId = new Map(
          ((profiles ?? []) as AccessLogProfile[]).map((profile) => [profile.id, profile])
        );
      }
    }

    const logsWithProfiles = logs.map((log) => {
      const profile = profileByUserId.get(log.user_id);
      return {
        id: log.id,
        user_id: log.user_id,
        event_type: log.event_type,
        created_at: log.created_at,
        email: profile?.email || "",
        full_name: profile?.full_name || "",
      };
    });

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
});
