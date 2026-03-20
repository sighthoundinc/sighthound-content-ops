-- Relax the constraint that required google_doc_url for completed writer status
-- This allows imported/historical blogs (which have live URLs but no Google Docs)
-- to be marked as completed. Users will be warned in UI to add Google Doc links
-- but can defer this action until later.

alter table public.blogs
  drop constraint if exists blogs_writer_complete_requires_google_doc_url;

-- Note: The publisher_complete constraint remains unchanged as it only requires
-- live_url, which imported blogs always have
