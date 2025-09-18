# User Registration Error Analysis and Solution Design

## Overview

This document analyzes a 500 Internal Server Error occurring during new user registration in the lovable-rise application. The error is happening at the Supabase authentication endpoint, specifically related to JWT token handling during the registration flow.

## Problem Statement

When a new user attempts to register, the application receives a 500 Internal Server Error from the Supabase authentication service:

- **Endpoint**: `https://ehznqzaumsnjkrntaiox.supabase.co/auth/v1/signup`
- **Method**: POST
- **Status**: 500 Internal Server Error
- **Key Error**: `x-sb-error-code: unexpected_failure`

The error appears to be related to improper JWT token handling during the registration process.

## Root Cause Analysis

Based on code analysis, the issue stems from several factors:

1. **JWT Token Misuse**: The application is incorrectly using the Supabase anonymous key as a JWT token in the Authorization header instead of a proper user JWT token.

2. **Session Timing Issues**: The registration flow attempts to create user profiles before the authentication session is properly established.

3. **RLS Policy Violations**: Row Level Security policies require a valid user JWT token, but the application may be using the anon key during registration.

4. **Database Trigger Conflicts**: The automatic profile creation trigger may conflict with manual profile creation attempts.

## Architecture

The user registration flow follows this sequence:

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase Auth
    participant DB as Database
    participant T as Trigger
    
    U->>F: Submit registration form
    F->>S: POST /auth/v1/signup
    S->>S: Create auth user
    S-->>F: Return user (no session)
    F->>F: Attempt profile creation
    F->>DB: INSERT profile (with anon key)
    DB-->>F: RLS rejection (401)
    F->>F: Error handling
```

## Solution Design

### 1. Fix JWT Token Handling

The primary issue is that the application is using the Supabase anonymous key instead of a proper JWT token for authorization:

**Current Issue:**
```javascript
// Using anon key in Authorization header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Solution:**
- Use proper session tokens after authentication
- Ensure the auth flow completes before profile operations
- Implement proper token refresh mechanisms

### 2. Registration Flow Redesign

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase Auth
    participant DB as Database
    participant T as Trigger
    
    U->>F: Submit registration form
    F->>S: POST /auth/v1/signup
    S->>S: Create auth user
    S-->>F: Return user + email confirmation required
    F->>F: Show email confirmation message
    Note over U,F: User confirms email
    U->>F: Login after confirmation
    F->>S: POST /auth/v1/token
    S-->>F: Return session with JWT
    F->>DB: Profile operations (with JWT)
    DB-->>F: Success (RLS allows)
```

### 3. Profile Creation Strategy

Instead of immediately creating profiles, rely on database triggers:

1. Remove immediate profile creation in registration flow
2. Let the database trigger (`handle_new_user`) create profiles automatically
3. Only fetch profiles after email confirmation and proper login

### 4. Error Handling Improvements

Enhance error handling to provide better user feedback:

1. Distinguish between network errors and authentication errors
2. Provide clear instructions for email confirmation flow
3. Implement proper retry mechanisms for transient errors

## Implementation Plan

### Phase 1: Immediate Fixes

1. **Fix JWT Usage**:
   - Ensure proper session tokens are used for database operations
   - Remove anon key from Authorization header for user operations

2. **Update Registration Flow**:
   - Modify `UserAuthService.register()` to not attempt immediate profile creation
   - Return `EMAIL_CONFIRMATION_REQUIRED` immediately after signup

3. **Enhance Error Handling**:
   - Add specific error messages for JWT-related issues
   - Implement proper retry logic for session establishment

### Phase 2: Database Trigger Optimization

1. **Improve `handle_new_user` Function**:
   - Add better error logging
   - Ensure proper role assignment
   - Add fallback mechanisms

2. **RLS Policy Review**:
   - Verify "Users can insert their own profile" policy works correctly
   - Ensure policies don't conflict with trigger-based creation

### Phase 3: Frontend Improvements

1. **Registration UI Updates**:
   - Clearer messaging about email confirmation
   - Better error display
   - Progress indicators

2. **Session Management**:
   - Implement proper session validation
   - Add automatic token refresh

## API Endpoints Reference

### Current Registration Endpoint
```
POST https://ehznqzaumsnjkrntaiox.supabase.co/auth/v1/signup
Headers:
  Authorization: Bearer [ANON_KEY]  // <-- This is the issue
  apikey: [ANON_KEY]
Body:
  {
    "email": "user@example.com",
    "password": "password123",
    "options": {
      "emailRedirectTo": "http://localhost:8080/auth/callback",
      "data": {
        "name": "User Name",
        "role": "user"
      }
    }
  }
