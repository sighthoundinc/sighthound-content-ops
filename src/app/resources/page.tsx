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

          <Section id="what-this-app-is" title="1. What this app is">
            <p>This app is your content operations workspace for blogs and social posts.</p>
            <BulletList
              items={[
                "Track writing and publishing progress in one place.",
                "Manage assignments and role-based ownership.",
                "Coordinate social production and live-link completion.",
                "Keep a clear, auditable workflow history.",
                "Receive notifications for assignments, status changes, and mentions.",
              ]}
            />
            <p className="font-medium text-slate-900">
              It does not replace your writing tools or publish directly to external platforms.
            </p>
          </Section>

          <Section id="access-entry-flow" title="1.5 Access and entry flow">
            <p className="font-semibold text-slate-900">Sign-in options:</p>
            <BulletList
              items={[
                "Continue with Slack (Sighthound Slack workspace)",
                "Continue with Google (@sighthound.com email required)",
                "Email/password (admin-managed accounts)",
              ]}
            />
            <p className="font-semibold text-slate-900">Connected Services:</p>
            <BulletList
              items={[
                "Settings page shows Google and Slack connection status (green = connected, grey = not connected)",
                "System remembers all OAuth providers you've used across sessions",
                "Helps you understand which authentication methods are available",
              ]}
            />
            <p>After signing in, you&apos;ll be routed to the workspace home page.</p>
          </Section>

          <Section id="daily-standup" title="1.6 Daily Standup Home Page">
            <p className="font-semibold text-slate-900">Warm welcome on login:</p>
            <BulletList
              items={[
                "Friendly loading message while dashboard prepares (e.g., &apos;Preparing your standup...&apos;)",
                "Random message shown each session with Welcome back.",
                "Tasks and statuses appear immediately without delay",
              ]}
            />
            <p className="font-semibold text-slate-900">What you&apos;ll see:</p>
            <BulletList
              items={[
                "Top-left: greeting with your name",
                "Top-right: your role(s) badge",
                "Main section: actionable work buckets showing only items assigned to you",
                "High-priority items (revisions, awaiting approval) highlighted in red",
              ]}
            />
            <p className="font-semibold text-slate-900">Behavior:</p>
            <BulletList
              items={[
                "Click any bucket to navigate to My Tasks with that filter pre-applied",
                "Filters auto-clear after navigation",
                "Bottom buttons: Go to Dashboard and View Calendar for quick context switching",
              ]}
            />
          </Section>

          <Section id="my-profile" title="1.7 My Profile: personal preferences">
            <p>Settings → My Profile lets you update:</p>
            <BulletList
              items={[
                "First name, last name, and display name",
                "Personal timezone (default: US Eastern)",
                "Week start day (Monday or Sunday)",
                "Stale draft threshold (days before drafts are flagged)",
              ]}
            />
          </Section>

          <Section id="notification-preferences" title="1.8 Notification Preferences">
            <p>Control which notifications you receive:</p>
            <p className="font-semibold text-slate-900">Location:</p>
            <p>Settings → Notification Preferences</p>
            <p className="font-semibold text-slate-900">Global toggle:</p>
            <p>Enable/Disable all notifications with one switch</p>
            <p className="font-semibold text-slate-900">Individual notification types:</p>
            <BulletList
              items={[
                "Task Assigned — when you're assigned a blog or social post",
                "Stage Changed — when content moves through workflow stages",
                "Submitted for Review — when someone submits content for your review",
                "Published — when content is published",
                "Awaiting Action — when content needs your attention",
                "Mention — when someone mentions you in a comment",
              ]}
            />
            <p className="font-semibold text-slate-900">Slack delivery (optional):</p>
            <BulletList
              items={[
                "Enable Slack notifications to receive messages in your Slack workspace",
                "Notifications are also sent as direct messages when relevant",
                "Disabling a notification type affects both in-app and Slack notifications",
              ]}
            />
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
            <p className="font-semibold text-slate-900">Dashboard sidebar:</p>
            <BulletList
              items={[
                "The dashboard left sidebar is intentionally clean.",
                "Quick filter groups are not shown in the dashboard sidebar.",
                "The Recently Published section is not shown in the dashboard sidebar.",
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
            <p className="font-semibold text-slate-900">Important rules:</p>
            <BulletList
              items={[
                "Social editors can collaborate on the same post at the same time.",
                "Execution stages (Ready to Publish, Awaiting Live Link) lock brief fields as read-only.",
                "Admins can use Edit Brief to reopen an execution-stage post back to Creative Approved.",
                "Sending back to Changes Requested from execution stages requires a reason.",
                "At least one public live link (LinkedIn, Facebook, or Instagram) is required before completion.",
                "If live link is missing, keep status at Awaiting Live Link.",
              ]}
            />
            <p className="font-semibold text-slate-900">Notifications for social posts:</p>
            <BulletList
              items={[
                "Status transitions send notifications to relevant team members",
                "Assignment changes (editor/admin reassigned) send notifications when implemented",
                "Slack integration posts to configured channel and DMs relevant users",
                "Control which notifications you receive in Settings → Notification Preferences",
              ]}
            />
            <p className="font-semibold text-slate-900">My Tasks integration:</p>
            <BulletList
              items={[
                "Social status filter available directly in My Tasks",
                "Clicking social work buckets from workspace home pre-applies matching filters",
              ]}
            />
          </Section>

          <Section id="shortcuts-quick-create" title="10. Keyboard shortcuts and quick create">
            <p className="font-semibold text-slate-900">Shortcut display:</p>
            <BulletList
              items={[
                "Shortcuts shown as clickable 'Shortcut' text that opens a modal with key combinations",
                "Shortcut hints shown in major action dropdowns (Dashboard, Add New Idea, New Blog, New Social Post)",
                "Avoid using system-sensitive shortcuts (Ctrl+C, etc.) for app-defined actions",
              ]}
            />
            <p className="font-semibold text-slate-900">Navigation shortcuts:</p>
            <BulletList
              items={[
                "⌘K (Mac) or Ctrl+K (Windows) — Open command palette",
                "Esc — Close modals and dropdowns",
              ]}
            />
            <p className="font-semibold text-slate-900">Quick Create shortcuts:</p>
            <BulletList
              items={[
                "↑ / ↓ — Move through options",
                "Enter — Select current option",
                "Esc — Close without selecting",
                "Active option has strong visible focus state",
              ]}
            />
            <p className="font-semibold text-slate-900">Table shortcuts:</p>
            <BulletList
              items={[
                "Click column headers to sort (click again to reverse)",
                "↕ shows unsorted, ↑ shows ascending, ↓ shows descending",
              ]}
            />
          </Section>

          <Section id="feedback-validation-errors" title="11. Feedback, validation, and errors">
            <p className="font-semibold text-slate-900">System behavior standards:</p>
            <BulletList
              items={[
                "Every action should show explicit loading, success, or error feedback",
                "Validation errors appear near affected fields",
                "Errors are human-readable and actionable (what went wrong + how to fix)",
                "Failed actions should never leave partial silent updates",
                "Permission errors should clearly indicate access limitations",
              ]}
            />
            <p className="font-semibold text-slate-900">Visual feedback:</p>
            <BulletList
              items={[
                "Success actions show confirmation in bottom-left corner",
                "Loading states show progress indicators",
                "Copy actions in Quick Actions show visual confirmation (look for 'Copied' indicator)",
              ]}
            />
            <p className="font-semibold text-slate-900">Table updates:</p>
            <BulletList
              items={[
                "'Updating results...' appears below pagination during sorts/filters",
                "This prevents table jumping and keeps layout stable",
              ]}
            />
            <p className="font-semibold text-slate-900">Error types:</p>
            <BulletList
              items={[
                "Validation errors — fix input and retry",
                "Permission errors — check role/access",
                "System errors — retry, then report if persistent",
              ]}
            />
          </Section>

          <Section id="activity-history" title="12. Activity History (admin only)">
            <p className="font-semibold text-slate-900">Admin-only feature:</p>
            <p>Settings → Activity History</p>
            <p className="font-semibold text-slate-900">What it shows:</p>
            <BulletList
              items={[
                "All login and dashboard activity",
                "Blog workflow changes (status transitions, assignment changes)",
                "Social post workflow changes (status transitions, assignment changes)",
              ]}
            />
            <p className="font-semibold text-slate-900">How to filter:</p>
            <BulletList
              items={[
                "Activity Type: use checkboxes to select/unselect (multi-select)",
                "User: use checkboxes to select/unselect specific users (multi-select)",
                "Apply Filters: click Save to apply your selections",
              ]}
            />
            <p className="font-semibold text-slate-900">Filter behavior:</p>
            <BulletList
              items={[
                "Multiple activity types combined with OR (shows any selected type)",
                "Multiple users combined with OR (shows any selected user)",
                "Activity types AND users combined with AND (must match both)",
              ]}
            />
            <p className="font-semibold text-slate-900">Table columns:</p>
            <BulletList
              items={[
                "Category (Login/Dashboard/Blog Activity/Social Post Activity)",
                "Action (what happened)",
                "Content (blog/post title, or &apos;—&apos; for access logs)",
                "User (who performed the action)",
                "Email (user's email)",
                "Timestamp (when it happened, in your timezone)",
              ]}
            />
            <p className="font-semibold text-slate-900">Content links:</p>
            <BulletList
              items={[
                "Blog activities link to blog detail page",
                "Social post activities link to social post editor",
                "Click any content title to view the full record",
              ]}
            />
          </Section>

          <Section id="notification-bell" title="12.5 Notification Bell (all users)">
            <p className="font-semibold text-slate-900">Location:</p>
            <p>Bell icon in top-right corner</p>
            <p className="font-semibold text-slate-900">What you&apos;ll see:</p>
            <BulletList
              items={[
                "Real-time notifications: Task assignments, status changes, mentions",
                "Recent activity: Latest workflow events across blogs and social posts",
                "Unread count: Badge shows how many new notifications you have",
              ]}
            />
            <p className="font-semibold text-slate-900">Click behavior:</p>
            <BulletList
              items={[
                "Click bell to open notification drawer",
                "Click any notification to navigate to relevant content",
                "Click &apos;View History&apos; to see full Activity History (admins only)",
                "Click 'Clear All' to dismiss visible notifications",
              ]}
            />
            <p className="font-semibold text-slate-900">Notification types:</p>
            <BulletList
              items={[
                "Task Assigned — you're now responsible for a blog or social post",
                "Stage Changed — content moved to a new workflow stage",
                "Submitted for Review — someone needs your review",
                "Published — content went live",
                "Awaiting Action — something needs your attention",
                "Mention — someone mentioned you in a comment",
              ]}
            />
          </Section>

          <Section id="settings-organization" title="13. Settings page organization">
            <p>Settings is organized into clear sections:</p>
            <p className="font-semibold text-slate-900">My Profile:</p>
            <BulletList
              items={[
                "Update first name, last name, and display name",
                "Set your personal timezone",
                "Configure week start day (Monday or Sunday)",
                "Set stale draft threshold (days before drafts are flagged)",
              ]}
            />
            <p className="font-semibold text-slate-900">Connected Services:</p>
            <BulletList
              items={[
                "View Google and Slack connection status",
                "Shows which OAuth providers you've used to sign in",
                "Helps you track available authentication methods",
              ]}
            />
            <p className="font-semibold text-slate-900">Notification Preferences:</p>
            <BulletList
              items={[
                "Enable/disable all notifications",
                "Toggle individual notification types",
                "Configure Slack delivery preferences",
              ]}
            />
            <p className="font-semibold text-slate-900">Workspace Defaults:</p>
            <BulletList items={["System-wide defaults (admin-configurable)"]} />
            <p className="font-semibold text-slate-900">Access & Oversight (admin-only):</p>
            <BulletList
              items={[
                "Permissions panel entry",
                "Quick View — switch into non-admin user context for troubleshooting",
              ]}
            />
            <p className="font-semibold text-slate-900">Team Administration (admin-only):</p>
            <BulletList
              items={[
                "Create User Account",
                "Reassign User Work",
                "User Directory with role/status filters",
              ]}
            />
            <p className="font-semibold text-slate-900">System Maintenance (admin-only):</p>
            <BulletList
              items={[
                "Activity History Cleanup — remove test data or old records",
                "Danger Zone: Wipe App Clean — factory reset (destructive)",
              ]}
            />
            <p className="font-semibold text-slate-900 mt-4">Important permissions note:</p>
            <BulletList
              items={[
                "Only admins can run Wipe App Clean",
                "Reset keeps the initiating admin account but clears operational data",
                "The initiating admin's own content and activity records are also wiped",
              ]}
            />
          </Section>

          <Section id="interaction-consistency" title="14. Interaction consistency expectations">
            <BulletList
              items={[
                "Dropdowns and modals close when focus is lost (click outside)",
                "Copy actions in Quick Actions trigger a global visual confirmation",
                "Table layouts stay stable during sorting, filtering, and pagination updates",
                "Report any missing or inconsistent behavior as a bug",
              ]}
            />
          </Section>

          <Section id="password-reset" title="15. Password reset (test-only)">
            <p className="font-semibold text-slate-900">Note:</p>
            <p>This feature is temporary and for testing purposes only. It will be removed before production deployment.</p>
            <p className="font-semibold text-slate-900">How to reset a password:</p>
            <BulletList
              items={[
                "Open Settings → User Directory",
                "Click 'Edit' on any user",
                "Scroll to 'Reset Password (Test Only)' section",
                "Enter a new password (minimum 8 characters)",
                "Click 'Reset Password' and confirm",
              ]}
            />
            <p>The user can then log in with their new password. Intended for testing and administrative purposes only.</p>
          </Section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
