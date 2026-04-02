-- Emergency fix: Add missing blog_event_type enum values
-- Required by the display_published_date constraint migration
-- These enum values are used for activity logging when display dates are overridden

ALTER TYPE public.blog_event_type ADD VALUE 'display_date_override';
ALTER TYPE public.blog_event_type ADD VALUE 'display_date_changed';
