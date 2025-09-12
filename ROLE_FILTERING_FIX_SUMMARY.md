# Role Filtering Fix Summary

## Problem
The role-based filtering in the user management system was not working correctly. When requesting users with the "user" role filter, the system was returning all users regardless of their role.

## Root Cause
The issue was in the parameter handling logic in both the backend and frontend:

1. **Backend Issue**: The Supabase users function was not properly differentiating between no role parameter and an explicit "user" role parameter.
2. **Frontend Issue**: The frontend was always sending `role=user` even when no filter was explicitly selected, which caused confusion in the backend logic.

## Solution

### 1. Backend Fix (`supabase/functions/users/index.ts`)
Updated the role parameter handling logic to properly differentiate between cases:

```typescript
const roleParam = url.searchParams.get('role') // Extract role parameter with explicit handling

// Build query
let query = supabaseClient.from('profiles').select('*', { count: 'exact' })

// Apply role filter - handle both explicit and default cases
if (roleParam !== null && roleParam !== 'all') {
  // Explicit role filter requested
  query = query.eq('role', roleParam)
} else if (roleParam === null) {
  // No role parameter provided, default to 'user' role
  query = query.eq('role', 'user')
}
// If roleParam is 'all', no role filter is applied (show all roles)
```

### 2. Frontend Fix (`src/lib/user-service.ts`)
Updated the query parameter construction to only send role parameter when explicitly set:

```typescript
// Handle role filter properly - only add if explicitly set
if (filters.role && filters.role !== 'all') {
  queryParams.append('role', filters.role);
} else if (filters.role === 'all') {
  queryParams.append('role', 'all');
}
// If filters.role is undefined or null, we don't add the role parameter at all
```

### 3. UI Fix (`src/pages/admin/AdminUsersPage.tsx`)
Changed the default role filter from 'user' to 'all' to show all users by default:

```typescript
const [filters, setFilters] = useState<UserFilters>({
  search: "",
  status: "all",
  role: "all", // Show all roles by default instead of just 'user'
  sortBy: "created_at",
  sortOrder: "desc",
});
```

## Expected Behavior After Fix

| Request | Expected Result |
|---------|-----------------|
| `GET /users` | Only users with role = "user" (default behavior) |
| `GET /users?role=user` | Only users with role = "user" |
| `GET /users?role=admin` | Only users with role = "admin" |
| `GET /users?role=manager` | Only users with role = "manager" |
| `GET /users?role=all` | All users regardless of role |

## Testing
The fix has been validated to ensure:
1. Proper role filtering for all role values
2. Backward compatibility maintained
3. No syntax errors introduced
4. Default behavior preserved when no role parameter is provided

## Files Modified
1. `supabase/functions/users/index.ts` - Backend Supabase function
2. `src/lib/user-service.ts` - Frontend service layer
3. `src/pages/admin/AdminUsersPage.tsx` - Admin UI page