import { buildWorkBuckets } from "@/app/home-work-buckets";

const summary = (overrides: Partial<Parameters<typeof buildWorkBuckets>[0]>) => ({
  writerCounts: {},
  publisherCounts: {},
  socialPostCounts: {},
  userRoles: ["writer"],
  ...overrides,
});

describe("home work buckets", () => {
  test("shows a tile only for counts above zero", () => {
    expect(buildWorkBuckets(summary({ writerCounts: { in_progress: 0, not_started: 0 } }))).toEqual([]);
  });

  test("ranks high priority first, then by count", () => {
    const buckets = buildWorkBuckets(
      summary({
        writerCounts: { in_progress: 5, needs_revision: 1, not_started: 2 },
        publisherCounts: { publisher_approved: 3 },
        socialPostCounts: { draft: 9, changes_requested: 2 },
      })
    );
    expect(buckets.map((bucket) => `${bucket.id}:${bucket.count}`)).toEqual([
      "publisher-approved:3",
      "social-changes-requested:2",
      "writer-needs-revision:1",
      "social-draft:9",
      "writer-in-progress:5",
      "writer-not-started:2",
    ]);
  });

  test("every tile carries the filter My Tasks should apply", () => {
    const buckets = buildWorkBuckets(
      summary({
        writerCounts: { pending_review: 1 },
        publisherCounts: { not_started: 1 },
        socialPostCounts: { awaiting_live_link: 1 },
      })
    );
    expect(Object.fromEntries(buckets.map((bucket) => [bucket.id, bucket.intent]))).toEqual({
      "writer-pending-review": { type: "writer_status", value: "pending_review" },
      "publisher-not-started": { type: "publisher_status", value: "not_started" },
      "social-awaiting-live-link": { type: "social_status", value: "awaiting_live_link" },
    });
  });

  test("tile titles are unique", () => {
    const all = { not_started: 1, in_progress: 1, pending_review: 1, needs_revision: 1, publisher_approved: 1 };
    const social = { draft: 1, changes_requested: 1, in_review: 1, creative_approved: 1, ready_to_publish: 1, awaiting_live_link: 1 };
    const titles = buildWorkBuckets(
      summary({ writerCounts: all, publisherCounts: all, socialPostCounts: social })
    ).map((bucket) => bucket.title);
    expect(titles).toHaveLength(14);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test("finished stages never produce a tile", () => {
    expect(
      buildWorkBuckets(summary({ writerCounts: { completed: 4 }, publisherCounts: { completed: 4 } }))
    ).toEqual([]);
  });
});
