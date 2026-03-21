# Connected Services Feature

## Overview
The Connected Services feature allows users to manage third-party OAuth connections (Google and Slack) from the Settings page. Users can see connection status, connection date, and disconnect services. This feature integrates seamlessly with the existing OAuth sign-in flow and notification preferences.

## Architecture

### Database Schema
**Table: `user_integrations`**
- Tracks which OAuth services are connected per user
- Auto-populated when new users are created
- RLS policies enforce user self-access and admin audit access

```sql
user_id (FK to auth.users)
google_connected (BOOLEAN, default: FALSE)
google_connected_at (TIMESTAMP, nullable)
slack_connected (BOOLEAN, default: FALSE)
slack_connected_at (TIMESTAMP, nullable)
created_at, updated_at (TIMESTAMP)
```

### API Endpoints

#### `GET /api/users/integrations`
Fetch current user's connected services status.

**Authorization**: Bearer token required

**Response**:
```json
{
  "google_connected": false,
  "google_connected_at": null,
  "slack_connected": true,
  "slack_connected_at": "2026-03-21T18:39:01Z"
}
```

#### `PATCH /api/users/integrations`
Update integration connection status. Called when user connects/disconnects a service.

**Authorization**: Bearer token required

**Body**:
```json
{
  "google_connected": true,
  "slack_connected": false
}
```

**Behavior**:
- Setting `google_connected: true` automatically sets `google_connected_at` to current timestamp
- Setting to `false` clears the connection but keeps historical `connected_at` for audit
- Creates row if doesn't exist (handled by migration auto-population)

### Frontend Components

#### `ConnectedServicesForm` (`src/components/connected-services-form.tsx`)
Main UI component for managing connected services.

**Features**:
- Displays Google and Slack with icon/status badges
- Shows "Connected" (green badge) or "Not connected" (grey badge)
- Shows connection date for connected services
- Disconnect button with loading state
- "Connect" link routes to `/login?reconnect={service}` (future enhancement)
- Fetches and updates integration status via API
- Error handling with user-facing alerts

**Usage**:
```tsx
<ConnectedServicesForm />
```

### Integration with Settings Page

The `ConnectedServicesForm` is placed in Settings immediately before `NotificationPreferencesForm`:

```tsx
// In /settings page
{profile ? (
  <ConnectedServicesForm />
) : null}

{profile ? (
  <NotificationPreferencesForm />
) : null}
```

## UI/UX Details

### Connected State
- Icon: Colored (text-slate-700)
- Badge: Green background with green dot ("Connected")
- Text: Service name + description
- Sub-text: "Connected on [date]"
- Action: "Disconnect" button (borders, hover effect)

### Disconnected State
- Icon: Greyed (text-slate-400)
- Badge: Grey background with grey dot ("Not connected")
- Text: Service name + description
- Action: "Connect" link (dark button styling)

### Loading/Disabled States
- Disconnect button shows "Disconnecting…" during mutation
- Button disabled while operation in progress
- Component shows loading skeleton while fetching initial status

## Future Enhancements

### 1. Reconnect Flow
Currently, "Connect" button links to `/login?reconnect=google`. The login page should:
- Accept `?reconnect={service}` query param
- Trigger OAuth flow for specified service
- On success, call `PATCH /api/users/integrations` to mark as connected
- Redirect back to Settings with success alert

### 2. OAuth Connection Tracking
When user completes OAuth login:
- Detect if this is a new connection vs. existing
- Call `PATCH /api/users/integrations` to mark service as connected
- Log connection event to activity history (optional)

### 3. Notification Preferences Binding
Once integrations are tracked, notification preferences can be service-aware:
- Show notification delivery method (in-app, Slack, both)
- Allow per-service notification type preferences
- Skip Slack delivery if Slack is not connected

### 4. Admin Audit
Admins can view all users' connected services via RLS-allowed `user_integrations` rows for:
- Debugging connection issues
- Auditing which services users have enabled
- Bulk disconnect flows (if needed)

## Testing Checklist

- [ ] User can see Connected Services section in Settings
- [ ] Displays correct status (connected/not connected) for Google and Slack
- [ ] Disconnect button works and updates UI immediately
- [ ] Error handling shows appropriate alerts
- [ ] Loading states display correctly
- [ ] Permission checks work (non-admins see only own, admins can audit)
- [ ] Migration auto-populates existing users
- [ ] New user registration creates default `user_integrations` row
- [ ] Date formatting displays correctly in user's locale

## Migration Notes

**Migration**: `20260321191000_user_integrations.sql`
- Creates `user_integrations` table
- Enables RLS with user/admin policies
- Creates auto-provisioning trigger
- Auto-migrates all existing users
- Safe to run multiple times (ON CONFLICT DO NOTHING)

**Run migration**:
```bash
supabase db push --yes
```

## Files Changed/Added

### New Files
- `src/components/connected-services-form.tsx` — UI component
- `src/app/api/users/integrations/route.ts` — API endpoints
- `supabase/migrations/20260321191000_user_integrations.sql` — DB schema
- `docs/connected-services-feature.md` — This document

### Modified Files
- `src/app/settings/page.tsx` — Import and render ConnectedServicesForm
- `src/lib/types.ts` — Add UserIntegrations interface

## Implementation Notes

### Security
- RLS policies enforce user self-access
- Admins can audit via explicit RLS policy
- Disconnect is a soft delete (keeps audit trail)
- No sensitive OAuth tokens stored in `user_integrations`

### Performance
- Uses session-cached API tokens (standard pattern)
- One-time fetch on component mount
- Minimal DB footprint (one row per user)

### Compatibility
- Works with existing Supabase Auth (Google OAuth, Slack OIDC)
- Non-intrusive to login flow
- Can be extended without breaking changes
