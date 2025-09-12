# Supabase Edge Functions Token Handling Implementation Summary

## Overview

This document summarizes the implementation of proper authentication token handling in Supabase Edge Functions, following Supabase's recommended patterns where only one authentication method should be used per request:

1. For anonymous/unauthenticated requests: Only the `apikey` header
2. For authenticated user requests: Only the `authorization: Bearer <session_token>` header

## Changes Made

### Phase 1: Edge Function Updates

All Edge Functions (`users`, `auth-me`, `menu`, `menu-content`, `permissions`) were updated to properly handle both authentication methods:

#### Before:
```typescript
const supabaseClient = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! },
    },
  }
)
```

#### After:
```typescript
// Handle both authentication methods per Supabase recommendations
const authHeader = req.headers.get('Authorization');
const apiKey = req.headers.get('apikey');

let supabaseClient;

if (authHeader && authHeader.startsWith('Bearer ')) {
  // Authenticated user request
  supabaseClient = createClient<Database>(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );
} else if (apiKey) {
  // Anonymous request
  supabaseClient = createClient<Database>(
    Deno.env.get('SUPABASE_URL') ?? '',
    apiKey,
    {}
  );
} else {
  // No authentication provided
  return new Response(
    JSON.stringify({ error: 'Missing authentication' }),
    { status: 401, headers: corsHeaders }
  );
}
```

### Phase 2: Frontend Service Updates

The [user-service.ts](file:///Users/oleg/Desktop/xml/lovable-rise-1/src/lib/user-service.ts) was updated to conditionally send the correct authentication header:

#### Before:
```typescript
headers: { 
  "Content-Type": "application/json",
  "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
}
```

#### After:
```typescript
// Helper function to get the appropriate authentication header
async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = { 
    "Content-Type": "application/json"
  };
  
  if (session.data.session) {
    // Use Authorization header for authenticated users
    headers["Authorization"] = `Bearer ${session.data.session.access_token}`;
  } else {
    // Use apikey header for anonymous requests
    headers["apikey"] = "SUPABASE_ANON_KEY";
  }
  
  return headers;
}
```

All function invocation calls were updated to use this helper function:
```typescript
const response = await supabase.functions.invoke("users" + url, {
  method: "GET",
  headers: await getAuthHeaders()
});
```

## Benefits

1. **Compliance**: Aligns with Supabase's recommended authentication patterns
2. **Security**: Reduces potential attack vectors by using proper authentication methods
3. **Performance**: Eliminates unnecessary header overhead
4. **Maintainability**: Creates a clearer authentication model for future development

## Testing

A test file [test-token-auth-implementation.ts](file:///Users/oleg/Desktop/xml/lovable-rise-1/test-token-auth-implementation.ts) has been created to validate:
- Edge Functions properly handle apikey header for anonymous requests
- Edge Functions properly handle Authorization header for authenticated requests
- Frontend service sends correct headers based on authentication state

## Rollback Plan

If issues arise after deployment:
1. Revert Edge Function changes to previous implementation
2. Restore frontend service to previous authentication method
3. Monitor logs for any authentication-related errors
4. Communicate with team about the rollback and issues encountered