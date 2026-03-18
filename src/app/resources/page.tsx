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
      {items.map((item) => (
        <li key={item}>{item}</li>
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
            description="Practical daily guide for writers, publishers, and general users managing content."
          />

          <Section id="getting-started" title="1. Getting Started">
            <p>
              This system is used to manage daily content work from idea to final publishing.
            </p>
            <BulletList
              items={[
                "A blog is a full content record that moves through writing and publishing stages.",
                "A social post is promotional content, often linked to a related blog.",
              ]}
            />
            <p className="font-medium text-slate-900">
              High-level workflow: Idea → Writing → Review → Publishing → Published
            </p>
          </Section>

          <Section id="navigating-the-app" title="2. Navigating the App">
            <div className="space-y-2">
              <p>
                <span className="font-semibold text-slate-900">Dashboard</span> — Used for overall
                progress visibility. Use it when you need a quick view of what is in progress, late,
                or ready.
              </p>
              <p>
                <span className="font-semibold text-slate-900">My Tasks</span> — Used for your
                personal work queue. Use it at the start of each day.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Calendar</span> — Used for schedule
                planning. Use it when checking dates and avoiding publishing conflicts.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Blogs</span> — Used to manage blog
                records, statuses, and publish URLs.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Social Posts</span> — Used to manage
                social content, linking, captions, and publishing steps.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Ideas</span> — Used to capture new
                topics before converting them into blogs or social posts.
              </p>
            </div>
          </Section>

          <Section id="understanding-statuses" title="3. Understanding Statuses (Critical Section)">
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Writer Stages</p>
              <BulletList
                items={[
                  "Draft — Assigned but not started. Action: review scope and begin planning.",
                  "Writing in Progress — Active writing stage. Action: continue drafting and update progress.",
                  "Awaiting Editorial Review — Waiting for review. Action: monitor feedback and be ready to revise.",
                  "Needs Revision — Changes requested. Action: update draft and resubmit.",
                  "Writing Approved — Writing is complete. Action: hand off to publishing.",
                ]}
              />

              <p className="font-semibold text-slate-900">Publisher Stages</p>
              <BulletList
                items={[
                  "Not Started — Publishing work not yet begun. Action: pick up approved items.",
                  "Publishing in Progress — Actively preparing in CMS. Action: continue formatting and setup.",
                  "Awaiting Publishing Approval — Waiting for final go-ahead. Action: complete checks and confirm readiness.",
                  "Publishing Approved — Approved to publish. Action: execute publish and capture final URL.",
                  "Published — Live and complete. Action: verify URL and finish handoff.",
                ]}
              />

              <p className="font-semibold text-slate-900">Overall Status</p>
              <p>Overall status reflects total progress across writing and publishing:</p>
              <BulletList
                items={[
                  "Draft",
                  "Writing",
                  "Needs Revision",
                  "Ready",
                  "Publishing",
                  "Published",
                ]}
              />
            </div>
          </Section>

          <Section id="daily-workflow-writer" title="4. Daily Workflow (Writer)">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Open My Tasks.</li>
              <li>Start your assigned blog.</li>
              <li>Update status to Writing in Progress.</li>
              <li>Submit for review.</li>
              <li>Move to Writing Approved when done.</li>
            </ol>
          </Section>

          <Section id="daily-workflow-publisher" title="5. Daily Workflow (Publisher)">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Review Ready items.</li>
              <li>Format content in CMS.</li>
              <li>Publish blog.</li>
              <li>Add URL.</li>
              <li>Mark Published.</li>
            </ol>
          </Section>

          <Section id="working-with-tables" title="6. Working with Tables">
            <BulletList
              items={[
                "Sorting: Click column headers to sort.",
                "Filters: Use filters to find your work.",
                "Search: Use search to locate blogs quickly.",
                "Pagination: Use page controls and rows-per-page for large lists.",
                "Row selection: Select rows when doing bulk actions.",
              ]}
            />
          </Section>

          <Section id="calendar-usage" title="7. Calendar Usage">
            <BulletList
              items={[
                "Use Calendar to view scheduled content by date.",
                "Use toggles to switch between blog view, social post view, or both.",
                "Use this page for planning; use table pages for detailed editing.",
              ]}
            />
          </Section>

          <Section id="linking-content" title="8. Linking Content">
            <p>
              Link social posts to related blogs whenever applicable. This keeps campaigns connected
              and easier to manage.
            </p>
            <BulletList
              items={[
                "Why it matters: clear context between blog and promotion.",
                "It helps tracking and avoids disconnected content records.",
              ]}
            />
          </Section>

          <Section id="keyboard-shortcuts" title="9. Keyboard Shortcuts (Power Users)">
            <BulletList
              items={[
                "⌘K / Ctrl+K → search and navigate",
                "C → quick create",
                "ESC → close modals",
              ]}
            />
          </Section>

          <Section id="common-mistakes" title="10. Common Mistakes to Avoid">
            <BulletList
              items={[
                "Creating duplicate entries",
                "Forgetting to update status",
                "Not adding publish URL",
                "Not linking blog and social post",
              ]}
            />
          </Section>

          <Section id="troubleshooting" title="11. Troubleshooting">
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Can&apos;t find blog</p>
              <p>Use search first, then adjust filters.</p>

              <p className="font-semibold text-slate-900">Calendar not showing item</p>
              <p>Check toggles and confirm the item has a scheduled date.</p>

              <p className="font-semibold text-slate-900">Wrong status</p>
              <p>Open the record and update the stage to the current real step.</p>
            </div>
          </Section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
