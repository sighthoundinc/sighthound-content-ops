# Display Published Date Fallback Specification

## Overview
`display_published_date` must never be NULL. It defaults to `scheduled_publish_date` and supports intelligent fallback with activity logging.

## Database Schema Changes

### 1. Add NOT NULL Constraint with Default
```sql
-- Migration: Add NOT NULL constraint to blogs.display_published_date
ALTER TABLE public.blogs
  ADD CONSTRAINT display_published_date_not_null 
  CHECK (display_published_date IS NOT NULL);

-- Backfill existing rows with NULL display_published_date
UPDATE public.blogs
  SET display_published_date = COALESCE(scheduled_publish_date, CURRENT_DATE)
  WHERE display_published_date IS NULL;

-- Add column default for future inserts
ALTER TABLE public.blogs
  ALTER COLUMN display_published_date SET DEFAULT CURRENT_DATE;
```

### 2. Update Triggers for Fallback Logic

#### handle_blog_before_write() - INSERT path
```plpgsql
-- Add before INSERT logic:
if new.display_published_date is null then
  new.display_published_date := coalesce(new.scheduled_publish_date, current_date);
end if;
```

#### audit_blog_changes() - Track display_date changes
```plpgsql
-- Add after INSERT/UPDATE logic:
-- Only log if user EXPLICITLY set display_date different from scheduled_date (not default fallback)
if tg_op = 'INSERT' and new.display_published_date is distinct from new.scheduled_publish_date then
  insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, new_value)
  values (new.id, auth.uid(), 'display_date_override', 'display_published_date', new.display_published_date::text);
end if;

-- On UPDATE: log all display_date changes
if tg_op = 'UPDATE' and new.display_published_date is distinct from old.display_published_date then
  insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
  values (new.id, auth.uid(), 'display_date_changed', 'display_published_date', old.display_published_date::text, new.display_published_date::text);
end if;
```

## UI Behavior Rules

### Blog Creation Form
1. **Always send** `displayPublishDate` in payload (never NULL)
2. **Client-side fallback**: If form value is empty, use `scheduledPublishDate` before submission
3. **Validation**: Require at least `scheduledPublishDate` to be set before form submit

```typescript
// In handleSubmit():
const finalDisplayDate = displayPublishDate || scheduledPublishDate || today;
const payload = {
  // ... other fields ...
  scheduled_publish_date: scheduledPublishDate || null,
  display_published_date: finalDisplayDate, // Never NULL
  // ...
};
```

### Sync Checkbox Behavior
- Checkbox controls **sync mode**, not NULL handling
- When checked: display_date auto-updates when scheduled_date changes
- When unchecked: display_date stays independent (but never becomes NULL)
- **Scenario**: User sets display_date ≠ scheduled_date, then changes scheduled_date
  - **If checkbox still checked**: display_date syncs to new scheduled_date
  - **If checkbox unchecked**: display_date stays at previously set value (unchanged)

## Activity History Logging

### Silent Fallbacks (No Activity Entry)
- Creation insert where `display_published_date` was NULL → defaults to `scheduled_publish_date`
- No activity entry logged (this is system behavior, not user action)

### Explicit Logging (Activity Entry Created)
1. **On creation**: User explicitly sets `display_published_date ≠ scheduled_publish_date`
   - Log: `event_type='display_date_override'`, `field_name='display_published_date'`, `new_value=<date>`
   - Reason: User intentionally chose a different date

2. **On update**: User changes `display_published_date` to any new value
   - Log: `event_type='display_date_changed'`, `old_value`, `new_value`
   - Applies to all update scenarios (manual edit, API call, etc.)

## Error Handling

### Insert/Update Validation
- **Reject NULL**: If DB constraint triggers, error message: `"Display publish date cannot be empty. It defaults to scheduled date."`
- **Fallback instead of rejecting**: Trigger silently applies fallback instead of raising exception
- **Clear error on misconfiguration**: If both dates are NULL after fallback logic, error: `"Either scheduled or display publish date is required."`

### Edge Case: Clear Display Date via API
- If user sends `display_published_date: null` in update payload:
  - **Option A (Recommended)**: Trigger silently sets to `scheduled_publish_date` (no error)
  - **Option B (Strict)**: Reject with error `"Display date cannot be cleared. It will default to scheduled date."`
- **Implementation**: Use Option A for better UX (fallback silently)

## Constraint Specification

```sql
-- Final constraint on blogs table:
ALTER TABLE public.blogs
  ADD CONSTRAINT display_published_date_required CHECK (display_published_date IS NOT NULL);

-- Column definition:
display_published_date date NOT NULL DEFAULT CURRENT_DATE
```

## Backward Compatibility

- Existing rows with NULL `display_published_date` are backfilled before constraint is applied
- API clients that omit the field on create will have it auto-filled by trigger
- API clients that send NULL will have it silently corrected by trigger (no error)
- UI clients always send the value (never omit or send NULL)

## Testing Scenarios

1. ✓ Create blog: no display_date provided → defaults to scheduled_date
2. ✓ Create blog: display_date = scheduled_date → no activity logged
3. ✓ Create blog: display_date ≠ scheduled_date → activity logged as override
4. ✓ Update blog: change display_date → activity logged as changed
5. ✓ Update blog: send null display_date → silently falls back to scheduled_date
6. ✓ Sync checkbox checked + change scheduled_date → display_date follows
7. ✓ Sync checkbox unchecked + change scheduled_date → display_date unchanged
8. ✓ Both dates null on create → error with clear message
9. ✓ Clear both dates on update → error prevents double-null state

## Documentation References

- User-facing: `HOW_TO_USE_APP.md` (already updated)
- Technical: `SPECIFICATION.md` (already updated)
- Troubleshooting: `OPERATIONS.md` (already updated)
