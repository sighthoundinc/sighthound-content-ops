# Bulk actions lack confirmation dialogs and preview

**Module**: Global
**Rule violated**: Data Mutation Safety (MUST)
**Priority**: High

## What happened
Bulk operations (reassign, status change, delete) execute with minimal confirmation. No preview of affected rows shown before execution.

## Expected behavior
Per Data Mutation Safety rule: Bulk actions must show preview/confirmation + provide success/failure breakdown per row.

## Steps to reproduce
   1. Select multiple rows on Dashboard
   2. Click bulk action
   3. Confirmation appears but without preview of what will change

## Impact
Accidental bulk mutations, difficult recovery, data loss risk

## Additional context
All bulk actions should show affected row count and option to review before executing
