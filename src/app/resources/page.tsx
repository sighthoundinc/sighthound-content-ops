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
    <section
      id={id}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5"
    >
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3 text-sm text-slate-700">{children}</div>
    </section>
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
        <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
          <DataPageHeader
            title="User Manual"
            description="Simple, stage-based guide for how content moves, who acts next, and what is required at each handoff."
          />

          <Section id="quick-nav" title="Quick navigation">
            <p>Jump to any section directly:</p>
            <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <li>
                <a href="#what-this-app-does" className="font-medium text-sky-700 underline underline-offset-2">
                  1) What this app does
                </a>
              </li>
              <li>
                <a href="#key-concepts" className="font-medium text-sky-700 underline underline-offset-2">
                  2) Key concepts and ownership
                </a>
              </li>
              <li>
                <a href="#social-pipeline" className="font-medium text-sky-700 underline underline-offset-2">
                  3) Social post pipeline
                </a>
              </li>
              <li>
                <a href="#blog-pipeline" className="font-medium text-sky-700 underline underline-offset-2">
                  4) Blog pipeline
                </a>
              </li>
              <li>
                <a href="#daily-rhythm" className="font-medium text-sky-700 underline underline-offset-2">
                  5) Daily execution rhythm
                </a>
              </li>
              <li>
                <a href="#tools" className="font-medium text-sky-700 underline underline-offset-2">
                  6) Visibility tools
                </a>
              </li>
              <li>
                <a href="#gates" className="font-medium text-sky-700 underline underline-offset-2">
                  7) Transition gates
                </a>
              </li>
              <li>
                <a href="#sop-card" className="font-medium text-sky-700 underline underline-offset-2">
                  8) SOP card
                </a>
              </li>
              <li>
                <a href="#associated-content" className="font-medium text-sky-700 underline underline-offset-2">
                  9) Associated Content navigation
                </a>
              </li>
            </ul>
          </Section>

          <Section id="what-this-app-does" title="1) What this app does">
            <p>
              Content Relay is a stage-based workflow app for moving content from intake to
              published output with clear ownership and required-field gates.
            </p>
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <table className="min-w-[640px] border-collapse text-left text-sm sm:min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-900">
                    <th className="whitespace-nowrap py-2 pr-3 font-semibold sm:pr-4">Track</th>
                    <th className="py-2 pr-3 font-semibold sm:pr-4">What it manages</th>
                    <th className="py-2 font-semibold">End state</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Blogs</td>
                    <td className="py-2 pr-3 sm:pr-4">Editorial writing and publishing flow</td>
                    <td className="py-2">Published blog</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Social Posts</td>
                    <td className="py-2 pr-3 sm:pr-4">Creative, review, publishing, and live-link proof</td>
                    <td className="py-2">Published post with valid live link</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Open work in <InternalPageLink href="/tasks">My Tasks</InternalPageLink>, monitor queues in{" "}
              <InternalPageLink href="/dashboard">Dashboard</InternalPageLink>, and plan timing in{" "}
              <InternalPageLink href="/calendar">Calendar</InternalPageLink>.
            </p>
          </Section>

          <Section id="key-concepts" title="2) Key concepts and ownership">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-slate-900">Stage:</span> the current status in the
                workflow.
              </li>
              <li>
                <span className="font-medium text-slate-900">Gate:</span> required fields or conditions
                before a transition is allowed.
              </li>
              <li>
                <span className="font-medium text-slate-900">Handoff:</span> ownership change from one
                actor to another.
              </li>
              <li>
                <span className="font-medium text-slate-900">Terminal stage:</span> done; no further
                action required.
              </li>
            </ul>
            <p className="font-medium text-slate-900">Ownership rule of thumb</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Work stage = execution owner acts</li>
              <li>Review stage = reviewer acts</li>
              <li>Terminal stage = complete</li>
            </ul>
          </Section>

          <Section id="social-pipeline" title="3) Social post pipeline">
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <table className="min-w-[760px] border-collapse text-left text-sm sm:min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-900">
                    <th className="whitespace-nowrap py-2 pr-3 font-semibold sm:pr-4">Status</th>
                    <th className="whitespace-nowrap py-2 pr-3 font-semibold sm:pr-4">Owner</th>
                    <th className="py-2 font-semibold">Required action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Draft</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Creator/Worker</td>
                    <td className="py-2">Complete essentials and submit for review</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">In Review</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Reviewer</td>
                    <td className="py-2">Approve or request changes</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Changes Requested</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Creator/Worker</td>
                    <td className="py-2">Apply changes and resubmit</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Creative Approved</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Reviewer</td>
                    <td className="py-2">Confirm handoff to execution</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Ready to Publish</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Creator/Worker</td>
                    <td className="py-2">Publish the post</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Awaiting Live Link</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Creator/Worker</td>
                    <td className="py-2">Submit at least one public live link</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Published</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Terminal</td>
                    <td className="py-2">Done</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="font-medium text-slate-900">Mandatory gates</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>`Draft → In Review`: Product, Type, Canva URL</li>
              <li>
                Later execution transitions: Product, Type, Canva URL, Platforms, Caption, Scheduled
                Publish Date
              </li>
              <li>`Awaiting Live Link → Published`: at least one valid public live link</li>
              <li>
                Rollback from execution stages to `Changes Requested` requires a non-empty reason
              </li>
            </ul>
            <p className="font-medium text-slate-900">
              Flow: Draft → In Review → (Changes Requested ↔ In Review) → Creative Approved → Ready to
              Publish → Awaiting Live Link → Published
            </p>
            <p>
              Work from <InternalPageLink href="/social-posts">Social Posts</InternalPageLink> and use{" "}
              <InternalPageLink href="/tasks">My Tasks</InternalPageLink> for assignment-based priority.
            </p>
          </Section>

          <Section id="blog-pipeline" title="4) Blog pipeline">
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <table className="min-w-[760px] border-collapse text-left text-sm sm:min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-900">
                    <th className="whitespace-nowrap py-2 pr-3 font-semibold sm:pr-4">Stage</th>
                    <th className="whitespace-nowrap py-2 pr-3 font-semibold sm:pr-4">Owner</th>
                    <th className="py-2 font-semibold">Required action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Writing stages</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Assigned writing owner</td>
                    <td className="py-2">Draft and refine content</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Writing Approved</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Handoff point</td>
                    <td className="py-2">Transfer execution to publishing flow</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Publishing in Progress</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Assigned publishing owner</td>
                    <td className="py-2">Prepare and execute publish steps</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Awaiting Publishing Approval</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Reviewer checkpoint</td>
                    <td className="py-2">Validate readiness before final completion</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Publishing Approved</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Assigned publishing owner</td>
                    <td className="py-2">Complete final publication action</td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Published</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Terminal</td>
                    <td className="py-2">Done</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Use <InternalPageLink href="/blogs">Blogs</InternalPageLink> for record-level workflow and{" "}
              <InternalPageLink href="/tasks">My Tasks</InternalPageLink> to execute owned stages.
            </p>
          </Section>

          <Section id="daily-rhythm" title="5) Daily execution rhythm">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open <InternalPageLink href="/tasks">My Tasks</InternalPageLink>
              </li>
              <li>Work `Required by me` first</li>
              <li>Confirm required fields/checklist</li>
              <li>Transition status when gate is satisfied</li>
              <li>Track dependencies in `Waiting on Others`</li>
            </ol>
            <p>
              “Explicit updates” means transitions reflect true state, rollback reasons are included
              when sending work back, and publish proof is attached before completion.
            </p>
          </Section>

          <Section id="tools" title="6) Visibility tools">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <InternalPageLink href="/tasks">My Tasks</InternalPageLink>: what needs your action
                now
              </li>
              <li>
                <InternalPageLink href="/dashboard">Dashboard</InternalPageLink>: cross-content queue
                health
              </li>
              <li>
                Dashboard overview and snapshot insights are tuned for speed and clarity, with
                smooth background refresh to keep the experience responsive while you navigate.
              </li>
              <li>
                Dashboard filtering: start with <span className="font-medium">Lens</span>, then use
                default filters (`Content Type`, `Status`, `Assigned to`, `Site`), and open{" "}
                <span className="font-medium">More filters</span> only for advanced blog/social
                filters.
              </li>
              <li>
                Filter options show contextual counts, and <span className="font-medium">Lens shortcuts</span>{" "}
                let you save frequently used lens views for one-click reuse.
              </li>
              <li>
                <InternalPageLink href="/calendar">Calendar</InternalPageLink>: scheduled workload and
                timing
              </li>
              <li>
                <InternalPageLink href="/settings">Settings</InternalPageLink>: personal preferences,
                notifications, connectors
              </li>
            </ul>
          </Section>

          <Section id="gates" title="7) Transition gates (quick reference)">
            <ul className="list-disc space-y-1 pl-5">
              <li>Do not transition unless required target-stage fields are complete</li>
              <li>Do not publish social content without a valid saved live link</li>
              <li>Do not rollback execution-stage social work without a reason</li>
              <li>Do not finalize blog publishing before writing handoff and review checkpoint</li>
            </ul>
          </Section>

          <Section id="sop-card" title="8) SOP card">
            <p className="font-medium text-slate-900">One-screen daily SOP</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open <InternalPageLink href="/tasks">My Tasks</InternalPageLink>
              </li>
              <li>Execute `Required by me`</li>
              <li>Validate transition gates</li>
              <li>Move stage forward</li>
              <li>Confirm handoff or wait-state</li>
            </ol>
          </Section>

          <Section id="associated-content" title="9) Associated Content navigation">
            <p className="font-medium text-slate-900">Navigate between linked blogs and social posts</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-slate-900">Dashboard:</span> Click the &quot;Associated Content&quot; badge
                on any row to navigate between blogs and their linked social posts. Blog rows show a count badge;
                social rows show the associated blog title.
              </li>
              <li>
                <span className="font-medium text-slate-900">Blog detail drawer:</span> Open the &quot;Associated Social Posts&quot;
                section to see all social posts linked to that blog. Click any post title to open its full editor.
              </li>
              <li>
                <span className="font-medium text-slate-900">Social post editor:</span> View the &quot;Associated Blog&quot;
                context card (before Comments) to see the linked blog&apos;s workflow status, scheduled dates, and quick
                links to draft doc and live blog.
              </li>
              <li>
                <span className="font-medium text-slate-900">Social posts list filter:</span> Use the &quot;Associated Blog&quot;
                dropdown to filter social posts by linked blog. Combine with Status filter for precise triage.
              </li>
              <li>
                <span className="font-medium text-slate-900">Deep linking:</span> URL params are preserved:
                `?associated_blog=&#123;blogId&#125;` for filtered social posts, `?filter=&#123;blogId&#125;` for filtered blogs.
              </li>
            </ul>
          </Section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
