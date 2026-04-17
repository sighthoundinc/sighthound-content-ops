/**
 * Next-action helper contract tests.
 *
 * Locks the canonical verb labels emitted by `socialNextAction()` and
 * `blogNextAction()` so every consumer (list rows, detail pills, bell)
 * renders the same text for identical state.
 */

import {
  BLOG_NEXT_ACTION_LABELS,
  BLOG_WAITING_LABELS,
  blogNextAction,
  socialNextAction,
} from "@/lib/next-action";
import { NEXT_ACTION_LABELS } from "@/lib/social-post-workflow";

describe("socialNextAction", () => {
  it("returns the canonical verb when the current user owns the step", () => {
    const descriptor = socialNextAction({
      status: "creative_approved",
      ownerId: "user-1",
      ownerName: "Ali",
      userId: "user-1",
    });
    expect(descriptor.label).toBe(NEXT_ACTION_LABELS.creative_approved);
    expect(descriptor.isMine).toBe(true);
    expect(descriptor.owner).toBe("Ali");
  });

  it("reports waiting context when another user owns the step", () => {
    const descriptor = socialNextAction({
      status: "in_review",
      ownerId: "admin-1",
      ownerName: "Alex",
      userId: "writer-1",
    });
    expect(descriptor.isMine).toBe(false);
    expect(descriptor.waitingFor).toBe("Waiting on Alex");
  });

  it("reports Done on terminal published state", () => {
    const descriptor = socialNextAction({
      status: "published",
      ownerId: null,
      ownerName: null,
      userId: "any",
    });
    expect(descriptor.waitingFor).toBe("Done");
  });

  it("treats admins as actionable", () => {
    const descriptor = socialNextAction({
      status: "in_review",
      ownerId: null,
      ownerName: null,
      userId: "admin",
      isAdmin: true,
    });
    expect(descriptor.isMine).toBe(true);
    expect(descriptor.label).toBe(NEXT_ACTION_LABELS.in_review);
  });
});

describe("blogNextAction", () => {
  it("routes through writer labels when writer stage is incomplete", () => {
    const descriptor = blogNextAction({
      writerStatus: "in_progress",
      publisherStatus: "not_started",
      writerId: "writer-1",
      publisherId: null,
      writerName: "Jane",
      publisherName: null,
      userId: "writer-1",
    });
    expect(descriptor.label).toBe(BLOG_NEXT_ACTION_LABELS.writer.in_progress);
    expect(descriptor.isMine).toBe(true);
  });

  it("routes through publisher labels once writing is approved", () => {
    const descriptor = blogNextAction({
      writerStatus: "completed",
      publisherStatus: "publisher_approved",
      writerId: "writer-1",
      publisherId: "publisher-1",
      writerName: "Jane",
      publisherName: "Pat",
      userId: "publisher-1",
    });
    expect(descriptor.label).toBe(
      BLOG_NEXT_ACTION_LABELS.publisher.publisher_approved
    );
    expect(descriptor.isMine).toBe(true);
  });

  it("reports waiting context when someone else is acting", () => {
    const descriptor = blogNextAction({
      writerStatus: "pending_review",
      publisherStatus: "not_started",
      writerId: "writer-1",
      publisherId: null,
      writerName: "Jane",
      publisherName: null,
      userId: "other-user",
    });
    expect(descriptor.isMine).toBe(false);
    expect(descriptor.waitingFor).toBe("Waiting on Jane");
  });

  it("terminal publisher stage resolves to Done waiting label", () => {
    expect(BLOG_WAITING_LABELS.publisher.completed).toBe("Done");
  });
});
