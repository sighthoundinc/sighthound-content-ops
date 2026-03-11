import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface NotifySlackInput {
  eventType:
    | "writer_assigned"
    | "writer_completed"
    | "ready_to_publish"
    | "published";
  blogId: string;
  title: string;
  site: string;
  actorName: string;
  targetEmail?: string | null;
}

export async function notifySlack(input: NotifySlackInput) {
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.functions.invoke("slack-notify", {
      body: {
        ...input,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
    });
  } catch (error) {
    console.error("Slack notification failed", error);
  }
}
