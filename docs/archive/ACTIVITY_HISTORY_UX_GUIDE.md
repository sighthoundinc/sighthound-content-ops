# Activity History Page — UX Guide

## Overview
The Activity History page (`/settings/access-logs`) provides admins with detailed audit trails across the entire system. Non-admin users have read-only access to their own activity records.

---

## Admin View (Full Access)

### Initial Load
When an admin opens the Activity History page, they see:

```
┌─────────────────────────────────────────────────────────────┐
│ Activity History                                             │
│ Admin-accessible view of all system activities              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Filters Panel (White Box)                                   │
│                                                              │
│ ┌────────────────────────┐  ┌────────────────────────────┐  │
│ │ Activity Types         │  │ Users                      │  │
│ │ [2 selected ▼]         │  │ [1 selected ▼]             │  │
│ │                        │  │                            │  │
│ │ ✓ Login                │  │ ✓ Vis (vis@sighthound...) │  │
│ │ ✓ Dashboard Visit      │  │ □ Alice (alice@...)        │  │
│ │ □ Writer Status...     │  │ □ Bob (bob@...)            │  │
│ │ □ Publisher Status...  │  │ □ Carol (carol@...)        │  │
│ │ □ Blog Assignment...   │  │ □ David (david@...)        │  │
│ │ □ Social Post...       │  │ (scrollable)               │  │
│ │ □ Social Post...       │  │                            │  │
│ └────────────────────────┘  └────────────────────────────┘  │
│                                                              │
│ [Apply Filters] ← default: filters are applied              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Showing 5 of 127 logs
┌─────────────────────────────────────────────────────────────┐
│ Category | Action          | Content | User | Email | Time   │
├─────────────────────────────────────────────────────────────┤
│ Login    │ Sign in         │ —       │ Vis  │ vi... │ 2:15pm │
│ Dashboard│ Dashboard Visit │ —       │ Vis  │ vi... │ 1:47pm │
│ Login    │ Sign in         │ —       │ Vis  │ vi... │ 10:3am │
│ Dashboard│ Dashboard Visit │ —       │ Vis  │ vi... │ 9:22am │
│ Login    │ Sign in         │ —       │ Vis  │ vi... │ 8:15am │
└─────────────────────────────────────────────────────────────┘
                                    < 1 2 3 ... 26 >
```

### Key Features

**1. Current User Pre-Selected**
- By default, the current admin user is already selected in the Users dropdown
- Shows "1 selected" indicating the current user (Vis) is pre-selected
- Admin can easily expand to view other users by modifying the filter

**2. Activity Type Selection**
- Shows "2 selected" (Login + Dashboard Visit by default)
- Admin can expand to include/exclude blog activities, social post activities
- Click dropdown to expand and see all 7 activity types

**3. Filter Flow**
```
Admin modifies filter selections → Selections persist in dropdown (pending state)
                                 ↓
                          Admin clicks "Apply Filters"
                                 ↓
                          Pending state → Applied state
                                 ↓
                          API request with new filters
                                 ↓
                          Table updates with results
```

**4. Multi-User Audit Trail**
Admin can quickly switch between users to audit specific actions:
- Select multiple users to compare activities across team members
- View blog/social post activities alongside login/dashboard logs
- All timestamps in UTC for consistency

### Example Workflows

**Workflow 1: Quick User Audit**
1. Admin wants to see what "Alice" did today
2. Current state: Vis is selected
3. Admin unselects Vis, selects Alice
4. Clicks "Apply Filters"
5. Table now shows only Alice's activities (login, dashboard, blog work, etc.)

**Workflow 2: Investigate Blog Assignment Change**
1. Admin received a question about who changed a blog assignment
2. Admin selects only "Blog Assignment Changed" from Activity Types
3. Keeps Users as-is (or selects all)
4. Clicks "Apply Filters"
5. Table shows only blog assignment change events with actor names and timestamps

**Workflow 3: Track Multiple Users in Parallel**
1. Admin wants to audit a specific blog collaboration
2. Selects Writers: Alice, Bob
3. Selects Activity Types: Blog Writer Status Changed + Blog Assignment Changed
4. Clicks "Apply Filters"
5. See side-by-side activity for both writers on that specific blog workflow

---

## Non-Admin User View (Read-Only, Self Only)

### Initial Load
When a non-admin opens the Activity History page:

