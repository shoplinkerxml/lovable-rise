# Authorization Header Fix Design

## Overview

This design addresses the critical authorization header issue where the system is incorrectly using the anonymous key (anon key) in both the `apikey` and `authorization` headers instead of using the user's session access token in the `authorization` header. This causes Row Level Security (RLS) policies to fail because the database cannot identify the authenticated user.

## Problem Statement

### Current Incorrect Implementation
```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key) ✅ Correct
authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key) ❌ Incorrect
```

### Required Correct Implementation
```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key) ✅ Correct
authorization: Bearer <USER_SESSION_ACCESS_TOKEN> ✅ Required
```

## Authentication Token Flow Analysis

### Current Token Extraction Issue
```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend App
    participant Supabase as Supabase Auth
    participant Database as PostgreSQL/RLS
    
    User->>Frontend: Login with credentials
    Frontend->>Supabase: signInWithPassword(email, password)
    Supabase-->>Frontend: { user, session: { access_token } }
    Note over Frontend: ISSUE: Not extracting access_token properly
    Frontend->>Database: Request with Bearer <ANON_KEY>
    Database-->>Frontend: RLS denies access (401/403)
```

### Required Token Flow
```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend App
    participant Supabase as Supabase Auth
    participant Database as PostgreSQL/RLS
    
    User->>Frontend: Login with credentials
    Frontend->>Supabase: signInWithPassword(email, password)
    Supabase-->>Frontend: { user, session: { access_token } }
    Note over Frontend: Extract session.access_token
    Frontend->>Database: Request with Bearer <SESSION.ACCESS_TOKEN>
    Database-->>Frontend: RLS allows access (200 OK)
```

## Root Cause Analysis

### Issue 1: Missing Access Token Extraction in Login Flow
The AdminAuth.tsx and UserAuth.tsx components are not properly extracting and storing the access token from the authentication response.

### Issue 2: Supabase Client Auto-Header Management Not Working
The Supabase client should automatically manage the Authorization header with the session access token, but there may be configuration or timing issues preventing this.

### Issue 3: Manual Header Override Issues
Some parts of the codebase are manually setting headers instead of relying on the Supabase client's automatic token management.

## Solution Architecture

### Component 1: Enhanced Login Flow with Proper Token Extraction

```typescript
// Enhanced login handler example
const handleLogin = async (credentials) => {
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  
  if (error) throw error;
  
  // Extract session data properly
  const userId = data.user.id;
  const accessToken = data.session.access_token; // ✅ Extract access token
  
  console.log("USER ID:", userId);
  console.log("ACCESS TOKEN:", accessToken);
  
  // Supabase client will now automatically use this token in Authorization header
}
```

### Component 2: Session Token Validation Service

```typescript
interface TokenValidationResult {
  isValid: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  needsRefresh: boolean;
}

class SessionTokenValidator {
  static async validateCurrentToken(): Promise<TokenValidationResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { isValid: false, accessToken: null, refreshToken: null, expiresAt: null, needsRefresh: false };
    }
    
    const now = Date.now() / 1000;
    const expiresAt = session.expires_at || 0;
    const needsRefresh = (expiresAt - now) < 300; // 5 minutes buffer
    
    return {
      isValid: true,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      needsRefresh
    };
  }
}
```

### Component 3: API Request Interceptor for Header Validation

```typescript
class APIRequestValidator {
  static async validateRequestHeaders(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log("Request Headers Validation:", {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // anon key
        authorization: `Bearer ${session.access_token}` // user token ✅
      });
    }
  }
}
```

## Implementation Plan

### Phase 1: Fix Login Components (High Priority)

#### AdminAuth.tsx Enhancement
- Extract access token from signInWithPassword response
- Add token validation logging
- Ensure ProfileService calls use authenticated context

#### UserAuth.tsx Enhancement  
- Extract access token from signInWithPassword response
- Add token validation logging
- Ensure user profile operations use authenticated context

### Phase 2: Enhance Session Management (Medium Priority)

#### SessionValidator Enhancement
- Add real-time token validation
- Implement automatic token refresh when needed
- Add comprehensive logging for token issues

#### Supabase Client Configuration Validation
- Verify automatic token management is working
- Add debugging for header configuration
- Ensure no manual header overrides conflict

### Phase 3: Add Request Monitoring (Low Priority)

#### API Request Monitoring
- Add request interceptor to log actual headers being sent
- Validate that Authorization header contains user token
- Alert on requests using anon key in Authorization header

## Testing Strategy

### Unit Tests
```typescript
describe('Authorization Header Fix', () => {
  test('should extract access token from login response', async () => {
    const mockResponse = {
      data: {
        user: { id: 'user-123' },
        session: { access_token: 'user-token-456' }
      }
    };
    
    const token = extractAccessToken(mockResponse);
    expect(token).toBe('user-token-456');
  });
  
  test('should use user token in Authorization header', async () => {
    // Mock authenticated request
    const headers = await getRequestHeaders();
    expect(headers.authorization).toMatch(/^Bearer [^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9]/);
  });
});
```

### Integration Tests
```typescript
describe('Database Access with Proper Authorization', () => {
  test('should successfully fetch user profile with authenticated token', async () => {
    // Login and get session
    await signInWithPassword({ email: 'test@example.com', password: 'password' });
    
    // Fetch profile - should work with proper authorization
    const profile = await ProfileService.getProfile('user-id');
    expect(profile).toBeDefined();
  });
});
```

## Monitoring and Validation

### Request Header Logging
```typescript
// Add to Supabase client or interceptor
const logRequestHeaders = (url: string, headers: HeadersInit) => {
  if (url.includes('/rest/v1/profiles')) {
    console.log('Profile Request Headers:', {
      url,
      apikey: headers['apikey']?.substring(0, 20) + '...',
      authorization: headers['authorization']?.substring(0, 20) + '...',
      isUserToken: !headers['authorization']?.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    });
  }
};
```

### Success Metrics
- All profile requests return 200 OK instead of 401/403
- Authorization header contains user access token, not anon key
- RLS policies work correctly for user data access
- No more PGRST116 or authentication-related errors

## Files to Modify

### Primary Files
1. `src/pages/AdminAuth.tsx` - Fix login token extraction
2. `src/pages/UserAuth.tsx` - Fix login token extraction  
3. `src/lib/session-validation.ts` - Enhance token validation
4. `src/integrations/supabase/client.ts` - Verify configuration

### Secondary Files
1. `src/lib/profile-service.ts` - Ensure authenticated requests
2. `src/lib/user-auth-service.ts` - Verify token handling
3. `src/pages/AdminProtected.tsx` - Add token validation
4. `src/pages/UserProtected.tsx` - Add token validation

## Success Criteria

1. **Functional**: Profile API requests return 200 OK with proper data
2. **Technical**: Authorization header contains user access token, not anon key
3. **User Experience**: No more authentication errors or permission denials
4. **Monitoring**: Clear logging shows proper token usage in all requests