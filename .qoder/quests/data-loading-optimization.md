# Data Loading Optimization for Admin Dashboard

## Overview

This document outlines the optimization strategy for the admin dashboard page to match the data loading behavior of the admin users page. Currently, the dashboard makes repeated requests every time the page is accessed, while the users page loads data once and then displays it from cache.

## Problem Analysis

### Current Behavior

1. **Admin Users Page (`/admin/users`)**:
   - Uses React Query with proper caching configuration
   - Data is fetched once and cached for 5 minutes
   - No repeated requests when navigating back to the page
   - Uses `refetchOnWindowFocus: false` to prevent unnecessary refetching

2. **Admin Dashboard Page (`/admin/dashboard`)**:
   - Uses a basic `useEffect` hook in `useUserStatistics` hook
   - No caching mechanism
   - Makes new requests every time the component mounts
   - No optimization for repeated data access

### Root Cause

The dashboard page uses a simple `useEffect` hook that fetches data every time the component is mounted, without any caching or stale-time configuration. In contrast, the users page leverages React Query's built-in caching and optimization features.

## Solution Design

### 1. Refactor `useUserStatistics` Hook

Replace the current implementation with React Query to match the pattern used in `useUsers` hook:

```typescript
// Current implementation
export const useUserStatistics = () => {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetches data every time component mounts
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        // Fetch total users with 'user' role
        const { count: totalUsers, error: totalError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user');

        if (totalError) throw new Error(totalError.message);

        // Fetch active users with 'user' role
        const { count: activeUsers, error: activeError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user')
          .eq('status', 'active');

        if (activeError) throw new Error(activeError.message);

        setStatistics({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          registeredUsers: totalUsers || 0, // For now, same as total users
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user statistics');
        console.error('Error fetching user statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);
  
  return { statistics, loading, error };
};

// New implementation
export const useUserStatistics = () => {
  return useQuery({
    queryKey: statisticsQueries.userStats(),
    queryFn: fetchUserStatistics,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
```

### 2. Create Query Keys Structure

Establish a consistent query keys structure for statistics data:

```typescript
export const statisticsQueries = {
  all: ["statistics"] as const,
  userStats: () => [...statisticsQueries.all, "user"] as const,
};
```

### 3. Implement Data Fetching Function

Create a dedicated function for fetching user statistics with proper error handling:

```typescript
const fetchUserStatistics = async (): Promise<UserStatistics> => {
  // Fetch total users with 'user' role
  const { count: totalUsers, error: totalError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  if (totalError) throw new Error(totalError.message);

  // Fetch active users with 'user' role
  const { count: activeUsers, error: activeError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('status', 'active');

  if (activeError) throw new Error(activeError.message);

  return {
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    registeredUsers: totalUsers || 0,
  };
};
```

### 4. Complete Hook Implementation

The complete implementation of the new hook:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  registeredUsers: number;
}

// Query Keys
export const statisticsQueries = {
  all: ["statistics"] as const,
  userStats: () => [...statisticsQueries.all, "user"] as const,
};

