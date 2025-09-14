# User Status Update Error Fix

## Overview
This document describes the issue and solution for the error that occurs when attempting to update a user's status from active to inactive. The error manifests as a "400 Bad Request" with the message "Request body must be valid JSON" when calling the PATCH endpoint for user status updates.

## Problem Analysis

### Error Details
- **Endpoint**: `https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/users/{user_id}`
- **Method**: PATCH
- **Error Response**: `{"error":"Request body must be valid JSON"}`
- **Status Code**: 400 Bad Request

### Root Cause
The issue is in the `toggleUserStatus` method in `src/lib/user-service.ts`. When this method calls `updateUser`, it passes an object `{ status }` to the updateUser function. However, if the status value is undefined or null, the `cleanData` filtering logic in `updateUser` removes all properties, resulting in an empty object being sent to the backend.

The backend function at `supabase/functions/users/index.ts` expects a valid JSON object with at least one property to update, but receives an empty object, causing it to return the error.

### Code Flow
1. `toggleUserStatus(id, status)` is called with a valid status value
2. It calls `updateUser(id, { status })`
3. In `updateUser`, the cleanData function filters out any undefined values:
   ```typescript
   const cleanData = Object.fromEntries(
     Object.entries(data).filter(([_, value]) => value !== undefined)
   );
   ```
4. If `status` is undefined, `cleanData` becomes an empty object `{}`
5. The empty object is sent to the backend
6. Backend validation fails because no fields are provided for update

## Solution Design

### Approach
The fix involves ensuring that the `toggleUserStatus` method properly validates the status parameter before calling `updateUser`. Additionally, we should enhance the `updateUser` method to provide better error handling when no valid fields are provided.

### Implementation Changes

#### 1. Update `toggleUserStatus` Method
Modify the `toggleUserStatus` method in `src/lib/user-service.ts` to validate the status parameter before proceeding:

```typescript
/** Переключение статуса пользователя */
static async toggleUserStatus(id: string, status: "active" | "inactive"): Promise<UserProfile> {
  // Validate parameters
  if (!id) throw new ApiError("User ID is required", 400);
  if (status === undefined || status === null) throw new ApiError("Status is required", 400);
  if (!["active", "inactive"].includes(status)) throw new ApiError("Invalid status value", 400);
  
  return this.updateUser(id, { status });
}
```

#### 2. Enhance `updateUser` Method
Improve the validation in the `updateUser` method to provide clearer error messages:

```typescript
/** Обновление пользователя */
static async updateUser(id: string, data: UpdateUserData): Promise<UserProfile> {
  if (!id) throw new ApiError("User ID is required", 400);
  if (!data || Object.keys(data).length === 0) throw new ApiError("No fields provided for update", 400);

  // Filter out undefined values
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  
  // Check if we still have data after filtering
  if (Object.keys(cleanData).length === 0) throw new ApiError("No valid fields provided for update", 400);

  const response = await supabase.functions.invoke(`users/${id}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(cleanData),
  });

  if (response.error) throw new ApiError(response.error.message || "Failed to update user");
  return response.data.user;
}
```

## Testing Strategy

### Unit Tests
1. Test `toggleUserStatus` with valid parameters
2. Test `toggleUserStatus` with invalid/missing user ID
3. Test `toggleUserStatus` with invalid status values
4. Test `updateUser` with empty data object
5. Test `updateUser` with only undefined values

### Integration Tests
1. Verify that status toggle works correctly in the UI
2. Confirm that the API endpoint returns proper responses
3. Ensure error messages are displayed appropriately to users

## Deployment
The fix requires updating the `src/lib/user-service.ts` file. After making the changes, the application should be tested thoroughly to ensure that:
1. User status updates work correctly
2. Error handling is improved
3. No regressions are introduced in other user management functionality

## Conclusion
This fix addresses the immediate issue with user status updates while also improving the robustness of the user service by adding better validation and error handling. The solution maintains backward compatibility while providing clearer error messages for debugging.