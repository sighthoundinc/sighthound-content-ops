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
            title="User Guide"
            description="Practical guide for workflow rules, statuses, filters, imports, shortcuts, and troubleshooting."
          />

          <Section id="what-this-app-is" title="1. What this app is">
            <p>This app is your content operations workspace for blogs and social posts.</p>
            <BulletList
              items={[
                "Track writing and publishing progress in one place.",
                "Manage assignments and role-based ownership.",
                "Coordinate social production and live-link completion.",
                "Keep a clear, auditable workflow history.",
              ]}
            />
            <p className="font-medium text-slate-900">
              It does not replace your writing tools or publish directly to external platforms.
            </p>
          </Section>

          <Section id="navigation-layout" title="2. Navigation and layout standards">
            <p className="font-semibold text-slate-900">Sidebar order (fixed):</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Dashboard</li>
              <li>My Tasks</li>
              <li>Ideas</li>
              <li>Blogs</li>
              <li>Social Posts</li>
              <li>Calendar</li>
              <li>CardBoard</li>
              <li>User Manual</li>
              <li>Settings</li>
              <li>Permissions</li>
            </ol>
            <p className="font-semibold text-slate-900">Filter groups:</p>
            <BulletList
              items={[
                "Writer Filters and Publisher Filters are separate groups.",
                "Both are collapsed by default.",
                "Each group toggles independently.",
              ]}
            />
          </Section>

          <Section id="quick-role-start" title="3. Quick role-based start">
            <div className="space-y-2">
              <p>
                <span className="font-semibold text-slate-900">Writer</span> — Open My Tasks,
                pick assigned work, move it through writing, then submit or advance when complete.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Publisher</span> — Open
                publishing-ready records, complete CMS steps, add the live URL, and finalize.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Admin</span> — Manage users,
                permissions, cleanup and recovery workflows, and sensitive controls.
              </p>
            </div>
          </Section>

          <Section id="tables-sorting-actions" title="4. Tables, sorting, and action bars">
            <BulletList
              items={[
                "Sort directly by clicking column headers.",
                "Click once for ascending and again for descending on the same header.",
                "Clicking a different header starts ascending on that column.",
                "Sort indicators: ↕ (unsorted), ↑ (ascending), ↓ (descending).",
                "The site column is sortable.",
                "Action order is always Copy → Customize → Import → Export.",
                "Table or Pipeline toggles stay on the far right; related buttons stay on the left.",
                "Updating results message appears below pagination controls for stable table layout.",
              ]}
            />
          </Section>

          <Section id="search-filters" title="5. Search and filter behavior">
            <BulletList
              items={[
                "Search supports case-insensitive partial matching.",
                "Filters can be combined and persist until changed or cleared.",
                "No-result states show clear empty-state feedback.",
              ]}
            />
          </Section>

          <Section id="imports" title="6. Import workflow (columns + rows)">
            <p className="font-semibold text-slate-900">Before import, you can control both:</p>
            <BulletList
              items={[
                "Columns: unselect non-required columns.",
                "Rows: select or unselect rows in sheet preview.",
                "Error rows: exclude invalid rows before import.",
              ]}
            />
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
            <p>Missing non-key fields can be edited after import.</p>
          </Section>

          <Section id="ideas-workflow" title="7. Ideas workflow rules">
            <BulletList
              items={[
                "Comments and references stay visible by default on idea cards.",
                "Comments and references are not edited inline inside idea cards.",
                "Use Edit Idea to update title, site, comments, and references.",
                "Ideas can be converted into both blogs and social posts.",
              ]}
            />
          </Section>

          <Section id="blog-status-language" title="8. Blog status language">
            <p className="font-semibold text-slate-900">Writer labels:</p>
            <BulletList items={["Awaiting Editorial Review", "Writing Approved"]} />
            <p className="font-semibold text-slate-900">Publisher progression:</p>
            <p>
              Not Started → Publishing in Progress → Waiting for Approval → Publishing
              Approved → Published
            </p>
          </Section>

          <Section id="social-post-rules" title="9. Social posts: editor flow and completion rules">
            <p className="font-semibold text-slate-900">Dedicated editor flow:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Setup</li>
              <li>Link Context (optional)</li>
              <li>Write Caption</li>
              <li>Review &amp; Publish</li>
            </ol>
            <p className="font-semibold text-slate-900">Social status model:</p>
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
            <p className="font-semibold text-slate-900">Next action cues:</p>
            <BulletList
              items={[
                "Draft → Submit for Review",
                "In Review → Admin Review Needed",
                "Changes Requested → Apply Changes",
                "Creative Approved → Add Caption & Schedule",
                "Ready to Publish → Publish Post",
                "Awaiting Live Link → Submit Link",
                "Published → Done",
              ]}
            />
            <BulletList
              items={[
                "Social editors can collaborate on the same post at the same time.",
                "At least one public live link (LinkedIn, Facebook, or Instagram) is required before completion.",
                "If live link is missing, keep status at Awaiting Live Link.",
              ]}
            />
          </Section>

          <Section id="shortcuts-quick-create" title="10. Keyboard shortcuts and quick create">
            <BulletList
              items={[
                "Shortcuts are exposed as clickable Shortcut text that opens a key-combination modal.",
                "Shortcut hints are shown in major action dropdowns (Dashboard, Add New Idea, New Blog, New Social Post).",
                "Avoid using system-sensitive shortcuts for app-defined actions.",
                "Quick Create supports ↑ or ↓ to move, Enter to select, and Esc to close.",
                "Active quick-create options should always have a strong visible focus state.",
              ]}
            />
          </Section>

          <Section id="feedback-validation-errors" title="11. Feedback, validation, and errors">
            <BulletList
              items={[
                "Every action should show explicit loading, success, or error feedback.",
                "Validation errors appear near affected fields.",
                "Errors are human-readable and actionable.",
                "Failed actions should never leave partial silent updates.",
                "Permission errors should clearly indicate access limitations.",
              ]}
            />
          </Section>

          <Section id="permissions-sensitive" title="12. Permissions and sensitive actions">
            <p>Permissions are role-based and enforced by the system.</p>
            <BulletList
              items={[
                "Only admins can run Wipe App Clean.",
                "Reset keeps the initiating admin account but clears operational data.",
                "The initiating admin's own content and activity records are also wiped.",
              ]}
            />
          </Section>

          <Section id="interaction-consistency" title="13. Interaction consistency expectations">
            <BulletList
              items={[
                "Dropdowns and modals close when focus is lost (click outside).",
                "Copy actions in Quick Actions should trigger a global visual confirmation.",
                "Table layouts stay stable during sorting, filtering, and pagination updates.",
                "Report any missing or inconsistent behavior as a bug.",
              ]}
            />
          </Section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
