# Authentication Error in User Creation via Supabase Function

## Overview

This document analyzes and provides a solution for the authentication error occurring when creating a new user via the Supabase Edge Function endpoint. The error manifests as:
```json
{
  "error": "Authentication error: Database error creating new user"
}
```

When calling the endpoint with:
```bash
curl -X POST "https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/users" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123",
    "name": "Test User",
    "phone": "+1234567890",
    "role": "user"
  }'
```

## Root Cause Analysis

### 1. Database Schema Inconsistency

The error is caused by a mismatch between the database schema and the user creation logic in the Edge Function:

1. **Missing 'user' role in enum**: In the initial migration (`20250902092743_a3f4b8e8-7daa-4d54-afb0-9f5e846ac558.sql`), the `user_role` enum was defined as:
   ```sql
   CREATE TYPE public.user_role AS ENUM ('admin', 'manager');
   ```

2. **Missing 'user' role in profile creation**: The `handle_new_user` function in the same migration only handled 'admin' and 'manager' roles.

3. **Incomplete migration fix**: Although migration `20250917000000_fix_user_registration_issues.sql` attempted to add the 'user' role to the enum, there might be inconsistencies in how the function handles role assignment.

### 2. Role Assignment Logic Issues

The `handle_new_user` function has complex logic for role assignment:
- It assigns 'admin' role to the first user
- For subsequent users, it tries to extract role from metadata
- If no role is specified, it defaults to 'user'
- However, if the 'user' role doesn't exist in the enum, this causes a database error

### 3. Error Handling Deficiencies

The Edge Function doesn't provide detailed error information, making debugging difficult. The generic "Database error creating new user" message doesn't reveal the underlying PostgreSQL constraint violation.

## Solution Design

### 1. Database Schema Update

Update the database schema to ensure the 'user' role exists in the enum:

