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
            title="Content Operations Dashboard — User Guide (Resources)"
            description="Guide content targets non-admin writers/publishers; page access is available to all authenticated users (including admins). Administrative settings and permissions are intentionally out of scope."
          />

          <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              What this guide covers
            </h2>
            <p className="text-sm text-slate-700">
              This guide explains how to use the Content Operations Dashboard to manage:
            </p>
            <BulletList
              items={[
                "Blog production",
                "Social media posts",
                "Publishing workflow",
                "Content calendar planning",
                "Task management",
              ]}
            />
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Audience & Access:</span> this
              documentation is written for non-admin workflows, but the Resources page itself is
              intentionally visible to all authenticated roles for shared context.
            </p>
          </section>

          <Section id="understanding-dashboard" title="1. Understanding the Dashboard">
            <p>
              The dashboard replaces spreadsheets and scattered documents with one place to
              manage blog writing workflow, social post planning, content calendar visibility,
              writer assignments, and publishing status.
            </p>
            <p>Each piece of content moves through a simple pipeline:</p>
            <p className="font-medium text-slate-900">Draft → Review → Publishing → Published</p>
          </Section>

          <Section id="navigation-overview" title="2. Navigation Overview">
            <p>
              The left navigation menu contains the core areas of the system used day-to-day by
              writers and publishers.
            </p>
            <div className="space-y-2">
              <p>
                <span className="font-semibold text-slate-900">Dashboard</span>: High-level
                overview of content activity and pipeline status.
              </p>
              <p>
                <span className="font-semibold text-slate-900">My Tasks</span>: Your daily queue
                of assigned content (writing, review, publishing).
              </p>
              <p>
                <span className="font-semibold text-slate-900">Blogs</span>: Blog records with
                title, site, writer, publisher, status, and planned publish date.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Social Posts</span>: Social content
                records with post type, Canva links, product tag, related blog, publish date, and
                final platform link.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Calendar</span>: Timeline view for
                blogs, social posts, or both together to avoid collisions and balance cadence.
              </p>
            </div>
          </Section>

          <Section id="blog-workflow" title="3. Blog Workflow">
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Step 1: Create a blog entry</p>
              <BulletList
                items={[
                  "Blog title",
                  "Website (Sighthound or Redactor)",
                  "Assigned writer",
                  "Planned publish date",
                ]}
              />
              <p className="font-semibold text-slate-900">Step 2: Write the blog</p>
              <p>
                Writing usually happens in Google Docs. Once writing starts, set status to{" "}
                <span className="font-medium text-slate-900">Writing</span>.
              </p>
              <p className="font-semibold text-slate-900">Step 3: Ready for publishing</p>
              <p>
                When complete, share with publisher and update status to{" "}
                <span className="font-medium text-slate-900">Ready for Publishing</span>.
              </p>
              <p className="font-semibold text-slate-900">Step 4: Publish</p>
              <p>
                After publish, add final publish date and live URL, then set status to{" "}
                <span className="font-medium text-slate-900">Published</span>.
              </p>
            </div>
          </Section>

          <Section id="social-workflow" title="4. Social Post Workflow">
            <p>
              Social posts are usually created after blog publication, but may also be planned
              earlier.
            </p>
            <p className="font-semibold text-slate-900">Creating a social post</p>
            <BulletList
              items={[
                "Post type",
                "Canva design link",
                "Canva page number",
                "Related blog (if applicable)",
              ]}
            />
            <p className="font-semibold text-slate-900">Publishing the post</p>
            <p>After posting, add platform link and publish date for final traceability.</p>
          </Section>

          <Section id="linking-social-to-blogs" title="5. Linking Social Posts to Blogs">
            <p>
              Most social posts promote a blog. In the social post form, search and select the
              related blog title.
            </p>
            <p className="font-semibold text-slate-900">Benefits</p>
            <BulletList
              items={[
                "Track blog promotion clearly",
                "Navigate quickly between blog and post",
                "Improve campaign visibility",
              ]}
            />
          </Section>

          <Section id="calendar-overview-short" title="6. Using the Calendar">
            <p>
              Use calendar toggles to view blogs, social posts, or both together. Content types are
              visually distinct to support quick scanning and collision detection.
            </p>
            <p className="font-semibold text-slate-900">Use calendar to:</p>
            <BulletList
              items={[
                "Avoid publishing conflicts",
                "Balance distribution across days/weeks",
                "Plan campaigns and follow-up promotion",
              ]}
            />
          </Section>

          <Section id="my-tasks" title="7. My Tasks">
            <p>My Tasks is your personal queue and should be checked daily.</p>
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Writers typically check for:</p>
              <BulletList items={["Blogs they must write", "Drafts awaiting completion"]} />
              <p className="font-semibold text-slate-900">Publishers typically check for:</p>
              <BulletList items={["Content waiting for publishing", "Posts ready to schedule"]} />
            </div>
          </Section>

          <Section id="best-practices" title="8. Best Practices">
            <BulletList
              items={[
                "Keep statuses updated as work progresses",
                "Add publish dates early (estimates still help planning)",
                "Link related assets (blog ↔ social post)",
                "Check for existing records before creating new entries",
              ]}
            />
          </Section>

          <Section id="tables-filters-search" title="9. Tables, Filters, and Search">
            <p>
              Most pages use unified tables for fast scanning and management. Learning table controls
              is one of the biggest productivity gains in the system.
            </p>
            <p className="font-semibold text-slate-900">Table overview</p>
            <p>
              All data tables (Blogs, Social Posts, Tasks) use a consistent DataTable component with
              built-in support for sorting, pagination, column customization, and row selection.
            </p>
            <p className="font-semibold text-slate-900">Common table columns</p>
            <BulletList
              items={[
                "Title, Site, Writer, Publisher, Status, Publish Date",
                "Social-specific: Post Type, Canva Link, Related Blog, Platform Link",
              ]}
            />
            <p className="font-semibold text-slate-900">Sorting</p>
            <p>
              Click any column header to sort ascending/descending. Sort state persists within the
              page session. Use this to quickly answer operational questions (for example, what
              publishes next or what is still waiting for review).
            </p>
            <p className="font-semibold text-slate-900">Pagination and row limits</p>
            <BulletList
              items={[
                "Select rows per page (10, 20, 50, 100, or All)",
                "Navigate between pages using pagination controls",
                "Row limit resets to default when filters change",
              ]}
            />
            <p className="font-semibold text-slate-900">Column customization</p>
            <BulletList
              items={[
                "Click Edit Columns button to show/hide columns",
                "Columns persist in local storage for your next visit",
                "Resize columns by dragging the right edge of any header",
              ]}
            />
            <p className="font-semibold text-slate-900">Filtering</p>
            <BulletList
              items={[
                "Site filter (Sighthound / Redactor)",
                "Status filter (Published / Include Unpublished / Unpublished only)",
                "Writer/Publisher status filters for granular visibility",
              ]}
            />
            <p className="font-semibold text-slate-900">Search</p>
            <p>
              Type keywords in the search box to filter by title and URL. Results update as you type.
              Clear the search to reset.
            </p>
            <p className="font-semibold text-slate-900">Row selection and export</p>
            <BulletList
              items={[
                "Check rows to select them for bulk export",
                "Export CSV or PDF of all visible rows or selected rows only",
                "Selection is limited to current page",
              ]}
            />
            <p className="font-semibold text-slate-900">Opening and editing entries</p>
            <p>
              Click any row to open a detail panel on the right. Update fields like status, publish
              date, URLs, and linked assets without leaving the page.
            </p>
            <p className="font-semibold text-slate-900">Keyboard navigation</p>
            <BulletList
              items={[
                "Use arrow keys (↑/↓) to navigate between visible rows",
                "Press Enter to open the currently focused row",
                "Press Cmd+C to copy the title of the focused row",
                "Press Escape to close open panels and menus",
              ]}
            />
            <p className="font-semibold text-slate-900">Quick workflow example</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Writer opens My Tasks and updates a blog to Writing.</li>
              <li>Writer completes draft and sets Ready for Publishing.</li>
              <li>Publisher filters Ready for Publishing and publishes.</li>
              <li>Publisher adds final URL and sets Published.</li>
            </ol>
          </Section>

          <Section id="calendar-deep-dive" title="10. Using the Calendar (Detailed)">
            <p>
              The calendar is optimized for planning and visibility, while table views are optimized
              for row-level management.
            </p>
            <p className="font-semibold text-slate-900">What it shows</p>
            <BulletList
              items={[
                "Blogs, social posts, or both",
                "Day/week publishing density",
                "Schedule gaps and clustering risk",
              ]}
            />
            <p className="font-semibold text-slate-900">Planning use cases</p>
            <BulletList
              items={[
                "Spread publishes for steadier cadence",
                "Coordinate social promotion timing with blog publishes",
                "Detect under-filled weeks and add planned content",
              ]}
            />
            <p className="font-semibold text-slate-900">Calendar best practices</p>
            <BulletList
              items={[
                "Assign dates early (tentative is acceptable)",
                "Update dates immediately when plans move",
                "Keep titles concise for scanability",
                "Use table/detail view for heavy editing",
              ]}
            />
          </Section>

          <Section id="editing-updating" title="11. Editing and Updating Content Entries">
            <p>
              Records are expected to evolve over time. Update them frequently to keep team context
              accurate.
            </p>
            <p className="font-semibold text-slate-900">Common updates</p>
            <BulletList
              items={[
                "Adjust publish date when schedules change",
                "Add final blog URL immediately after publish",
                "Correct title/metadata as editorial changes occur",
                "Link social posts to related blogs",
              ]}
            />
            <p className="font-semibold text-slate-900">Opening an entry</p>
            <p>Open Blogs or Social Posts table, click the row, and edit fields in detail panel.</p>
          </Section>

          <Section id="common-mistakes" title="12. Common Mistakes to Avoid">
            <BulletList
              items={[
                "Creating duplicate blog entries",
                "Forgetting final blog URL after publish",
                "Leaving workflow status stale after work progresses",
                "Not linking social posts to promoted blogs",
              ]}
            />
          </Section>

          <Section id="daily-workflow-writer" title="13. Daily Workflow (Writer)">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Open My Tasks and review assigned blogs with upcoming deadlines.</li>
              <li>Start writing; set status to Writing.</li>
              <li>When draft is complete, share with publisher.</li>
              <li>Update status to Ready for Publishing.</li>
            </ol>
            <p>Optional: update title/date and leave contextual notes for publisher.</p>
          </Section>

          <Section id="daily-workflow-publisher" title="14. Daily Workflow (Publisher)">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Filter Blogs by Ready for Publishing.</li>
              <li>Review draft and format in CMS (headings, images, metadata, links).</li>
              <li>Publish and copy final URL.</li>
              <li>Update blog entry with URL and set status to Published.</li>
            </ol>
          </Section>

          <Section id="troubleshooting" title="15. Troubleshooting">
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Cannot find a blog entry</p>
              <BulletList
                items={[
                  "Search by title",
                  "Check filters",
                  "Verify site selection (Sighthound/Redactor)",
                ]}
              />
              <p className="font-semibold text-slate-900">Calendar item not appearing</p>
              <BulletList
                items={[
                  "Ensure publish date is set",
                  "Ensure correct content toggle is enabled",
                  "Ensure entry changes were saved",
                ]}
              />
              <p className="font-semibold text-slate-900">Search returns nothing</p>
              <BulletList
                items={[
                  "Check spelling",
                  "Try partial words",
                  "Remove restrictive filters",
                ]}
              />
            </div>
          </Section>

          <Section id="feature-reference" title="16. Feature Reference">
            <p className="font-semibold text-slate-900">Blog Tracking</p>
            <p>
              End-to-end blog lifecycle tracking with title, owner assignments, status, date, and
              live URL.
            </p>
            <p className="font-semibold text-slate-900">Social Post Management</p>
            <p>
              Social planning and publication history with post type, Canva assets, platform links,
              and optional related blog.
            </p>
            <p className="font-semibold text-slate-900">Calendar Scheduling</p>
            <p>
              Unified timeline across blogs and social with content-type toggles and quick planning
              visibility.
            </p>
            <p className="font-semibold text-slate-900">Task Assignments</p>
            <p>Role-specific queueing in My Tasks for daily writer/publisher operations.</p>
            <p className="font-semibold text-slate-900">Content Linking</p>
            <p>Related Blog links connect promotional social assets back to source content.</p>
          </Section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
