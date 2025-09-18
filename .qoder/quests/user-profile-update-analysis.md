# User Profile Update and Deletion Analysis

## Overview

This document analyzes the issues with user profile update and deletion operations in the application, specifically focusing on the 401 Unauthorized errors that occur when attempting these operations. The analysis covers the frontend implementation, backend Edge Functions, authentication flow, and potential causes of the authorization failures.

## Architecture

The user management system consists of several components:

1. **Frontend Components**:
   - `AdminUsersPage.tsx` - Main user management page
   - `UsersTable.tsx` - Displays users in a table format
   - `EditUserDialog.tsx` - Handles user profile updates
   - `DeleteUserDialog.tsx` - Handles user deletion
   - `useUsers.ts` - React Query hooks for user operations

2. **Services**:
   - `UserService.ts` - Client-side service for user operations
   - `ProfileService.ts` - Handles user profile operations
   - `UserAuthService.ts` - Authentication service
   - `SessionValidator.ts` - Validates authentication sessions

3. **Backend**:
   - Supabase Edge Function (`users/index.ts`) - Handles all user-related API operations

## API Endpoints Reference

### PATCH /users/{id}
Updates a user profile.

**Request Headers**:
- `Authorization: Bearer {access_token}` (Required)
- `Content-Type: application/json`

**Request Body**:
```json
{
  "name": "string",
  "phone": "string"
}
```

**Response Codes**:
- 200: Success
- 400: Invalid request data
- 401: Unauthorized
- 403: Forbidden (admin access required)
- 404: User not found
- 500: Server error

### DELETE /users/{id}
Deletes a user.

**Request Headers**:
- `Authorization: Bearer {access_token}` (Required)

**Response Codes**:
- 200: Success
- 401: Unauthorized
- 403: Forbidden (admin access required)
- 404: User not found
- 500: Server error

## Data Models

### UserProfile
```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: "user" | "admin" | "manager";
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}
```

## Business Logic Layer

### Frontend Flow

1. **User Update Process**:
   - User clicks "Edit" in the UsersTable
   - EditUserDialog opens with user data
   - User submits updated data
   - useUpdateUser mutation calls UserService.updateUser
   - UserService sends PATCH request to Edge Function
   - Response updates UI and invalidates cache

2. **User Deletion Process**:
   - User clicks "Delete" in the UsersTable
   - DeleteUserDialog opens for confirmation
   - User confirms deletion
   - useDeleteUser mutation calls UserService.deleteUser
   - UserService sends DELETE request to Edge Function
   - Response updates UI and invalidates cache

### Backend Flow

1. **Authentication Check**:
   - All PATCH/DELETE operations require admin permissions
   - `checkAdminPermission` function validates admin access
   - Extracts token from Authorization header
   - Verifies user authentication and role

2. **User Update**:
   - Validates Content-Type is application/json
   - Parses and validates request body
   - Updates profile in 'profiles' table
   - Returns updated user data

3. **User Deletion**:
   - Deletes user from auth system
   - Deletes user profile from 'profiles' table
   - Returns deleted user data

## Authentication Issues Analysis

### Root Cause of 401 Errors

Based on the code analysis, the 401 errors are likely caused by one of these issues:

1. **Missing or Invalid Authorization Header**:
   - Frontend may not be properly attaching the Bearer token
   - Token may be expired or invalid

2. **Session Management Issues**:
   - Session might not be properly maintained between operations
   - Access token might not be refreshed when needed

3. **Header Conflicts**:
   - Both `Authorization` and `apikey` headers might be sent, causing conflicts
   - Edge Functions expect only Bearer tokens for authenticated operations

### Code Analysis

1. **Frontend UserService**:
   - Uses `getAuthHeaders()` to determine authentication headers
   - For authenticated users, uses `Bearer {access_token}`
   - For unauthenticated users, uses `apikey` (should not happen for admin operations)

2. **Backend Edge Function**:
   - Requires admin access for PATCH/DELETE operations
   - Uses `checkAdminPermission()` to validate access
   - Extracts token from Authorization header

3. **Session Validation**:
   - `SessionValidator.ts` provides utilities for session management
   - Checks token validity and refreshes when needed

## Recommended Solutions

### 1. Fix Header Handling
Ensure only the Authorization header is sent for authenticated operations:

```typescript
// In user-service.ts, modify getAuthHeaders()
async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  
  if (session.data.session?.access_token) {
    return {
      "Authorization": `Bearer ${session.data.session.access_token}`,
      "Content-Type": "application/json"
    };
  }
  
  // For unauthenticated requests, don't send apikey for admin operations
  return {
    "Content-Type": "application/json"
  };
}
```

### 2. Improve Session Management
Add proactive session validation before operations:

```typescript
// In UserService.updateUser and UserService.deleteUser
static async updateUser(id: string, data: UpdateUserData): Promise<UserProfile> {
  // Validate session before operation
  const sessionValidation = await SessionValidator.ensureValidSession();
  if (!sessionValidation.isValid) {
    throw new ApiError("Invalid session", 401);
  }
  
  // Continue with operation...
}
```

### 3. Enhance Error Handling
Improve error messages for better debugging:

```typescript
// In users Edge Function
if ('error' in adminCheck) {
  console.error('Admin permission check failed:', adminCheck);
  return new Response(JSON.stringify({ 
    error: adminCheck.error,
    debug: {
      hasAuthHeader: !!authHeader,
      tokenLength: authHeader ? authHeader.length : 0
    }
  }), { 
    status: adminCheck.status, 
    headers: corsHeaders 
  });
}
```

## Testing

### Unit Tests
1. Test `getAuthHeaders()` function with valid and invalid sessions
2. Test session validation logic
3. Test error handling for different HTTP status codes

### Integration Tests
1. Test user update with valid admin session
2. Test user deletion with valid admin session
3. Test proper 401 responses with invalid tokens
4. Test proper 403 responses with non-admin users

## Conclusion

The 401 errors during user profile updates and deletions are most likely caused by improper authentication header handling or session management issues. The solution involves ensuring proper Bearer token usage, improving session validation, and enhancing error handling for better debugging.