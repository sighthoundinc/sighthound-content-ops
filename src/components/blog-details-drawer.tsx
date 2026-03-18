"use client";

import type { ReactNode } from "react";

import { buttonClass } from "@/components/button";
import {
  DetailDrawer,
  DetailDrawerBody,
  DetailDrawerField,
  DetailDrawerFooter,
  DetailDrawerHeader,
  DetailDrawerQuickAction,
  DetailDrawerSection,
} from "@/components/detail-drawer";
import type { BlogRecord } from "@/lib/types";

type BlogDrawerField = {
  label: string;
  value: ReactNode;
};

export function BlogDetailsDrawer({
  blog,
  isOpen,
  onClose,
  subtitle,
  siteBadge,
  statusBadges,
  overviewFields,
  workflowContent,
  datesContent,
  linksContent,
  commentsContent,
  timelineContent,
  commentsCount,
  timelineCount,
  canEdit = false,
  isEditMode = false,
  onToggleEditMode,
  footerContent,
}: {
  blog: BlogRecord | null;
  isOpen: boolean;
  onClose: () => void;
  subtitle?: string;
  siteBadge?: ReactNode;
  statusBadges?: ReactNode;
  overviewFields: BlogDrawerField[];
  workflowContent: ReactNode;
  datesContent: ReactNode;
  linksContent?: ReactNode;
  commentsContent?: ReactNode;
  timelineContent?: ReactNode;
  commentsCount?: number;
  timelineCount?: number;
  canEdit?: boolean;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  footerContent?: ReactNode;
}) {
  if (!blog) {
    return null;
  }

  const quickActionLinks = [
    {
      label: "Open Doc",
      href: blog.google_doc_url,
      disabled: !blog.google_doc_url,
      disabledReason: !blog.google_doc_url ? "No Google Doc linked yet" : undefined,
    },
    {
      label: "Open Live",
      href: blog.live_url,
      disabled: !blog.live_url,
      disabledReason: !blog.live_url ? "No live URL yet" : undefined,
    },
    {
      label: "Open Page",
      href: `/blogs/${blog.id}`,
      disabled: false,
      disabledReason: undefined,
    },
  ] as const;

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      drawerLabel="Blog details drawer"
      closeLabel="Close blog details"
    >
      <DetailDrawerHeader
        label="Details"
        title={blog.title}
        subtitle={subtitle}
        badges={
          <>
            {siteBadge}
            {statusBadges}
          </>
        }
        onClose={onClose}
      />
      <DetailDrawerBody className="space-y-4">
        <DetailDrawerSection title="Overview">
          <div className="grid gap-3 sm:grid-cols-2">
            {overviewFields.map((field) => (
              <DetailDrawerField
                key={field.label}
                label={field.label}
                value={field.value}
              />
            ))}
          </div>
        </DetailDrawerSection>
        <DetailDrawerSection title="Quick Actions">
          <div className="space-y-2">
            {quickActionLinks.map((action) => (
              <DetailDrawerQuickAction
                key={action.label}
                label={action.label}
                href={action.href}
                disabled={action.disabled}
                disabledReason={action.disabledReason}
              />
            ))}
          </div>
        </DetailDrawerSection>
        <DetailDrawerSection title="Workflow & Assignments">
          {workflowContent}
        </DetailDrawerSection>
        <DetailDrawerSection title="Dates">{datesContent}</DetailDrawerSection>
        {linksContent ? (
          <DetailDrawerSection title="Links (full)" collapsible defaultOpen={false}>
            {linksContent}
          </DetailDrawerSection>
        ) : null}
        {commentsContent ? (
          <DetailDrawerSection
            title="Comments"
            collapsible
            defaultOpen={false}
            itemCount={commentsCount}
          >
            {commentsContent}
          </DetailDrawerSection>
        ) : null}
        {timelineContent ? (
          <DetailDrawerSection
            title="Activity Timeline"
            collapsible
            defaultOpen={false}
            itemCount={timelineCount}
          >
            {timelineContent}
          </DetailDrawerSection>
        ) : null}
      </DetailDrawerBody>
      <DetailDrawerFooter>
        {footerContent ?? (
          <div className="flex items-center justify-end gap-2">
            {canEdit && onToggleEditMode ? (
              <button
                type="button"
                className={buttonClass({ variant: "secondary", size: "sm" })}
                onClick={onToggleEditMode}
              >
                {isEditMode ? "Done" : "Edit"}
              </button>
            ) : null}
            <button
              type="button"
              className={buttonClass({ variant: "secondary", size: "sm" })}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </DetailDrawerFooter>
    </DetailDrawer>
  );
}