// Data fetching function
const fetchUserStatistics = async (): Promise<UserStatistics> => {
  // Fetch total users with 'user' role
  const { count: totalUsers, error: totalError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  if (totalError) throw new Error(totalError.message);

  // Fetch active users with 'user' role
  const { count: activeUsers, error: activeError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('status', 'active');

  if (activeError) throw new Error(activeError.message);

  return {
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    registeredUsers: totalUsers || 0, // For now, same as total users
  };
};

export const useUserStatistics = () => {
  return useQuery({
    queryKey: statisticsQueries.userStats(),
    queryFn: fetchUserStatistics,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
```

### 3. Implement Data Fetching Function

Create a dedicated function for fetching user statistics with proper error handling:

```typescript
const fetchUserStatistics = async (): Promise<UserStatistics> => {
  // Fetch total users with 'user' role
  const { count: totalUsers, error: totalError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user');

  if (totalError) throw new Error(totalError.message);

  // Fetch active users with 'user' role
  const { count: activeUsers, error: activeError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('status', 'active');

  if (activeError) throw new Error(activeError.message);

  return {
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    registeredUsers: totalUsers || 0,
  };
};
```

## Implementation Plan

### Phase 1: Hook Refactoring
1. Replace the entire content of `src/hooks/useUserStatistics.ts` with the new React Query implementation
2. Import `useQuery` from `@tanstack/react-query`
3. Define query keys structure for consistent caching
4. Extract data fetching logic into a dedicated async function
5. Configure caching parameters to match users page (5 min staleTime, 10 min gcTime)

### Phase 2: Component Updates
1. Update `UserStatisticsCard` component to work with new React Query interface
2. Change `const { statistics, loading, error } = useUserStatistics();` to `const { data: statistics, isLoading: loading, error } = useUserStatistics();`
3. Maintain existing UI and loading states
4. Ensure error handling remains consistent

### Phase 3: Testing and Validation
1. Verify data is cached and not refetched unnecessarily when navigating between pages
2. Test that data is refetched after the stale time (5 minutes) has expired
3. Confirm error handling works correctly with the new implementation
4. Validate that loading states display properly during initial fetch

## Technical Details

### Files to be Modified

1. `src/hooks/useUserStatistics.ts` - Replace entire hook implementation with React Query version
2. `src/components/admin/UserStatisticsCard.tsx` - Update hook usage to match new React Query interface

### React Query Configuration

The new hook will use the same configuration as the users page:

- `staleTime`: 5 minutes (300,000 ms)
- `gcTime`: 10 minutes (600,000 ms)
- `refetchOnWindowFocus`: false
- `retry`: 1 attempt

### Component Integration

The `UserStatisticsCard` component will need minimal changes to work with the new React Query interface:

```typescript
// Before
const { statistics, loading, error } = useUserStatistics();

// After
const { data: statistics, isLoading: loading, error } = useUserStatistics();
```

The component will access the data through the `data` property instead of the direct return value, and use `isLoading` instead of `loading`.

## Benefits

1. **Reduced API Calls**: Data will be cached and reused instead of making new requests
2. **Improved Performance**: Faster page loads after initial data fetch
3. **Consistent Architecture**: Aligns with the pattern used in other parts of the application
4. **Better User Experience**: Eliminates unnecessary loading states on repeated visits

## Testing Strategy

1. **Cache Verification**:
   - Navigate to dashboard page
   - Observe network requests in browser dev tools (should see one request to fetch statistics)
   - Navigate away and back to dashboard
   - Verify no new requests are made for cached data (no additional network requests)

2. **Stale Data Handling**:
   - Wait for stale time to expire (5 minutes)
   - Navigate to dashboard
   - Verify data is refetched when stale (new network request should appear)

3. **Error Handling**:
   - Simulate API failure (e.g., by temporarily disabling network or modifying query)
   - Verify error states display correctly
   - Test error recovery when API becomes available

4. **UI Consistency**:
   - Verify loading skeletons display correctly
   - Confirm error messages are user-friendly
   - Ensure data displays properly when loaded

5. **Behavior Matching Users Page**:
   - Compare dashboard page behavior with users page
   - Verify both pages now exhibit the same caching behavior
   - Confirm that neither page makes unnecessary requests on repeated visits

## Expected Outcomes

After implementing this optimization:

1. The admin dashboard page will load data once and cache it for 5 minutes
2. Repeated visits to the dashboard page will not trigger new network requests
3. The behavior will match that of the admin users page
4. Network traffic will be reduced
5. Page load times will improve after the initial data fetch
6. User experience will be more consistent across admin pages

## Rollback Plan

If issues arise after deployment:

1. Revert `src/hooks/useUserStatistics.ts` to previous implementation using `useState` and `useEffect`
2. Update `src/components/admin/UserStatisticsCard.tsx` to use old hook interface (`{ statistics, loading, error }`)
3. Monitor application for any side effects in dashboard or related components
4. Address root cause of issues before re-attempting optimization

### Previous Implementation Backup

The previous implementation should be backed up before making changes:

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  registeredUsers: number;
}

export const useUserStatistics = () => {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        // Fetch total users with 'user' role
        const { count: totalUsers, error: totalError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user');

        if (totalError) throw new Error(totalError.message);

        // Fetch active users with 'user' role
        const { count: activeUsers, error: activeError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user')
          .eq('status', 'active');

        if (activeError) throw new Error(activeError.message);

        setStatistics({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          registeredUsers: totalUsers || 0, // For now, same as total users
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user statistics');
        console.error('Error fetching user statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  return { statistics, loading, error };
};
```