```
┌─────────────────────────────────────────────────────────────┐
│ Activity History                                             │
│ Your dashboard and login activity                           │
└─────────────────────────────────────────────────────────────┘

❌ NO FILTERS VISIBLE ❌
(Filters section is completely hidden)

Showing 8 of 42 logs  (User can only see their own)
┌─────────────────────────────────────────────────────────────┐
│ Category | Action          | Content | User | Email | Time   │
├─────────────────────────────────────────────────────────────┤
│ Login    │ Sign in         │ —       │ You  │ (me) | 2:15pm │
│ Dashboard│ Dashboard Visit │ —       │ You  │ (me) | 1:47pm │
│ Login    │ Sign in         │ —       │ You  │ (me) | 10:3am │
│ Dashboard│ Dashboard Visit │ —       │ You  │ (me) | 9:22am │
│ Login    │ Sign in         │ —       │ You  │ (me) | 8:15am │
│ Dashboard│ Dashboard Visit │ —       │ You  │ (me) | 7:41am │
│ Login    │ Sign in         │ —       │ You  │ (me) | 6:22am │
│ Dashboard│ Dashboard Visit │ —       │ You  │ (me) | 5:55am │
└─────────────────────────────────────────────────────────────┘
                                    < 1 2 3 ... 6 >
```

### Key Differences

**1. No Filter Controls**
- Filter section is hidden via `{isAdmin && !isLoading && (...)}`
- Non-admin users cannot modify what they see
- API enforces RLS: requests without admin role are blocked

**2. Only Dashboard Visits**
- Non-admins see only their own:
  - `login` events (successful sign-ins)
  - `dashboard_visit` events (page visits)
- Cannot see blog/social post activities (those are admin-visible only)

**3. Self-Only Restriction**
- Pagination still works (can scroll through own history)
- All timestamps in **personal timezone** (not UTC)
- User's email shown as "(me)" or similar indicator

**4. Read-Only Experience**
- No bulk actions
- No export options
- No ability to clear own history (only admins can do cleanup)

### What Non-Admins Don't See

```
❌ No Activity Type filters (Blog Writer Status, Blog Assignment, etc.)
❌ No User selector (can't view other users' activities)
❌ No Apply Filters button
❌ No access to sensitive activity types

✅ Can only see own login/dashboard activity
✅ Can see full history of own logins and dashboard visits
✅ Pagination available for own historical records
```

---

## Side-by-Side Comparison

| Feature | Admin View | Non-Admin View |
|---------|-----------|-----------------|
| **Activity Types** | 7 types selectable | Only login + dashboard (no filter) |
| **Users** | View any user via dropdown | Self only (no filter) |
| **Default Selection** | Current admin pre-selected | N/A (not applicable) |
| **Filter Controls** | Visible + interactive | Hidden entirely |
| **Apply Filters Button** | Visible | Hidden |
| **Timezone** | UTC (for consistency) | Personal timezone |
| **Use Case** | Comprehensive audit trail | Personal activity record |

---

## Technical Implementation Details

### Admin View Rendering
```typescript
{isAdmin && !isLoading && (
  <div className="rounded-md border border-gray-200 bg-white p-4">
    {/* Filter dropdowns here */}
    {/* Apply Filters button here */}
  </div>
)}
```

### Filter Initialization
```typescript
// Current user pre-selected
const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
  profile?.id ? [profile.id] : []
);

const [pendingUserIds, setPendingUserIds] = useState<string[]>(
  profile?.id ? [profile.id] : []
);
```

### Default Activity Types
```typescript
const [selectedActivityTypes, setSelectedActivityTypes] = 
  useState<ActivityType[]>([
    "login",
    "dashboard_visit",
  ]);
```

### Close-on-Blur
Dropdowns automatically close when clicking outside them:
```typescript
useEffect(() => {
  const handleClickOutside = () => {
    setIsDropdownOpen({activity: false, user: false});
  };
  
  if (isDropdownOpen.activity || isDropdownOpen.user) {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }
}, [isDropdownOpen]);
```

### API Behavior
- **Admin**: Can request any activity types and user IDs via query params
- **Non-Admin**: RLS in database blocks access; API returns empty results
- **Timezone**: Non-admins see personal timezone; admins see UTC

---

## Future Enhancements

1. **Quick Filter Chips** — Recent filter combinations (e.g., "Alice's blog work")
2. **Export Activity** — CSV export for audit compliance (admin-only)
3. **Advanced Search** — Find specific activities by content title
4. **Alerts** — Notify admins of suspicious activity patterns
5. **Activity Grouping** — Group related activities (e.g., all activities for a single blog)
