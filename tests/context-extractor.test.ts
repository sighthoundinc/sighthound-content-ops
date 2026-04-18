import { extractContextSync, ContextInput } from "@/app/api/ai/utils/context-extractor";

describe("Context Extractor", () => {
  function createInput(overrides: Partial<ContextInput> = {}): ContextInput {
    return {
      entityType: "blog",
      entityId: "blog-123",
      userId: "user-456",
      userRole: "writer",
      ...overrides
    };
  }

  function createEntityState(overrides: any = {}) {
    return {
      status: "draft",
      fields: { title: true, writer_id: true },
      ownerId: "user-456",
      reviewerId: undefined,
      ...overrides
    };
  }

  it("should extract basic context", () => {
    const input = createInput();
    const state = createEntityState();
    const result = extractContextSync(input, state);

    expect(result.entityType).toBe("blog");
    expect(result.entityId).toBe("blog-123");
    expect(result.userId).toBe("user-456");
    expect(result.userRole).toBe("writer");
  });

  it("should detect user as owner", () => {
    const input = createInput({ userId: "user-456" });
    const state = createEntityState({ ownerId: "user-456" });
    const result = extractContextSync(input, state);

    expect(result.userIsOwner).toBe(true);
  });

  it("should detect user as not owner", () => {
    const input = createInput({ userId: "user-789" });
    const state = createEntityState({ ownerId: "user-456" });
    const result = extractContextSync(input, state);

    expect(result.userIsOwner).toBe(false);
  });

  it("should detect user as reviewer", () => {
    const input = createInput({ userId: "user-789", userRole: "editor" });
    const state = createEntityState({ reviewerId: "user-789" });
    const result = extractContextSync(input, state);

    expect(result.userIsReviewer).toBe(true);
  });

  it("should detect admin as reviewer", () => {
    const input = createInput({ userId: "user-789", userRole: "admin" });
    const state = createEntityState({ reviewerId: "other-reviewer" });
    const result = extractContextSync(input, state);

    expect(result.userIsReviewer).toBe(true);
  });

  it("should extract entity state", () => {
    const input = createInput();
    const state = createEntityState({
      status: "writer_review",
      fields: { title: true, writer_id: true, draft_doc_link: false }
    });
    const result = extractContextSync(input, state);

    expect(result.currentStatus).toBe("writer_review");
    expect(result.fields.title).toBe(true);
    expect(result.fields.draft_doc_link).toBe(false);
  });

  it("should get next allowed stages", () => {
    // Unified blog workflow: writing -> ready -> publishing -> published.
    // See `src/lib/workflow-rules.ts#BLOG_WORKFLOW`.
    const input = createInput({ entityType: "blog" });
    const state = createEntityState({ status: "writing" });
    const result = extractContextSync(input, state);

    expect(result.nextAllowedStages).toContain("ready");
  });

  it("should handle terminal stages", () => {
    const input = createInput({ entityType: "blog" });
    const state = createEntityState({ status: "published" });
    const result = extractContextSync(input, state);

    expect(result.nextAllowedStages.length).toBe(0);
  });

  it("should handle social posts", () => {
    const input = createInput({
      entityType: "social_post",
      entityId: "social-123"
    });
    const state = createEntityState({
      status: "draft",
      fields: { product: true, type: true, canva_url: true }
    });
    const result = extractContextSync(input, state);

    expect(result.entityType).toBe("social_post");
    expect(result.currentStatus).toBe("draft");
  });

  it("should throw on unknown entity type", () => {
    const input = createInput({ entityType: "unknown" as any });
    const state = createEntityState();

    expect(() => {
      extractContextSync(input, state);
    }).toThrow();
  });

  it("should include workflow definition", () => {
    const input = createInput({ entityType: "blog" });
    const state = createEntityState();
    const result = extractContextSync(input, state);

    expect(result.workflowDefinition).toBeDefined();
    expect(result.workflowDefinition.transitions).toBeDefined();
  });

  it("should include timestamp", () => {
    const input = createInput();
    const state = createEntityState();
    const result = extractContextSync(input, state);

    expect(result.extractedAt).toBeDefined();
    expect(new Date(result.extractedAt)).toBeInstanceOf(Date);
  });
});
