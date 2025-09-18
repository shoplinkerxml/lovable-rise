# Fix 401 Error When Editing Users in Admin Panel

## Overview

This document outlines the solution to fix the 401 Unauthorized error that occurs when editing users in the admin panel at `/admin/users`. The issue is caused by improper authentication header handling when making requests to Supabase Edge Functions.

## Problem Analysis

### Current Issue

When editing a user in the admin panel, the application makes a PATCH request to:
```
https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/users/{user_id}
```

The request fails with a 401 Unauthorized error because:
1. The client is sending both `apikey` and `Authorization` headers in the same request
2. According to Supabase Edge Function authentication rules, only one authentication header should be used
3. The Edge Function expects a Bearer token in the Authorization header but receives conflicting headers

### Error Details

- **Request URL**: `https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/users/9ceeb29e-dc6b-4719-a1f1-297829ec3a5a`
- **Method**: PATCH
- **Status Code**: 401 Unauthorized
- **Headers Sent**: Both `apikey` and `Authorization` headers are present

## Root Cause

The issue is in the `getAuthHeaders()` function in `src/lib/user-service.ts`. This function adds both the `apikey` and `Authorization` headers when making requests to Supabase Edge Functions, which causes a conflict.

According to Supabase documentation and best practices (as noted in the project memory `Supabase Edge Function Authentication Handling`):
- When making requests to Supabase Edge Functions, only the `Authorization` header with a Bearer token should be used
- The `apikey` header should not be sent alongside the `Authorization` header

The current implementation in `user-service.ts` incorrectly adds the `apikey` header even when an access token is available, which conflicts with the `Authorization` header that contains the Bearer token.

## Solution Design

### 1. Fix Authentication Header Handling

Modify the `getAuthHeaders()` function in `src/lib/user-service.ts` to only send the `Authorization` header with a Bearer token when a session exists, and no headers when there's no session (anonymous requests should not include apikey for Edge Functions).

### 2. Update Edge Function Authentication

The Supabase Edge Function already properly validates the Bearer token, but we need to ensure the client doesn't send conflicting headers. The Edge Function correctly extracts the token from the Authorization header.

### 3. Add Session Validation

Implement proper session validation before making requests to ensure a valid access token is available.

### Authentication Flow Diagram

```mermaid
graph LR
    A[Admin User] --> B[Edit User Form]
    B --> C[UserService.updateUser]
    C --> D[Validate Session]
    D --> E{Session Valid?}
    E -->|No| F[Return 401 Error]
    E -->|Yes| G[Get Auth Headers]
    G --> H[Send Only Bearer Token]
    H --> I[Supabase Edge Function]
    I --> J{Token Valid?}
    J -->|No| F
    J -->|Yes| K[Update User]
    K --> L[Return Success]
```

## Files to be Modified

### 1. src/lib/user-service.ts

This file contains the `getAuthHeaders()` function that needs to be fixed and the `updateUser()` method that needs session validation.

#### Changes to `getAuthHeaders()` function:

The current implementation incorrectly includes both headers:

```typescript
async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = {};

  if (session.data.session) {
    headers["Authorization"] = `Bearer ${session.data.session.access_token}`;
  } else {
    // This is the problem - we're sending apikey even for Edge Functions
    headers["apikey"] =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoem5xemF1bXNuamtybnRhaW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTM2MjMsImV4cCI6MjA3MjI4OTYyM30.cwynTMjqTpDbXRlyMsbp6lfLLAOqE00X-ybeLU0pzE0";
  }

  console.log("getAuthHeaders called, returning headers:", headers);
  return headers;
}
```

The fix is to remove the `apikey` header for Edge Function requests:

```typescript
async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = {};

  if (session.data.session) {
    // For Edge Functions, only send Authorization header with Bearer token
    headers["Authorization"] = `Bearer ${session.data.session.access_token}`;
  }
  // For anonymous requests to Edge Functions, don't send any auth headers
  // Edge Functions will handle anonymous access based on RLS policies

  console.log("getAuthHeaders called, returning headers:", headers);
  return headers;
}
```

#### Changes to `updateUser()` method:

Add session validation before making the request:

```typescript
import { SessionValidator } from "@/lib/session-validation";

/** Обновление пользователя */
static async updateUser(id: string, data: UpdateUserData): Promise<UserProfile> {
  if (!id) throw new ApiError("User ID is required", 400);
  if (!data || Object.keys(data).length === 0) throw new ApiError("No fields provided for update", 400);

  // Ensure valid session before making request
  const validation = await SessionValidator.validateSession();
  if (!validation.isValid || !validation.accessToken) {
    throw new ApiError("No valid session", 401);
  }

  // Filter out undefined values
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  // Check if we still have data after filtering
  if (Object.keys(cleanData).length === 0) throw new ApiError("No valid fields provided for update", 400);

  // Log the request for debugging
  console.log("UserService.updateUser called with:", { id, cleanData });

  const response = await supabase.functions.invoke(`users/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(cleanData),
  });

  console.log("UserService.updateUser response:", response);

  if (response.error) throw new ApiError(response.error.message || "Failed to update user");
  return response.data.user;
}
```

### Step 4: Update Edge Function Authentication

The Supabase Edge Function (`supabase/functions/users/index.ts`) already properly handles authentication. The issue is on the client side where both `apikey` and `Authorization` headers are being sent. The Edge Function correctly:

1. Extracts the token from the Authorization header
2. Creates a client with only the Authorization header
3. Validates admin permissions

No changes needed in the Edge Function as it already follows best practices.

## Testing Plan

### Unit Tests

1. Test `getAuthHeaders()` function returns only Authorization header when session exists
2. Test `getAuthHeaders()` function returns no auth headers when no session exists
3. Test session validation properly validates active sessions
4. Test session validation rejects expired sessions

### Integration Tests

1. Test user update functionality with valid session
2. Test user update functionality fails with expired session
3. Test user update functionality fails with no session

### Manual Testing

1. Log in as admin user
2. Navigate to admin users panel
3. Edit a user and save changes
4. Verify the request succeeds without 401 error
5. Test with expired session to ensure proper error handling

### Verification Steps

1. Open browser developer tools and monitor Network tab
2. Navigate to `/admin/users`
3. Edit a user and observe the request headers
4. Confirm only `Authorization: Bearer <token>` header is sent
5. Confirm no `apikey` header is sent with the request
6. Verify the PATCH request to `/functions/v1/users/{id}` returns 200 status

## Security Considerations

1. Ensure only admin users can access user management endpoints
2. Validate all user inputs to prevent injection attacks
3. Maintain proper session handling to prevent token leakage
4. Ensure Edge Functions properly validate authentication tokens

## Performance Impact

This fix should have minimal performance impact as it only changes header handling and adds a session validation step before requests.

## Rollback Plan

If issues arise after deployment:
1. Revert the changes to `getAuthHeaders()` function
2. Restore the original authentication header logic
3. Monitor application logs for any authentication-related errors

## Conclusion

The 401 Unauthorized error when editing users in the admin panel is caused by sending conflicting authentication headers to Supabase Edge Functions. By modifying the `getAuthHeaders()` function to only send the `Authorization` header with a Bearer token and leveraging the existing session validation system, we can resolve this issue while maintaining security and proper authentication flows. This fix aligns with Supabase best practices and the project's existing authentication handling patterns.