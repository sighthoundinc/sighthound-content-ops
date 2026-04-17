import { validateGeminiOutput } from "@/app/api/ai/utils/output-validator";

describe("validateGeminiOutput", () => {
  it("accepts a clean advisory response", () => {
    const result = validateGeminiOutput({
      answer: "This post is in In Review. The editor needs to approve it before you can publish.",
      nextSteps: ["Ping the editor for review.", "Confirm the Canva link is correct."],
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects answers containing raw enum keys", () => {
    const result = validateGeminiOutput({
      answer: "Move this to ready_to_publish and submit.",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "banned_enum")).toBe(true);
  });

  it("rejects answers that drift into content generation", () => {
    const result = validateGeminiOutput({
      answer: "Here's a caption you can use: Check out our new product!",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "content_generation")).toBe(true);
  });

  it("rejects empty answers", () => {
    const result = validateGeminiOutput({ answer: "   " });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "empty_answer")).toBe(true);
  });

  it("rejects answers longer than 600 chars", () => {
    const result = validateGeminiOutput({ answer: "a".repeat(601) });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "answer_too_long")).toBe(true);
  });

  it("rejects too many next steps", () => {
    const result = validateGeminiOutput({
      answer: "You're ready.",
      nextSteps: new Array(6).fill("Step."),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "too_many_next_steps")).toBe(true);
  });

  it("rejects overly long next steps", () => {
    const result = validateGeminiOutput({
      answer: "You're ready.",
      nextSteps: ["a".repeat(241)],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "next_step_too_long")).toBe(true);
  });

  it("rejects next steps containing content-generation signals", () => {
    const result = validateGeminiOutput({
      answer: "You're ready.",
      nextSteps: ["Try this caption: Amazing deal!"],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "content_generation")).toBe(true);
  });
});
