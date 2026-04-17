/**
 * Notification grouping helper.
 *
 * Collapses 3+ consecutive same-type notifications into one summary
 * entry so the bell popover stays useful when a single event burst
 * would otherwise drown the queue.
 *
 * Consumers pass raw notifications (newest-first); the helper returns
 * a mix of single notifications and grouped summaries, preserving
 * original ordering. Grouping is advisory only \u2014 the underlying
 * per-item read state is unchanged.
 */

export type NotificationLike = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: number;
  href?: string | null;
  read?: boolean;
};

export type GroupedNotification =
  | ({ kind: "single" } & NotificationLike)
  | {
      kind: "group";
      id: string;
      type: string;
      count: number;
      title: string;
      message: string;
      createdAt: number;
      items: NotificationLike[];
    };

const GROUP_THRESHOLD = 3;

const TYPE_SUMMARY_VERB: Record<string, string> = {
  task_assigned: "new assignments",
  stage_changed: "status updates",
  awaiting_action: "items awaiting action",
  mention: "mentions",
  submitted_for_review: "items submitted for review",
  published: "items published",
  assignment_changed: "assignment changes",
};

function summariseForType(type: string, count: number): {
  title: string;
  message: string;
} {
  const phrase = TYPE_SUMMARY_VERB[type] ?? `notifications of type ${type}`;
  return {
    title: `${count} ${phrase}`,
    message: "Open to see each item",
  };
}

/**
 * Walk the list and collapse any consecutive run of notifications
 * sharing the same `type` when that run is GROUP_THRESHOLD+ long.
 * Runs shorter than the threshold are emitted as individual entries.
 */
export function groupNotifications(
  notifications: NotificationLike[]
): GroupedNotification[] {
  if (notifications.length === 0) {
    return [];
  }
  const out: GroupedNotification[] = [];
  let bufferType: string | null = null;
  let buffer: NotificationLike[] = [];

  const flush = () => {
    if (buffer.length === 0) {
      return;
    }
    if (buffer.length >= GROUP_THRESHOLD) {
      const summary = summariseForType(bufferType!, buffer.length);
      out.push({
        kind: "group",
        id: `group-${bufferType}-${buffer[0]!.id}`,
        type: bufferType!,
        count: buffer.length,
        title: summary.title,
        message: summary.message,
        createdAt: buffer[0]!.createdAt,
        items: [...buffer],
      });
    } else {
      for (const entry of buffer) {
        out.push({ kind: "single", ...entry });
      }
    }
    buffer = [];
    bufferType = null;
  };

  for (const notification of notifications) {
    if (bufferType === notification.type) {
      buffer.push(notification);
      continue;
    }
    flush();
    bufferType = notification.type;
    buffer = [notification];
  }
  flush();

  return out;
}
