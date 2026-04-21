/**
 * Response Generator
 *
 * Pure deterministic function to assemble workflow guidance response.
 * No external API calls, no side effects.
 *
 * Generates:
 * - Current state summary
 * - Blockers and issues
 * - Next steps
 * - Quality feedback
 */

import { ExtractedContext } from "./context-extractor";
import { Blocker } from "@/lib/blocker-detector";
import { QualityIssue } from "@/lib/quality-checker";
import type { AskAIIntent } from "../types";
import { humanizeField, humanizeFieldList, humanizeStatus } from "./humanize";

export interface ResponseGeneratorInput {
  context: ExtractedContext;
  blockers: Blocker[];
  qualityIssues: QualityIssue[];
}

export interface DeterministicResult {
  currentState: {
    entityType: string;
    status: string;
    userRole: string;
    isOwner: boolean;
  };
  blockers: Blocker[];
  nextSteps: string[];
  qualityIssues: QualityIssue[];
  canProceed: boolean;
  confidence: number; // 0-100, indicates deterministic confidence
  prompt?: string;
  questionIntent?: AskAIIntent;
  answer?: string;
  responseSource?: "deterministic" | "gemini";
  aiModel?: string;
  generatedAt: string;
}

/**
 * Generates workflow guidance response.
 * Returns structured deterministic output ready for formatting or display.
 */
export function generateResponse(input: ResponseGeneratorInput): DeterministicResult {
  const { context, blockers, qualityIssues } = input;

  // Generate next steps based on current state
  const nextSteps = generateNextSteps(context, blockers);

  // Determine if user can proceed to next stage
  const criticalBlockers = blockers.filter((b) => b.severity === "critical");
  const canProceed = criticalBlockers.length === 0 && context.nextAllowedStages.length > 0;

  // Confidence is high for deterministic logic (99%, leaving 1% for edge cases)
  const confidence = 99;

  return {
    currentState: {
      entityType: context.entityType,
      status: context.currentStatus,
      userRole: context.userRole,
      isOwner: context.userIsOwner
    },
    blockers,
    nextSteps,
    qualityIssues,
    canProceed,
    confidence,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generates actionable next steps based on current state and blockers.
 */
function generateNextSteps(context: ExtractedContext, blockers: Blocker[]): string[] {
  const steps: string[] = [];

  // If there are critical blockers, list them first
  const criticalBlockers = blockers.filter((b) => b.severity === "critical");
  if (criticalBlockers.length > 0) {
    criticalBlockers.forEach((blocker) => {
      if (blocker.type === "missing_field") {
        steps.push(`Add the ${humanizeField(blocker.field)}.`);
      } else if (blocker.type === "ownership") {
        steps.push("Ask the current assignee to take this step, or request reassignment.");
      } else if (blocker.type === "invalid_transition") {
        steps.push("This one’s already at the final stage — nothing further to do.");
      } else if (blocker.type === "permission") {
        steps.push("This action is outside what your role can do right now.");
      }
    });
  }

  // If no critical blockers and can proceed, suggest next stage
  if (criticalBlockers.length === 0 && context.nextAllowedStages.length > 0) {
    const nextStage = context.nextAllowedStages[0];
    const requiredFields = getRequiredFieldsForStage(context, nextStage);

    if (requiredFields.length > 0) {
      steps.push(
        `Finish the ${humanizeFieldList(requiredFields)} to move to ${humanizeStatus(nextStage)}.`
      );
    } else {
      steps.push(`You’re ready to move to ${humanizeStatus(nextStage)}.`);
    }
  }

  // Add warnings for non-critical issues
  const warnings = blockers.filter((b) => b.severity === "warning");
  if (warnings.length > 0) {
    warnings.forEach((warning) => {
      if (warning.type === "permission") {
        steps.push("Heads up: a reviewer still needs to approve this at the next stage.");
      } else if (warning.type === "reviewer_assignment") {
        steps.push("Heads up: a reviewer hasn’t been assigned yet.");
      }
    });
  }

  // If no steps generated, provide generic guidance
  if (steps.length === 0) {
    steps.push(
      `You’re in ${humanizeStatus(context.currentStatus)}. Review the content and make any needed updates.`
    );
  }

  return steps;
}

/**
 * Gets required fields for a specific stage.
 */
function getRequiredFieldsForStage(context: ExtractedContext, stage: string): string[] {
  const requiredFields = context.workflowDefinition.requiredFieldsByStage?.[stage] || [];
  return requiredFields.filter((field: string) => !context.fields[field]);
}

/**
 * Formats response for human-readable output.
 * Used as fallback when Gemini is unavailable.
 *
 * Plain-text only: no emoji / Unicode glyphs per the Iconography Standard
 * (AGENTS.md). Section labels and severity prefixes carry the semantics
 * instead of icons.
 */
export function formatResponseAsText(result: DeterministicResult): string {
  const lines: string[] = [];

  // Title
  lines.push("Workflow Guidance");
  lines.push("-----------------\n");

  // Current state
  lines.push(`Current Status: ${result.currentState.status}`);
  lines.push(`Entity Type: ${result.currentState.entityType}`);
  lines.push(`Your Role: ${result.currentState.userRole}`);
  lines.push(`You are the ${result.currentState.isOwner ? "owner" : "not the owner"}\n`);

  // Blockers
  if (result.blockers.length > 0) {
    lines.push("Issues Found:");
    result.blockers.forEach((blocker) => {
      const prefix = blocker.severity === "critical" ? "[Critical]" : "[Warning]";
      lines.push(`  - ${prefix} ${blocker.message || blocker.type}`);
    });
    lines.push("");
  } else {
    lines.push("No blocking issues.\n");
  }

  // Next steps
  if (result.nextSteps.length > 0) {
    lines.push("Next Steps:");
    result.nextSteps.forEach((step, i) => {
      lines.push(`  ${i + 1}. ${step}`);
    });
    lines.push("");
  }

  // Quality feedback
  if (result.qualityIssues.length > 0) {
    lines.push("Quality Feedback:");
    result.qualityIssues.forEach((issue) => {
      lines.push(`  - ${issue.message}`);
    });
    lines.push("");
  }

  // Summary
  lines.push(
    result.canProceed
      ? "Ready to proceed to next stage."
      : "Cannot proceed due to blockers."
  );

  return lines.join("\n");
}
