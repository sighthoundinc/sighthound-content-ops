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
            description="A friendly walkthrough of how work moves through Content Relay — who acts next, what each stage expects, and where to go when you get stuck."
          />

          <Section id="quick-nav" title="Quick navigation">
            <p>Not sure where to start? Jump straight to the part you need:</p>
            <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <li>
                <InternalPageLink href="#what-this-app-does">1) What this app does</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#key-concepts">2) Key concepts and ownership</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#social-pipeline">3) Social post pipeline</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#blog-pipeline">4) Blog pipeline</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#daily-rhythm">5) Daily execution rhythm</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#tools">6) Visibility tools</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#gates">7) Transition gates</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#sop-card">8) SOP card</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#associated-content">9) Associated Content navigation</InternalPageLink>
              </li>
              <li>
                <InternalPageLink href="#inbox">10) Inbox</InternalPageLink>
              </li>
            </ul>
          </Section>

          <Section id="what-this-app-does" title="1) What this app does">
            <p>
              Content Relay is your shared home for moving content from rough idea to published
              post. It keeps two tracks tidy — Blogs and Social Posts — so everyone knows what stage
              a piece is in, who owns the next step, and what needs to happen before it can move
              forward.
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
              A typical day looks like this: pick up what’s yours in{" "}
              <InternalPageLink href="/tasks">My Tasks</InternalPageLink>, keep an eye on the bigger
              picture in <InternalPageLink href="/dashboard">Dashboard</InternalPageLink>, and plan
              timing in <InternalPageLink href="/calendar">Calendar</InternalPageLink>.
            </p>
          </Section>

          <Section id="key-concepts" title="2) Key concepts and ownership">
            <p>
              A few short definitions will make the rest of this manual click.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-slate-900">Stage:</span> where a piece of content
                currently sits in its workflow.
              </li>
              <li>
                <span className="font-medium text-slate-900">Gate:</span> the small set of things
                that must be true before the work can move to the next stage.
              </li>
              <li>
                <span className="font-medium text-slate-900">Handoff:</span> the moment ownership
                passes from one person to the next.
              </li>
              <li>
                <span className="font-medium text-slate-900">Terminal stage:</span> the work is done
                — nothing else is expected.
              </li>
            </ul>
            <p className="font-medium text-slate-900">Who acts when</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>If it’s a work stage, the person assigned to do the work acts next.</li>
              <li>If it’s a review stage, the reviewer acts next.</li>
              <li>If it’s a terminal stage, you’re done — enjoy the win.</li>
            </ul>
          </Section>

          <Section id="social-pipeline" title="3) Social post pipeline">
            <p>
              Social posts move through seven stages. Creators draft and publish, reviewers approve
              the creative, and the final stage only closes once a real live link is saved so we
              always have proof of the post.
            </p>
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
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Assigned to</td>
                    <td className="py-2">Complete essentials and submit for review</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">In Review</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Reviewer</td>
                    <td className="py-2">Approve or request changes</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Changes Requested</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Assigned to</td>
                    <td className="py-2">Apply changes and resubmit</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Creative Approved</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Reviewer</td>
                    <td className="py-2">Confirm handoff to execution</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Ready to Publish</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Assigned to</td>
                    <td className="py-2">Publish the post</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Awaiting Live Link</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Assigned to</td>
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
            <p className="font-medium text-slate-900">What each transition expects</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Submitting a draft for review needs Product, Type, and a Canva URL.
              </li>
              <li>
                Moving into execution (Creative Approved and beyond) also needs Platforms, Caption,
                and the Scheduled Publish Date filled in.
              </li>
              <li>
                Marking a post as Published requires at least one valid public live link saved on
                the record.
              </li>
              <li>
                If you need to send work back from an execution stage, add a short reason so the
                next owner knows what to change.
              </li>
            </ul>
            <p className="font-medium text-slate-900">The happy path</p>
            <p>
              Draft → In Review → (Changes Requested ↔ In Review) → Creative Approved → Ready to
              Publish → Awaiting Live Link → Published.
            </p>
            <p>
              Work directly from <InternalPageLink href="/social-posts">Social Posts</InternalPageLink>,
              or let <InternalPageLink href="/tasks">My Tasks</InternalPageLink> surface whatever is
              assigned to you first.
            </p>
          </Section>

          <Section id="blog-pipeline" title="4) Blog pipeline">
            <p>
              Blogs follow a two-phase flow: the writing side shapes the content, and the publishing
              side takes it live. Each phase has its own review step so nothing ships without a second
              set of eyes.
            </p>
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
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Writing in Progress</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Writer</td>
                    <td className="py-2">Draft and refine content</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Awaiting Writing Review</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Reviewer</td>
                    <td className="py-2">Approve or send back for revision</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Writing Approved</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Handoff</td>
                    <td className="py-2">Transfer execution to publishing flow</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Publishing in Progress</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Publisher</td>
                    <td className="py-2">Prepare and execute publish steps</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Awaiting Publishing Review</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Reviewer</td>
                    <td className="py-2">Validate readiness before final completion</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Approved for Publishing</td>
                    <td className="whitespace-nowrap py-2 pr-3 sm:pr-4">Publisher</td>
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
              Open <InternalPageLink href="/blogs">Blogs</InternalPageLink> to work the full record,
              or lean on <InternalPageLink href="/tasks">My Tasks</InternalPageLink> when you just
              want to clear your plate.
            </p>
          </Section>

          <Section id="daily-rhythm" title="5) Daily execution rhythm">
            <p>
              A rhythm that works for most people:
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Start your day in <InternalPageLink href="/tasks">My Tasks</InternalPageLink>.
              </li>
              <li>Knock out everything in <span className="font-medium">Required by me</span> first.</li>
              <li>
                Before moving a piece forward, glance at the checklist to confirm the required
                fields are in.
              </li>
              <li>Move the status forward once the gate is green.</li>
              <li>
                Keep an eye on <span className="font-medium">Waiting on Others</span> so nothing
                quietly stalls.
              </li>
            </ol>
            <p>
              Keeping statuses honest, adding a quick reason when you send work back, and attaching
              proof before you publish is what keeps the whole pipeline trustworthy.
            </p>
          </Section>

          <Section id="tools" title="6) Visibility tools">
            <p>A quick tour of where to look for what:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <InternalPageLink href="/tasks">My Tasks</InternalPageLink> — the shortest answer to
                “what should I do right now?”
              </li>
              <li>
                <InternalPageLink href="/inbox">Inbox</InternalPageLink> — a single place to scan
                what’s required of you, what’s waiting on others, and recent activity across blogs
                and social posts.
              </li>
              <li>
                <InternalPageLink href="/dashboard">Dashboard</InternalPageLink> — the cross-content
                health view for triage and prioritization.
              </li>
              <li>
                Dashboard overview and snapshot insights refresh in the background, so the numbers
                stay fresh while you keep working.
              </li>
              <li>
                For dashboard filtering, start with <span className="font-medium">Lens</span>, tune
                with the default filters (<span className="font-medium">Content Type</span>,{" "}
                <span className="font-medium">Status</span>,{" "}
                <span className="font-medium">Assigned to</span>,{" "}
                <span className="font-medium">Site</span>), and open{" "}
                <span className="font-medium">More filters</span> only when you need advanced
                blog/social controls.
              </li>
              <li>
                Filter options show live counts, and{" "}
                <span className="font-medium">Lens shortcuts</span> let you save the views you use
                most for one-click reuse.
              </li>
              <li>
                <InternalPageLink href="/calendar">Calendar</InternalPageLink> — the place to plan
                timing and spot scheduling conflicts.
              </li>
              <li>
                <InternalPageLink href="/settings">Settings</InternalPageLink> — your profile,
                timezone, notifications, and connected services.
              </li>
            </ul>
          </Section>

          <Section id="gates" title="7) Transition gates (quick reference)">
            <p>A handful of rules keep the pipeline honest. Think of these as friendly guardrails:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Fill in the required fields before moving a stage forward.</li>
              <li>A social post can only be marked Published once a valid live link is saved.</li>
              <li>When you send a social post back, add a short reason so the next owner knows what to fix.</li>
              <li>Blog publishing can only finish after the writing handoff and review checkpoint are done.</li>
            </ul>
          </Section>

          <Section id="sop-card" title="8) SOP card">
            <p className="font-medium text-slate-900">Your one-screen daily routine</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open <InternalPageLink href="/tasks">My Tasks</InternalPageLink>.
              </li>
              <li>Work through <span className="font-medium">Required by me</span>.</li>
              <li>Double-check the transition gate before moving on.</li>
              <li>Advance the stage.</li>
              <li>Confirm the handoff or note what you’re waiting on.</li>
            </ol>
          </Section>

          <Section id="associated-content" title="9) Associated Content navigation">
            <p className="font-medium text-slate-900">Jumping between linked blogs and social posts</p>
            <p>
              A lot of social posts are promoting a specific blog. These shortcuts make moving
              between the two feel natural.
            </p>
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

          <Section id="inbox" title="10) Inbox">
            <p>
              <InternalPageLink href="/inbox">Inbox</InternalPageLink> is a focused view for quick
              triage across both tracks. It reads the same server queue as My Tasks and the
              dashboard snapshot, so counts stay aligned — nothing new is invented here.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-slate-900">Required</span> — work where you’re the
                current owner and an action is expected from you.
              </li>
              <li>
                <span className="font-medium text-slate-900">Waiting</span> — items where someone
                else owns the next action; use this tab when you’re chasing a handoff.
              </li>
              <li>
                <span className="font-medium text-slate-900">Activity</span> — the most recent
                status and assignment changes across blogs and social posts.
              </li>
            </ul>
            <p>
              Each row deep-links straight to the underlying blog or social post detail page.
              Archive and snooze aren’t available yet — items clear from a tab when their state
              changes.
            </p>
          </Section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
