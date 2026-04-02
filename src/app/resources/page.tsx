"use client";
import Link from "next/link";

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

function InternalPageLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-sky-700 underline underline-offset-2">
      {children}
    </Link>
  );
}

export default function ResourcesPage() {
  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-5">
          <DataPageHeader
            title="User Manual"
            description="Role-based manual with quick links for Writers, Publishers, Editors/Reviewers, and Admins."
          />
          <Section id="vision" title="Vision">
            <p>
              Sighthound Content Relay is built to turn content execution into a reliable handoff
              system from idea to live publish.
            </p>
            <BulletList
              items={[
                "Company vision: make planning, review, and publishing coordination predictable across every campaign.",
                "App vision: every record has clear ownership, clear next action, and full workflow visibility.",
                "Execution standard: reduce dropped handoffs and unclear priorities by keeping one shared source of truth.",
              ]}
            />
          </Section>
          <Section id="start-here" title="1. Start here">
            <p>This workspace helps you run blog and social-post work from draft to completion.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Open <InternalPageLink href="/tasks">My Tasks</InternalPageLink> first to see what
                needs action now.
              </li>
              <li>Use clear status steps to avoid skipped handoffs.</li>
              <li>Use filters and imports to keep large queues manageable.</li>
              <li>Use notifications to track assignments and stage changes.</li>
            </ul>
            <p className="font-medium text-slate-900">
              Keep this page as your day-to-day reference while operating the workflow.
            </p>
          </Section>

          <Section id="role-quick-links" title="Role quick links">
            <p>Jump directly to the role path you are operating right now:</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              <li>
                <a href="#writer-quick-start" className="font-medium text-sky-700 underline underline-offset-2">
                  Writer quick start
                </a>
              </li>
              <li>
                <a href="#publisher-quick-start" className="font-medium text-sky-700 underline underline-offset-2">
                  Publisher quick start
                </a>
              </li>
              <li>
                <a
                  href="#editor-reviewer-quick-start"
                  className="font-medium text-sky-700 underline underline-offset-2"
                >
                  Editor/Reviewer quick start
                </a>
              </li>
              <li>
                <a href="#admin-quick-start" className="font-medium text-sky-700 underline underline-offset-2">
                  Admin quick start
                </a>
              </li>
              <li>
                <a href="#shared-navigation-map" className="font-medium text-sky-700 underline underline-offset-2">
                  Shared navigation map
                </a>
              </li>
              <li>
                <a href="#when-you-are-stuck" className="font-medium text-sky-700 underline underline-offset-2">
                  When you are stuck
                </a>
              </li>
            </ul>
          </Section>

          <Section id="shared-navigation-map" title="Shared navigation map">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <InternalPageLink href="/dashboard">Dashboard</InternalPageLink>: cross-content
                queue view with filters and sort controls.
              </li>
              <li>
                <InternalPageLink href="/tasks">My Tasks</InternalPageLink>: assignment-first
                execution queue.
              </li>
              <li>
                <InternalPageLink href="/blogs">Blogs</InternalPageLink>: published/reference
                lookup and copy/export actions.
              </li>
              <li>
                <InternalPageLink href="/social-posts">Social Posts</InternalPageLink>: social
                workflow list plus full editor.
              </li>
              <li>
                <InternalPageLink href="/ideas">Ideas</InternalPageLink>: intake and conversion
                into blogs or social posts.
              </li>
              <li>
                <InternalPageLink href="/calendar">Calendar</InternalPageLink>: scheduling and
                capacity planning.
              </li>
              <li>
                <InternalPageLink href="/settings">Settings</InternalPageLink>: profile,
                connectors, notifications, and admin tools.
              </li>
            </ul>
          </Section>

          <Section id="writer-quick-start" title="Writer quick start">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Start in <InternalPageLink href="/tasks">My Tasks</InternalPageLink> and focus on{" "}
                `Required by: &lt;username&gt;`.
              </li>
              <li>Open assigned records and complete required fields/checklist items.</li>
              <li>For social posts, ensure Product, Type, and Canva link are complete before review submission.</li>
              <li>Move stages forward only when validation is complete and handoff context is clear.</li>
              <li>Use `Waiting on Others` to track blocked handoffs.</li>
            </ol>
          </Section>

          <Section id="publisher-quick-start" title="Publisher quick start">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Start in <InternalPageLink href="/tasks">My Tasks</InternalPageLink> and focus on
                publishing-stage records.
              </li>
              <li>Blogs auto-move to `Publishing in Progress` when writing is marked complete and a publisher is assigned.</li>
              <li>Confirm publish date readiness and required publishing fields.</li>
              <li>Complete publishing steps only after upstream approvals are complete.</li>
              <li>Add/update required links (blog live URL or social live links).</li>
              <li>
                Use <InternalPageLink href="/calendar">Calendar</InternalPageLink> for near-term
                schedule conflict checks.
              </li>
            </ol>
          </Section>

          <Section id="editor-reviewer-quick-start" title="Editor/Reviewer quick start">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open <InternalPageLink href="/tasks">My Tasks</InternalPageLink> for review-stage
                records.
              </li>
              <li>Review quality and required field completeness.</li>
              <li>Use `Changes Requested` for actionable revision guidance when needed.</li>
              <li>Approve only when the next owner can execute without missing context.</li>
              <li>Use record-level Activity to verify change history and ownership transitions.</li>
            </ol>
          </Section>

          <Section id="admin-quick-start" title="Admin quick start">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Use <InternalPageLink href="/dashboard">Dashboard</InternalPageLink> and{" "}
                <InternalPageLink href="/tasks">My Tasks</InternalPageLink> to spot workflow
                bottlenecks.
              </li>
              <li>
                Use <InternalPageLink href="/settings">Settings</InternalPageLink> to manage
                users, permissions, and connectors.
              </li>
              <li>Use Activity History for audit review and troubleshooting.</li>
              <li>Use quick-view to validate non-admin experience when triaging user reports.</li>
              <li>Use destructive actions (cleanup, wipe) only after confirming scope and impact.</li>
            </ol>
          </Section>

          <Section id="when-you-are-stuck" title="When you are stuck">
            <p>Use these internal links to get unstuck quickly:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <a
                  href="#workflow-rules-statuses"
                  className="font-medium text-sky-700 underline underline-offset-2"
                >
                  Workflow rules and statuses
                </a>
              </li>
              <li>
                <a href="#filters-search" className="font-medium text-sky-700 underline underline-offset-2">
                  Filters and search
                </a>
              </li>
              <li>
                <a href="#imports" className="font-medium text-sky-700 underline underline-offset-2">
                  Import workflow
                </a>
              </li>
              <li>
                <a href="#notifications" className="font-medium text-sky-700 underline underline-offset-2">
                  Notifications and feedback
                </a>
              </li>
              <li>
                <a href="#troubleshooting" className="font-medium text-sky-700 underline underline-offset-2">
                  Troubleshooting quick fixes
                </a>
              </li>
            </ul>
          </Section>

          <Section id="daily-workflow" title="2. Daily workflow (recommended order)">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open <InternalPageLink href="/tasks">My Tasks</InternalPageLink> and review what is
                assigned and due.
              </li>
              <li>Open each item and complete required fields/checklist items.</li>
              <li>Move status forward only when the current stage is complete.</li>
              <li>Use filters to focus on one queue (status, product, type, owner).</li>
              <li>
                For <InternalPageLink href="/social-posts">Social Posts</InternalPageLink>, add at
                least one public live link before final completion.
              </li>
            </ol>
          </Section>

          <Section id="workflow-rules-statuses" title="3. Workflow rules and statuses">
            <p className="font-semibold text-slate-900">Blog status language:</p>
            <BulletList
              items={[
                "Writer labels: Awaiting Editorial Review, Writing Approved.",
                "Publisher flow: Not Started → Publishing in Progress → Awaiting Publishing Approval → Publishing Approved → Published.",
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
                "When writing is approved on a blog, assigned publishing work is auto-jogged from Not Started to Publishing in Progress unless an explicit publishing stage is sent in the same update.",
                "At Publishing Approved, the assigned publisher remains the next actor; admin publisher-review assignments are no longer actionable at that stage.",
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
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <InternalPageLink href="/settings">Settings</InternalPageLink> → Notification
                Preferences controls all notification types.
              </li>
              <li>Use global on/off plus per-type toggles.</li>
              <li>Slack notifications route to the shared `#content-ops-alerts` channel.</li>
            </ul>
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
                "If branding assets fail, fallback order is automatic: login (text-logo SVG → text-logo PNG → badge SVG → text lockup) and app header badge (animated GIF → badge SVG → SH lockup).",
                "Missing notifications: verify notification toggles and connector status in Settings (/settings).",
                "Unexpected UI state: refresh once, retry action, then report with item ID and step where it failed.",
              ]}
            />
          </Section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
