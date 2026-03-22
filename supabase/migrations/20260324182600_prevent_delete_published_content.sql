-- Migration: Add RLS policies to prevent deletion of published content
-- Purpose: Defense-in-depth protection at database level
-- Date: 2026-03-24

-- Prevent deletion of published social posts
CREATE POLICY prevent_delete_published_social_posts
ON public.social_posts
FOR DELETE
USING (status != 'published');

COMMENT ON POLICY prevent_delete_published_social_posts ON public.social_posts
IS 'Prevent deletion of published social posts at the database level. Published posts (status = "published") cannot be deleted.';

-- Prevent deletion of published blogs
CREATE POLICY prevent_delete_published_blogs
ON public.blogs
FOR DELETE
USING (publisher_status != 'completed');

COMMENT ON POLICY prevent_delete_published_blogs ON public.blogs
IS 'Prevent deletion of published blogs at the database level. Published blogs (publisher_status = "completed") cannot be deleted.';
