# Supabase Edge Functions Token Handling Design

## Overview

This document outlines the design solution for properly handling authentication tokens in Supabase Edge Functions. Currently, the implementation sends both apikey and authorization headers in requests to Edge Functions, which is incorrect. Supabase Edge Functions expect only one authentication method per request:

1. For anonymous/unauthenticated requests: Only the apikey header should be present
2. For authenticated user requests: Only the authorization: Bearer <session_token> header should be present

## Current Issues

### Problem Analysis

1. **Incorrect Header Usage**: The current frontend implementation always sends an Authorization header, even when it might be more appropriate to use the apikey header for certain operations.

2. **Edge Function Configuration**: The Edge Functions are configured to always expect an Authorization header, but they should be more flexible in handling different authentication scenarios.

3. **Potential Security Concerns**: Sending multiple authentication headers might lead to unexpected behavior or security issues.

## Proposed Solution

### 1. Frontend Client Modification

The frontend should automatically determine which authentication method to use based on the user's session status. When a user is authenticated, the system should use the Authorization header with their session token. For anonymous requests, the system should use the apikey header with the Supabase anonymous key.

### 2. Edge Function Enhancement

Modify Edge Functions to properly handle both authentication methods by checking which header is present in the request. If an Authorization header with a Bearer token is present, treat it as an authenticated user request. If an apikey header is present, treat it as an anonymous request. If neither is present, return an appropriate authentication error.

## Implementation Plan

### Phase 1: Edge Function Updates

1. Modify all Edge Functions to properly handle both authentication methods
2. Update authentication validation logic to check for the appropriate header
3. Maintain backward compatibility during the transition period

### Phase 2: Frontend Service Updates

1. Update user service implementations to conditionally send the correct authentication header
2. Modify all function invocation calls to use the appropriate authentication method
3. Implement helper functions to determine the correct header to send

### Phase 3: Testing and Validation

1. Test authenticated user flows with Authorization header
2. Test anonymous flows with apikey header
3. Verify backward compatibility with existing implementations
4. Performance testing to ensure no degradation

## Security Considerations

1. **Header Validation**: Ensure only one authentication method is accepted per request
2. **Token Validation**: Properly validate JWT tokens when using Authorization header
3. **Key Security**: Protect the anon key and ensure it's only used for appropriate operations
4. **Error Handling**: Provide appropriate error messages without revealing sensitive information

## Benefits

1. **Compliance**: Aligns with Supabase's recommended authentication patterns
2. **Security**: Reduces potential attack vectors by using proper authentication methods
3. **Performance**: Eliminates unnecessary header overhead
4. **Maintainability**: Creates a clearer authentication model for future development

## Rollback Plan

If issues arise after deployment:

1. Revert Edge Function changes to previous implementation
2. Restore frontend service to previous authentication method
3. Monitor logs for any authentication-related errors
4. Communicate with team about the rollback and issues encountered