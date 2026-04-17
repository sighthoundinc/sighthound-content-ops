/**
 * Preflight helper contract tests.
 *
 * Locks the required-field set for common forward transitions so list
 * progress rings and detail pills render the same count everywhere.
 */

import {
  computeBlogPreflight,
  computeSocialPostPreflight,
} from "@/lib/preflight";

describe("computeSocialPostPreflight", () => {
  it("reports product/type/canva missing when draft has no fields", () => {
    const report = computeSocialPostPreflight({
      status: "draft",
      fields: {},
      liveLinkCount: 0,
    });
    expect(report.ready).toBe(false);
    expect(report.missing.map((field) => field.key)).toEqual(
      expect.arrayContaining(["product", "type", "canva_url"])
    );
  });

  it("clears when creative_approved requirements are met from in_review", () => {
    const report = computeSocialPostPreflight({
      status: "in_review",
      fields: {
        product: "alpr_plus",
        type: "image",
        canva_url: "https://canva.com/x",
        platforms: ["linkedin"],
        caption: "Ready",
        scheduled_date: "2026-04-20",
      },
      liveLinkCount: 0,
    });
    expect(report.ready).toBe(true);
    expect(report.missing).toEqual([]);
  });

  it("reports only in_review requirements (product/type/canva) when status is draft", () => {
    const report = computeSocialPostPreflight({
      status: "draft",
      fields: {
        product: "alpr_plus",
        type: "image",
        canva_url: "https://canva.com/x",
      },
      liveLinkCount: 0,
    });
    expect(report.ready).toBe(true);
    expect(report.missing).toEqual([]);
  });

  it("requires at least one live link for published", () => {
    const report = computeSocialPostPreflight({
      status: "awaiting_live_link",
      fields: {
        product: "alpr_plus",
        type: "image",
        canva_url: "https://canva.com/x",
        platforms: ["linkedin"],
        caption: "Launch",
        scheduled_date: "2026-04-20",
      },
      liveLinkCount: 0,
    });
    expect(report.ready).toBe(false);
    expect(
      report.missing.some((field) => field.key === "live_links")
    ).toBe(true);
  });

  it("reports ready for published when a live link is present", () => {
    const report = computeSocialPostPreflight({
      status: "awaiting_live_link",
      fields: {
        product: "alpr_plus",
        type: "image",
        canva_url: "https://canva.com/x",
        platforms: ["linkedin"],
        caption: "Launch",
        scheduled_date: "2026-04-20",
      },
      liveLinkCount: 1,
    });
    expect(report.ready).toBe(true);
  });
});

describe("computeBlogPreflight", () => {
  it("requires Google Doc link during writer stage", () => {
    const report = computeBlogPreflight({
      writer_status: "in_progress",
      publisher_status: "not_started",
      google_doc_url: null,
      live_url: null,
      scheduled_publish_date: null,
    });
    expect(report.ready).toBe(false);
    expect(report.missing.map((field) => field.key)).toContain(
      "google_doc_url"
    );
  });

  it("requires live URL and scheduled date during publisher stage", () => {
    const report = computeBlogPreflight({
      writer_status: "completed",
      publisher_status: "in_progress",
      google_doc_url: "https://docs.google.com/d/abc",
      live_url: null,
      scheduled_publish_date: null,
    });
    expect(report.ready).toBe(false);
    expect(report.missing.map((field) => field.key)).toEqual(
      expect.arrayContaining(["live_url", "scheduled_publish_date"])
    );
  });

  it("reports ready when publisher has completed", () => {
    const report = computeBlogPreflight({
      writer_status: "completed",
      publisher_status: "completed",
      google_doc_url: "https://docs.google.com/d/abc",
      live_url: "https://www.sighthound.com/blog/x",
      scheduled_publish_date: "2026-04-20",
    });
    expect(report.ready).toBe(true);
    expect(report.missing).toEqual([]);
  });
});
