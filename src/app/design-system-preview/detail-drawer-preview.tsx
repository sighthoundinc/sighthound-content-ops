"use client";

/**
 * Client-side wrapper for the Phase 3.5 DetailDrawer snapshot.
 *
 * `DetailDrawerHeader` is a Client Component that requires an `onClose`
 * function prop. The parent /design-system-preview route is a Server
 * Component (it exports `metadata`), so function props can't cross that
 * boundary. Extracting the snapshot here keeps the handler on the client.
 */

import { Button } from "@/components/button";
import {
  DetailDrawerBody,
  DetailDrawerField,
  DetailDrawerFooter,
  DetailDrawerHeader,
  DetailDrawerQuickAction,
  DetailDrawerSection,
} from "@/components/detail-drawer";

export function DetailDrawerPreview() {
  return (
    <div className="max-w-md overflow-hidden rounded-lg border border-[color:var(--sh-gray-200)] bg-surface shadow-brand-lg">
      <DetailDrawerHeader
        label="Details"
        title="Cut costs by 93%"
        subtitle="Blog post scheduled for April 22"
        onClose={() => {}}
      />
      <DetailDrawerBody className="flex flex-col gap-3">
        <DetailDrawerSection title="Brief" itemCount={3}>
          <div className="grid gap-3">
            <DetailDrawerField label="Writer" value="Hari Ajmal" />
            <DetailDrawerField label="Publisher" value="Ali Sohail" />
            <DetailDrawerField
              label="Scheduled publish"
              value="Apr 22, 2026"
            />
          </div>
        </DetailDrawerSection>
        <DetailDrawerSection title="Links" collapsible>
          <div className="grid gap-2">
            <DetailDrawerQuickAction
              label="Open Google Doc"
              href="https://docs.google.com/"
            />
            <DetailDrawerQuickAction
              label="Open Live URL"
              href="https://www.sighthound.com/blog/"
            />
            <DetailDrawerQuickAction
              label="Open Redactor doc"
              disabled
              disabledReason="Requires admin permission"
            />
          </div>
        </DetailDrawerSection>
      </DetailDrawerBody>
      <DetailDrawerFooter>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-navy-500">Updated 2m ago</span>
          <Button variant="primary" size="sm">
            Save
          </Button>
        </div>
      </DetailDrawerFooter>
    </div>
  );
}