```

### Corrected Approach
```
POST https://ehznqzaumsnjkrntaiox.supabase.co/auth/v1/signup
Headers:
  Authorization: Bearer [ANON_KEY]  // This is correct for signup
  apikey: [ANON_KEY]
// After email confirmation and login:
Authorization: Bearer [USER_JWT_TOKEN]  // For profile operations
```

## Data Models

### User Profile Schema
```typescript
interface UserProfile {
  id: string;              // UUID from auth.users
  email: string;           // User email
  name: string;            // User name
  phone?: string;          // Optional phone
  role: 'admin' | 'manager' | 'user';  // User role
  status: 'active' | 'inactive';       // Account status
  avatar_url?: string;     // Profile picture
  created_at: string;      // Creation timestamp
  updated_at: string;      // Update timestamp
}
```

### Session Context
```typescript
interface SessionContext {
  accessToken: string | null;    // JWT token for RLS
  refreshToken: string | null;   // Refresh token
  userId: string;                // Authenticated user ID
  isReady: boolean;              // Session validity
  expiresAt: number | null;      // Token expiration
}
```

## Business Logic

### Registration Process
1. Validate user input (client-side)
2. Call Supabase `signUp()` method
3. Handle response:
   - If successful but no session, email confirmation is required
   - Show appropriate message to user
4. Redirect to login page after email confirmation

### Profile Creation
1. Rely on database trigger for automatic profile creation
2. Only fetch profiles after proper authentication
3. Use valid JWT tokens for all database operations

### Session Management
1. Validate session before database operations
2. Refresh tokens automatically when needed
3. Handle expired sessions gracefully

## Middleware & Interceptors

### Auth Interceptor
```typescript
// Ensure proper token is used for requests
const authInterceptor = {
  request: (config) => {
    const session = supabase.auth.session();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  }
};
```

### Error Interceptor
```typescript
// Handle auth-related errors
const errorInterceptor = {
  response: (error) => {
    if (error.status === 401) {
      // Trigger token refresh or redirect to login
      handleAuthError(error);
    }
    return Promise.reject(error);
  }
};
```

## Testing

### Unit Tests

1. **JWT Token Handling**:
   ```typescript
   test('should use proper JWT token for database operations', () => {
     // Test that anon key is not used for user operations
   });
   ```

2. **Registration Flow**:
   ```typescript
   test('should handle email confirmation flow correctly', () => {
     // Test registration without immediate profile creation
   });
   ```

3. **Session Management**:
   ```typescript
   test('should refresh expired tokens automatically', () => {
     // Test token refresh logic
   });
   ```

### Integration Tests

1. **Full Registration Flow**:
   - Test complete registration with email confirmation
   - Verify profile creation via trigger
   - Test login after confirmation

2. **Error Scenarios**:
   - Test registration with existing email
   - Test network errors during registration
   - Test JWT token expiration during process

### Manual Testing

1. **New User Registration**:
   - Register new user
   - Verify email confirmation is sent
   - Confirm email and login
   - Verify profile exists

2. **Error Handling**:
   - Attempt registration with existing email
   - Verify appropriate error message
   - Test registration with weak password

## Security Considerations

1. **Token Security**:
   - Ensure JWT tokens are properly secured
   - Implement token refresh mechanisms
   - Prevent token leakage in logs

2. **RLS Policies**:
   - Review all Row Level Security policies
   - Ensure proper access controls
   - Test policy enforcement

3. **Data Validation**:
   - Validate all user inputs
   - Prevent injection attacks
   - Sanitize user data

## Performance Considerations

1. **Session Validation**:
   - Cache session validation results
   - Minimize validation calls
   - Implement efficient retry mechanisms

2. **Database Operations**:
   - Use database triggers for automatic operations
   - Optimize profile fetching queries
   - Implement proper indexing

## Monitoring & Logging

1. **Error Tracking**:
   - Log all authentication errors
   - Track JWT token issues
   - Monitor registration success rates

2. **Performance Metrics**:
   - Track registration completion times
   - Monitor session establishment delays
   - Measure error recovery times

## Rollback Plan

If the fixes cause issues:

1. Revert database trigger changes
2. Restore previous registration flow
3. Temporarily disable RLS policies if needed
4. Implement manual profile creation as fallback

## Success Criteria

1. User registration completes without 500 errors
2. Email confirmation flow works correctly
3. Profiles are created properly after confirmation
4. No JWT token-related errors in logs
5. User experience is smooth and error-free