```sql
-- Ensure 'user' role exists in the enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'user';

-- Update the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_from_metadata TEXT;
  assigned_role public.user_role;
BEGIN
  -- Extract role from metadata with fallback options
  user_role_from_metadata := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.user_metadata->>'role',
    'user'  -- Default to 'user' if no role specified
  );
  
  -- Determine role assignment logic with proper validation
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    assigned_role := 'admin'::public.user_role;
  ELSIF user_role_from_metadata IN ('user', 'admin', 'manager') THEN
    assigned_role := user_role_from_metadata::public.user_role;
  ELSE
    assigned_role := 'user'::public.user_role;  -- Default to 'user' for safety
  END IF;
  
  -- Insert profile with all required fields
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.user_metadata->>'name', NEW.email),
    assigned_role,
    'active'::public.user_status
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Edge Function Enhancement

Update the Edge Function to provide better error handling and logging:

```typescript
// In the POST /users section of the function
if (authError) {
  console.error('Auth error:', authError);
  // Check if it's a duplicate email error
  if (authError.message.includes('duplicate') || authError.message.includes('already exists')) {
    return new Response(JSON.stringify({ error: 'A user with this email already exists' }), { 
      status: 409, 
      headers: corsHeaders 
    });
  }
  // Check for role-related errors
  else if (authError.message.includes('invalid input value') && authError.message.includes('user_role')) {
    return new Response(JSON.stringify({ error: 'Invalid user role specified. Valid roles are: admin, manager, user' }), { 
      status: 400, 
      headers: corsHeaders 
    });
  }
  return new Response(JSON.stringify({ error: `Authentication error: ${authError.message}` }), { 
    status: 400, 
    headers: corsHeaders 
  });
}
```

### 3. Data Validation Improvements

Enhance the role validation in the Edge Function:

```typescript
// Validate role with more specific error messages
const validRoles = ['admin', 'manager', 'user'];
if (!validRoles.includes(role)) {
  return new Response(JSON.stringify({ 
    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    validRoles: validRoles
  }), { 
    status: 400, 
    headers: corsHeaders 
  });
}
```

## Implementation Steps

### 1. Database Migration

1. Create a new migration file to ensure the 'user' role exists in the enum:
   ```sql
   -- Add 'user' value to user_role enum if it doesn't exist
   ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'user';
   
   -- Update existing profiles with invalid roles
   UPDATE public.profiles 
   SET role = 'user' 
   WHERE role IS NULL OR role NOT IN ('admin', 'manager', 'user');
   ```

2. Update the `handle_new_user` function with improved error handling:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   DECLARE
     user_role_from_metadata TEXT;
     assigned_role public.user_role;
   BEGIN
     -- Extract role from metadata with fallback options
     user_role_from_metadata := COALESCE(
       NEW.raw_user_meta_data->>'role',
       NEW.user_metadata->>'role',
       'user'  -- Default to 'user' if no role specified
     );
     
     -- Determine role assignment logic with proper validation
     IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
       assigned_role := 'admin'::public.user_role;
     ELSIF user_role_from_metadata IN ('user', 'admin', 'manager') THEN
       assigned_role := user_role_from_metadata::public.user_role;
     ELSE
       assigned_role := 'user'::public.user_role;  -- Default to 'user' for safety
     END IF;
     
     -- Insert profile with all required fields
     INSERT INTO public.profiles (id, email, name, role, status)
     VALUES (
       NEW.id,
       NEW.email,
       COALESCE(NEW.raw_user_meta_data->>'name', NEW.user_metadata->>'name', NEW.email),
       assigned_role,
       'active'::public.user_status
     );
     
     RETURN NEW;
   EXCEPTION
     WHEN OTHERS THEN
       -- Log error but don't fail user creation
       RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

### 2. Edge Function Update

1. Update the error handling in the users Edge Function:
   ```typescript
   if (authError) {
     console.error('Auth error:', authError);
     // Check if it's a duplicate email error
     if (authError.message.includes('duplicate') || authError.message.includes('already exists')) {
       return new Response(JSON.stringify({ error: 'A user with this email already exists' }), { 
         status: 409, 
         headers: corsHeaders 
       });
     }
     // Check for role-related errors
     else if (authError.message.includes('invalid input value') && authError.message.includes('user_role')) {
       return new Response(JSON.stringify({ error: 'Invalid user role specified. Valid roles are: admin, manager, user' }), { 
         status: 400, 
         headers: corsHeaders 
       });
     }
     return new Response(JSON.stringify({ error: `Authentication error: ${authError.message}` }), { 
       status: 400, 
       headers: corsHeaders 
     });
   }
   ```

2. Enhance role validation:
   ```typescript
   // Validate role with more specific error messages
   const validRoles = ['admin', 'manager', 'user'];
   if (!validRoles.includes(role)) {
     return new Response(JSON.stringify({ 
       error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
       validRoles: validRoles
     }), { 
       status: 400, 
       headers: corsHeaders 
     });
   }
   ```

## Testing Strategy

### 1. Unit Tests for Database Functions

Create tests for the `handle_new_user` function:
- Test with valid roles ('admin', 'manager', 'user')
- Test with invalid roles (should default to 'user')
- Test first user registration (should get 'admin' role)
- Test subsequent user registration

### 2. Integration Tests for Edge Function

Create tests for the users Edge Function:
- Test user creation with valid data
- Test user creation with invalid roles
- Test duplicate email handling
- Test authentication with valid/invalid tokens

### 3. End-to-End Tests

Create end-to-end tests:
- Complete user registration flow
- User creation via admin API
- Profile retrieval after creation

## Error Handling Improvements

### 1. Detailed Error Messages

The updated implementation will provide more specific error messages:
- "Invalid user role specified. Valid roles are: admin, manager, user"
- "A user with this email already exists"
- "Authentication error: [specific database error]"

### 2. Logging Enhancement

Add structured logging to capture:
- User creation attempts
- Role assignment decisions
- Database errors with context

## Security Considerations

### 1. Role Assignment Validation

Ensure only valid roles can be assigned:
- Validate role values before database insertion
- Default to 'user' role for invalid values
- Restrict admin role assignment to appropriate contexts

### 2. Authentication Verification

Ensure proper authentication for user creation:
- Verify admin permissions for POST /users endpoint
- Validate JWT tokens properly
- Prevent unauthorized role escalation

## Performance Considerations

### 1. Database Query Optimization

- Ensure indexes exist on frequently queried columns
- Optimize the handle_new_user function for performance
- Minimize database round trips in the Edge Function

### 2. Caching Strategy

- Implement appropriate caching for user profile data
- Avoid unnecessary database queries

## Monitoring and Observability

### 1. Error Tracking

- Log all authentication errors with context
- Track error patterns for proactive issue resolution
- Monitor user creation success/failure rates

### 2. Metrics Collection

- Track user registration completion times
- Monitor database query performance
- Collect error rate metrics

## Conclusion

The authentication error when creating users via the Supabase Edge Function is primarily caused by a mismatch between the database schema and the application logic. The missing 'user' role in the `user_role` enum causes PostgreSQL to reject insert operations with valid 'user' role values.

By implementing the database schema updates, enhancing error handling in the Edge Function, and improving validation logic, we can resolve this issue and provide better error feedback to API consumers. The solution focuses on:

1. Ensuring database schema consistency
2. Improving error messages for easier debugging
3. Adding robust validation for role assignments
4. Implementing comprehensive testing to prevent regressions

These changes will make the user creation API more reliable and provide better developer experience when integrating with the system.

## Verification Steps

After implementing the fixes, verify the solution by:

1. Checking that all migrations have been applied successfully
2. Confirming the 'user' role exists in the `user_role` enum
3. Testing user creation with valid roles through the API
4. Verifying error messages are more descriptive for invalid inputs