# API authorization not validated - frontend permission checks may be insufficient

**Module**: Global
**Rule violated**: Permissions Enforcement (MUST)
**Priority**: High

## What happened
While UI hides buttons based on permissions, backend API authorization may not be enforced consistently. Some endpoints may lack RLS policies or proper permission checks.

## Expected behavior
Per Permissions Enforcement rule: RLS is source of truth. Every mutation endpoint must have RLS policy + API validation, not just UI button hiding.

## Steps to reproduce
   1. As Writer, with export_csv permission disabled
   2. Click Export button (should be hidden)
   3. If button somehow triggered via dev tools/API direct call, backend must reject

## Impact
Security risk - UI-only permission checks insufficient

## Additional context
Requires comprehensive RLS audit of all tables + API endpoint validation
