#!/usr/bin/env node

/**
 * Audit Parser
 * Converts AUDIT_RESPONSES.json into standardized issue markdown files
 * 
 * Usage:
 *   node audits/audit_parser.js < audits/AUDIT_RESPONSES.json
 *   OR
 *   cat audits/AUDIT_RESPONSES.json | node audits/audit_parser.js
 */

const fs = require("fs");
const path = require("path");

// Risk priority mapping
const PRIORITY_ORDER = { High: 1, Medium: 2, Low: 3 };

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

/**
 * Read JSON from stdin
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error(`Invalid JSON: ${err.message}`));
      }
    });
  });
}

/**
 * Generate markdown issue file content
 */
function generateIssueMarkdown(finding) {
  const stepsText = finding.steps_to_reproduce
    .map((s) => `   ${s}`)
    .join("\n");

  let content = `# ${finding.short_title}\n\n`;

  content += `**Module**: ${finding.module}\n`;
  content += `**Rule violated**: ${finding.rule_violated}\n`;
  content += `**Priority**: ${finding.priority}\n`;
  if (finding.code_quality_issue) {
    content += `**Type**: Code Quality Issue (+ Governance Violation)\n`;
  }
  content += "\n";

  content += `## What happened\n${finding.what_happened}\n\n`;

  content += `## Expected behavior\n${finding.expected_behavior}\n\n`;

  content += `## Steps to reproduce\n${stepsText}\n\n`;

  content += `## Impact\n${finding.impact}\n\n`;

  if (finding.optional_context) {
    content += `## Additional context\n${finding.optional_context}\n`;
  }

  return content;
}

/**
 * Generate summary report
 */
function generateSummaryReport(metadata, findings, groupedByPriority) {
  let summary = `# Governance Audit Summary\n\n`;

  summary += `**Tester**: ${metadata.tester_name}\n`;
  summary += `**Role**: ${metadata.tester_role}\n`;
  summary += `**Date**: ${metadata.test_date}\n`;
  summary += `**Environment**: ${metadata.environment}\n`;
  summary += `**Duration**: ${metadata.duration_minutes} minutes\n\n`;

  summary += `## Overview\n`;
  summary += `- **Total findings**: ${findings.length}\n`;
  summary += `- **High priority**: ${groupedByPriority.High?.length || 0}\n`;
  summary += `- **Medium priority**: ${groupedByPriority.Medium?.length || 0}\n`;
  summary += `- **Low priority**: ${groupedByPriority.Low?.length || 0}\n`;

  const codeQualityCount = findings.filter((f) => f.code_quality_issue).length;
  if (codeQualityCount > 0) {
    summary += `- **Code quality issues**: ${codeQualityCount}\n`;
  }

  summary += `\n## Findings by Priority\n`;

  for (const priority of ["High", "Medium", "Low"]) {
    const group = groupedByPriority[priority] || [];
    if (group.length === 0) continue;

    summary += `\n### ${priority} Priority (${group.length})\n\n`;

    for (const finding of group) {
      const issueFile = `${finding.id}.md`;
      summary += `- [${finding.module} — ${finding.short_title}](./${issueFile})\n`;
    }
  }

  summary += `\n## By Module\n\n`;

  const byModule = {};
  for (const finding of findings) {
    if (!byModule[finding.module]) {
      byModule[finding.module] = [];
    }
    byModule[finding.module].push(finding);
  }

  for (const [module, moduleFindings] of Object.entries(byModule).sort()) {
    summary += `- **${module}**: ${moduleFindings.length} issue(s)\n`;
  }

  summary += `\n## By Rule Violated\n\n`;

  const byRule = {};
  for (const finding of findings) {
    if (!byRule[finding.rule_violated]) {
      byRule[finding.rule_violated] = [];
    }
    byRule[finding.rule_violated].push(finding);
  }

  for (const [rule, ruleFindings] of Object.entries(byRule).sort()) {
    summary += `- **${rule}**: ${ruleFindings.length} issue(s)\n`;
  }

  return summary;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Read input
    console.log(
      `${colors.cyan}Reading audit responses from stdin...${colors.reset}`
    );
    const data = await readStdin();

    if (!data.findings || !Array.isArray(data.findings)) {
      throw new Error("Invalid format: expecting { findings: [...] }");
    }

    const findings = data.findings;
    const metadata = data.audit_metadata || {};

    if (findings.length === 0) {
      console.log(`${colors.yellow}No findings to process.${colors.reset}`);
      process.exit(0);
    }

    // Validate findings
    const requiredFields = [
      "id",
      "module",
      "rule_violated",
      "short_title",
      "what_happened",
      "expected_behavior",
      "steps_to_reproduce",
      "impact",
      "priority",
    ];

    for (const finding of findings) {
      for (const field of requiredFields) {
        if (!finding[field]) {
          throw new Error(
            `Finding ${finding.id || "unknown"} missing required field: ${field}`
          );
        }
      }
    }

    // Create audit directory if it doesn't exist
    const auditDir = path.join(__dirname);
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    // Group findings by priority
    const groupedByPriority = {};
    for (const finding of findings) {
      if (!groupedByPriority[finding.priority]) {
        groupedByPriority[finding.priority] = [];
      }
      groupedByPriority[finding.priority].push(finding);
    }

    // Sort by priority
    for (const priority of Object.keys(groupedByPriority)) {
      groupedByPriority[priority].sort((a, b) => {
        return a.id.localeCompare(b.id);
      });
    }

    // Generate issue files
    console.log(
      `${colors.blue}Generating issue files...${colors.reset}`
    );
    let filesCreated = 0;

    for (const finding of findings) {
      const issueFile = path.join(auditDir, `${finding.id}.md`);
      const markdown = generateIssueMarkdown(finding);
      fs.writeFileSync(issueFile, markdown, "utf8");
      filesCreated++;
      console.log(
        `  ${colors.green}✓${colors.reset} ${finding.id}.md (${finding.priority})`
      );
    }

    // Generate summary report
    console.log(
      `${colors.blue}Generating summary report...${colors.reset}`
    );
    const summaryFile = path.join(auditDir, "AUDIT_SUMMARY.md");
    const summaryMarkdown = generateSummaryReport(
      metadata,
      findings,
      groupedByPriority
    );
    fs.writeFileSync(summaryFile, summaryMarkdown, "utf8");
    console.log(`  ${colors.green}✓${colors.reset} AUDIT_SUMMARY.md`);

    // Print summary to stdout
    console.log(
      `\n${colors.bold}${colors.green}✓ Audit parsing complete!${colors.reset}`
    );
    console.log(
      `${colors.cyan}Files created in audits/:${colors.reset}`
    );
    console.log(`  - ${filesCreated} issue file(s)`);
    console.log(`  - 1 summary report`);
    console.log(
      `\n${colors.cyan}Next steps:${colors.reset}`
    );
    console.log(`  1. Review audits/AUDIT_SUMMARY.md`);
    console.log(`  2. Review individual issue files in audits/`);
    console.log(`  3. Commit findings: git add audits/ && git commit`);
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
