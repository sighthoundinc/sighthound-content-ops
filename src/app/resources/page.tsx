"use client";

import { AppShell } from "@/components/app-shell";
import { DataPageHeader } from "@/components/data-page";
import { ProtectedPage } from "@/components/protected-page";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function ResourcesPage() {
  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-5">
          <DataPageHeader
            title="User Manual"
            description="Practical manual for workflow rules, statuses, filters, imports, shortcuts, notifications, and troubleshooting."
          />
          <Section id="start-here" title="1. Start here">
            <p>This workspace helps you run blog and social-post work from draft to completion.</p>
            <BulletList
              items={[
                "Open My Tasks first to see what needs action now.",
                "Use clear status steps to avoid skipped handoffs.",
                "Use filters and imports to keep large queues manageable.",
                "Use notifications to track assignments and stage changes.",
              ]}
            />
            <p className="font-medium text-slate-900">
              Keep this page as your day-to-day reference while operating the workflow.
            </p>
          </Section>

          <Section id="daily-workflow" title="2. Daily workflow (recommended order)">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Open My Tasks and review what is assigned and due.</li>
              <li>Open each item and complete required fields/checklist items.</li>
              <li>Move status forward only when the current stage is complete.</li>
              <li>Use filters to focus on one queue (status, product, type, owner).</li>
              <li>For social posts, add at least one public live link before final completion.</li>
            </ol>
          </Section>

          <Section id="workflow-rules-statuses" title="3. Workflow rules and statuses">
            <p className="font-semibold text-slate-900">Blog status language:</p>
            <BulletList
              items={[
                "Writer labels: Awaiting Editorial Review, Writing Approved.",
                "Publisher flow: Not Started → Publishing in Progress → Waiting for Approval → Publishing Approved → Published.",
              ]}
            />
            <p className="font-semibold text-slate-900">Social post status model:</p>
            <BulletList
              items={[
                "Draft",
                "In Review",
                "Changes Requested",
                "Creative Approved",
                "Ready to Publish",
                "Awaiting Live Link",
                "Published",
              ]}
            />
            <p className="font-semibold text-slate-900">Social next actions:</p>
            <BulletList
              items={[
                "Draft → Submit for Review",
                "In Review → Review Needed",
                "Changes Requested → Apply Changes",
                "Creative Approved → Add Caption & Schedule",
                "Ready to Publish → Publish Post",
                "Awaiting Live Link → Submit Link",
                "Published → Done",
              ]}
            />
            <p className="font-semibold text-slate-900">Workflow rules to remember:</p>
            <BulletList
              items={[
                "Social editors can collaborate on the same post concurrently.",
                "Execution stages keep brief fields read-only for stable handoff.",
                "Returning from execution to Changes Requested requires a reason.",
                "Published requires at least one valid live link (LinkedIn, Facebook, or Instagram).",
                "On Ideas, comments and references stay visible and are edited through Edit Idea (not inline).",
              ]}
            />
          </Section>

          <Section id="filters-search" title="4. Filters and search">
            <BulletList
              items={[
                "Search is case-insensitive and supports partial matches.",
                "Combine filters to narrow to actionable work quickly.",
                "Filters persist until changed or cleared.",
                "If no results appear, clear one filter at a time to isolate the blocker.",
                "Grouped dashboard filters: Cross-Content Scope, Blog Filters, and Social Filters.",
                "Scope-safe behavior: blog-only filters pass through social rows, and social-only filters pass through blog rows.",
              ]}
            />
            <p className="font-semibold text-slate-900">Table sorting and controls:</p>
            <BulletList
              items={[
                "Click table headers to sort ascending/descending.",
                "Sort indicators: ↕ (unsorted), ↑ (ascending), ↓ (descending).",
                "Global action order: Copy → Customize → Import → Export.",
                "Phase A selection: both blog and social rows can be selected in the first column.",
                "Safety gate: blog mutation controls are disabled whenever any social row is selected.",
                "Selected CSV/PDF export supports mixed selected rows.",
              ]}
            />
          </Section>

          <Section id="imports" title="5. Import workflow">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Upload your sheet.</li>
              <li>Map/select columns and unselect non-required columns.</li>
              <li>Use sheet preview to select/unselect rows before import.</li>
              <li>Exclude error rows and correct key-field issues.</li>
              <li>Run import and update optional fields later if needed.</li>
            </ol>
            <p className="font-semibold text-slate-900">Required key columns:</p>
            <BulletList
              items={[
                "SH or RED",
                "Full blog title",
                "Full published blog URL",
                "Blog writer name",
                "Person who published",
                "Date shown on blog (YYYY-MM-DD)",
              ]}
            />
          </Section>

          <Section id="shortcuts" title="6. Shortcuts and fast navigation">
            <BulletList
              items={[
                "Use the clickable Shortcut label to open the shortcuts modal.",
                "Command palette: ⌘K (Mac) or Ctrl+K (Windows).",
                "Esc closes open dropdowns and modals.",
                "Quick Create: ↑/↓ to move, Enter to select, Esc to close.",
              ]}
            />
          </Section>

          <Section id="notifications" title="7. Notifications and feedback">
            <p className="font-semibold text-slate-900">Notification bell:</p>
            <BulletList
              items={[
                "Tracks assignments, stage changes, submissions, publications, and mentions.",
                "Unread badge shows what still needs review.",
                "Click any item to jump to the related record.",
              ]}
            />
            <p className="font-semibold text-slate-900">Notification preferences:</p>
            <BulletList
              items={[
                "Settings → Notification Preferences controls all notification types.",
                "Use global on/off plus per-type toggles.",
                "Slack delivery follows the same preference toggles.",
              ]}
            />
            <p className="font-semibold text-slate-900">Action feedback:</p>
            <BulletList
              items={[
                "Success/error alerts appear at the bottom-left and auto-dismiss quickly.",
                "Copy actions show a visual copied confirmation.",
              ]}
            />
          </Section>

          <Section id="troubleshooting" title="8. Troubleshooting quick fixes">
            <BulletList
              items={[
                "Cannot move status: finish required checklist items and save first.",
                "Social post stuck before completion: add at least one valid public live link.",
                "Missing results: clear filters/search and reapply one by one.",
                "Import errors: unselect invalid rows, verify required columns, then retry.",
                "Missing notifications: verify notification toggles and connector status in Settings.",
                "Unexpected UI state: refresh once, retry action, then report with item ID and step where it failed.",
              ]}
            />
          </Section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
