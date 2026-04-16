/**
 * UI vocabulary contract test.
 *
 * Locks the canonical strings exported by `UI_VOCAB` and the forbidden-substring
 * list. Any renaming that drifts from the contract must update AGENTS.md and
 * then this test together.
 */

import {
  UI_VOCAB,
  UI_VOCAB_ALLOWED_SUBSTRINGS,
  UI_VOCAB_FORBIDDEN_SUBSTRINGS,
} from "@/lib/ui-vocab";

describe("UI_VOCAB canonical values", () => {
  it("product name uses Sighthound Content Relay / Content Relay", () => {
    expect(UI_VOCAB.product.full).toBe("Sighthound Content Relay");
    expect(UI_VOCAB.product.short).toBe("Content Relay");
  });

  it("pipelines use the pipeline-noun form", () => {
    expect(UI_VOCAB.pipelines.writing).toBe("Writing");
    expect(UI_VOCAB.pipelines.publishing).toBe("Publishing");
  });

  it("roles use the role-noun form and Assigned to", () => {
    expect(UI_VOCAB.roles.writer).toBe("Writer");
    expect(UI_VOCAB.roles.publisher).toBe("Publisher");
    expect(UI_VOCAB.roles.reviewer).toBe("Reviewer");
    expect(UI_VOCAB.roles.assignedTo).toBe("Assigned to");
  });

  it("section labels are canonical and Assignment & Changes is the history heading", () => {
    expect(UI_VOCAB.sections.comments).toBe("Comments");
    expect(UI_VOCAB.sections.links).toBe("Links");
    expect(UI_VOCAB.sections.assignmentChanges).toBe("Assignment & Changes");
    expect(UI_VOCAB.sections.notificationsPanel).toBe("Assignment & Changes");
    expect(UI_VOCAB.sections.writingWorkflow).toBe("Writing Workflow");
    expect(UI_VOCAB.sections.publishingWorkflow).toBe("Publishing Workflow");
  });

  it("filter concepts use role nouns for users and pipeline nouns for states", () => {
    expect(UI_VOCAB.filterConcepts.writer).toBe("Writer");
    expect(UI_VOCAB.filterConcepts.publisher).toBe("Publisher");
    expect(UI_VOCAB.filterConcepts.writingStatus).toBe("Writing Status");
    expect(UI_VOCAB.filterConcepts.publishingStatus).toBe("Publishing Status");
    expect(UI_VOCAB.filterConcepts.stage).toBe("Stage");
    expect(UI_VOCAB.filterConcepts.assignedTo).toBe("Assigned to");
  });

  it("sidebar filter containers use the pipeline-noun form", () => {
    expect(UI_VOCAB.sidebarFilters.writingFilters).toBe("Writing Filters");
    expect(UI_VOCAB.sidebarFilters.publishingFilters).toBe("Publishing Filters");
  });

  it("comment placeholder and empty state are unified across surfaces", () => {
    expect(UI_VOCAB.comments.placeholder).toBe("Add context or feedback…");
    expect(UI_VOCAB.comments.emptyState).toBe(
      "No comments yet. Add context to keep handoffs clear."
    );
  });
});

describe("UI_VOCAB forbidden/allowed lists", () => {
  it("forbidden list covers the known product-name and pill-grammar drifts", () => {
    const forbidden = new Set<string>(UI_VOCAB_FORBIDDEN_SUBSTRINGS);
    expect(forbidden.has("Sighthound Content Ops")).toBe(true);
    expect(forbidden.has("Content Ops Dashboard")).toBe(true);
    expect(forbidden.has("Writing Assignee")).toBe(true);
    expect(forbidden.has("Publishing Assignee")).toBe(true);
  });

  it("allowed list keeps the canonical role-noun pill prefixes and status labels", () => {
    const allowed = new Set<string>(UI_VOCAB_ALLOWED_SUBSTRINGS);
    expect(allowed.has("Writer:")).toBe(true);
    expect(allowed.has("Publisher:")).toBe(true);
    expect(allowed.has("Writing Status")).toBe(true);
    expect(allowed.has("Publishing Status")).toBe(true);
  });

  it("forbidden and allowed lists never overlap", () => {
    const allowed = new Set<string>(UI_VOCAB_ALLOWED_SUBSTRINGS);
    for (const forbidden of UI_VOCAB_FORBIDDEN_SUBSTRINGS) {
      expect(allowed.has(forbidden)).toBe(false);
    }
  });
});
