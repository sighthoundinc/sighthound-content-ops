# Canva URL field accepts invalid URLs without validation

**Module**: Social Posts
**Rule violated**: Forms & Input Behavior (MUST)
**Priority**: High

## What happened
Setup step has Canva URL field that accepts any text value without URL format validation. Invalid URLs (e.g., 'hello', '123', non-HTTP URLs) are accepted and saved.

## Expected behavior
Per Forms & Input Behavior rule: Form must validate inputs and show clear error if invalid. URL field should validate format before allowing progression (must be valid http/https URL and ideally Canva domain).

## Steps to reproduce
   1. Create social post
   2. In Canva URL field, paste 'not-a-url'
   3. Proceed to next step
   4. No error appears, invalid URL saved

## Impact
Invalid data in workflow, downstream errors when trying to access link

## Additional context
Should validate URL format and ideally confirm it's actually Canva domain
