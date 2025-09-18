# Fix for User Role Assignment Issue in user-auth-service.ts

## Overview
This document describes the issue and fix for a type mismatch in the user authentication service that was causing problems with role assignment for new users.

## Problem Analysis
The issue was found in the `user-auth-service.ts` file at line 211, where the role was being set to `'user'` in the Supabase signup options. However, the real issue was in the `UserProfile` interface in `user-auth-schemas.ts` which had a restrictive type definition for the role field (`role: 'user'` instead of allowing all possible roles).

## Root Cause
The UserProfile interface was overly restrictive in its type definition for the role field. It specified `role: 'user'` which meant that TypeScript would only allow the literal string 'user' as a value. This caused type errors when trying to work with profiles that might have other roles like 'admin' or 'manager'. Additionally, the database schema had evolved to include all three roles ('admin', 'manager', 'user'), but the TypeScript interface was not updated accordingly.

## Solution
The fix involves updating the UserProfile interface in `user-auth-schemas.ts` to properly reflect all possible role values:

```typescript
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}
```

This change allows the UserProfile interface to properly represent users with any of the three possible roles: admin, manager, or user.

## Implementation
The fix requires modifying the UserProfile interface in the `user-auth-schemas.ts` file to use a union type for the role field instead of a literal type.

## Impact
This fix resolves the type mismatch issue and ensures that:
1. User profiles can properly represent all role types
2. Type checking works correctly throughout the application
3. The application can handle users with different roles without type errors
4. Consistency between database schema and TypeScript types

## Testing
After implementing this fix, the following should be verified:
1. User registration continues to work correctly
2. Users with different roles (admin, manager, user) are properly handled
3. Type checking passes without errors
4. No runtime errors occur due to the type change
5. Existing user profiles with different roles are still accessible