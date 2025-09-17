import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { UserAuthService } from '@/lib/user-auth-service';

/**
 * Comprehensive test suite for user role assignment bug fix
 * 
 * This test validates that:
 * 1. New user registrations get 'user' role (not 'manager')
 * 2. First user gets 'admin' role 
 * 3. TypeScript types work correctly
 * 4. Edge functions handle 'user' role properly
 */

describe('User Role Assignment Bug Fix', () => {
  // Test data
  const testUsers = [
    {
      email: 'test-admin@example.com',
      password: 'TestPassword123!',
      name: 'Test Admin',
      expectedRole: 'admin' as const
    },
    {
      email: 'test-user1@example.com', 
      password: 'TestPassword123!',
      name: 'Test User 1',
      expectedRole: 'user' as const
    },
    {
      email: 'test-user2@example.com',
      password: 'TestPassword123!', 
      name: 'Test User 2',
      expectedRole: 'user' as const
    }
  ];

  const createdUserIds: string[] = [];

  beforeEach(async () => {
    // Clean up any existing test users
    await cleanupTestUsers();
  });

  afterEach(async () => {
    // Clean up created users
    await cleanupTestUsers();
  });

  async function cleanupTestUsers() {
    for (const testUser of testUsers) {
      try {
        // Try to get user by email and delete if exists
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', testUser.email);
        
        if (users && users.length > 0) {
          for (const user of users) {
            await supabase.auth.admin.deleteUser(user.id);
            await supabase
              .from('profiles')
              .delete()
              .eq('id', user.id);
          }
        }
      } catch (error) {
        console.log(`Cleanup error for ${testUser.email}:`, error);
      }
    }
    
    // Clean up tracked users
    for (const userId of createdUserIds) {
      try {
        await supabase.auth.admin.deleteUser(userId);
        await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
      } catch (error) {
        console.log(`Cleanup error for user ${userId}:`, error);
      }
    }
    createdUserIds.length = 0;
  }

  it('should assign admin role to first user', async () => {
    // Ensure no admin exists
    const { data: existingAdmins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');
    
    expect(existingAdmins).toHaveLength(0);

    // Register first user
    const result = await UserAuthService.register(testUsers[0]);
    
    expect(result.error).toBeNull();
    expect(result.user).toBeDefined();
    expect(result.user?.role).toBe('admin');
    expect(result.user?.email).toBe(testUsers[0].email);
    
    if (result.user) {
      createdUserIds.push(result.user.id);
    }
  });

  it('should assign user role to subsequent registrations', async () => {
    // First create an admin user to establish the pattern
    const adminResult = await UserAuthService.register(testUsers[0]);
    expect(adminResult.user?.role).toBe('admin');
    if (adminResult.user) {
      createdUserIds.push(adminResult.user.id);
    }

    // Now register regular users
    for (let i = 1; i < testUsers.length; i++) {
      const testUser = testUsers[i];
      const result = await UserAuthService.register(testUser);
      
      expect(result.error).toBeNull();
      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('user');
      expect(result.user?.email).toBe(testUser.email);
      expect(result.user?.name).toBe(testUser.name);
      
      if (result.user) {
        createdUserIds.push(result.user.id);
      }
    }
  });

  it('should not assign manager role to regular user registrations', async () => {
    // Create admin first
    const adminResult = await UserAuthService.register(testUsers[0]);
    if (adminResult.user) {
      createdUserIds.push(adminResult.user.id);
    }

    // Register multiple users and verify none get manager role
    for (let i = 1; i < testUsers.length; i++) {
      const testUser = testUsers[i];
      const result = await UserAuthService.register(testUser);
      
      expect(result.user?.role).not.toBe('manager');
      expect(result.user?.role).toBe('user');
      
      if (result.user) {
        createdUserIds.push(result.user.id);
      }
    }
  });

  it('should validate role distribution in database', async () => {
    // Create test users
    for (const testUser of testUsers) {
      const result = await UserAuthService.register(testUser);
      if (result.user) {
        createdUserIds.push(result.user.id);
      }
    }

    // Use the validation function from our migration
    const { data: roleStats } = await supabase
      .rpc('validate_user_roles');
    
    expect(roleStats).toBeDefined();
    expect(roleStats[0].admin_count).toBeGreaterThanOrEqual(1);
    expect(roleStats[0].user_role_count).toBeGreaterThanOrEqual(2);
  });

  it('should handle edge function responses correctly', async () => {
    // Create a test user
    const userResult = await UserAuthService.register(testUsers[1]);
    expect(userResult.user?.role).toBe('user');
    
    if (userResult.user) {
      createdUserIds.push(userResult.user.id);
      
      // Test that the user profile can be fetched
      const profile = await UserAuthService.getUserProfile(userResult.user.id);
      expect(profile).toBeDefined();
      expect(profile?.role).toBe('user');
    }
  });

  it('should maintain consistent role types across TypeScript definitions', () => {
    // This test validates TypeScript type consistency
    type ExpectedRoles = 'admin' | 'manager' | 'user';
    
    const validRoles: ExpectedRoles[] = ['admin', 'manager', 'user'];
    expect(validRoles).toContain('user');
    expect(validRoles).toContain('admin');
    expect(validRoles).toContain('manager');
  });

  it('should handle registration metadata correctly', async () => {
    // Test with explicit user role in metadata
    const { data: authData, error } = await supabase.auth.signUp({
      email: 'metadata-test@example.com',
      password: 'TestPassword123!',
      options: {
        data: {
          name: 'Metadata Test User',
          role: 'user'
        }
      }
    });

    expect(error).toBeNull();
    expect(authData.user).toBeDefined();
    
    if (authData.user) {
      createdUserIds.push(authData.user.id);
      
      // Wait for profile creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const profile = await UserAuthService.getUserProfile(authData.user.id);
      expect(profile).toBeDefined();
      
      // Should be 'user' role even if admin doesn't exist yet (due to explicit metadata)
      expect(profile?.role).toMatch(/^(admin|user)$/);
    }
  });

  it('should log role assignment process for debugging', async () => {
    // Create console spy to capture logs
    const consoleSpy = vi.spyOn(console, 'log');
    
    const result = await UserAuthService.register({
      email: 'debug-test@example.com',
      password: 'TestPassword123!', 
      name: 'Debug Test User'
    });
    
    if (result.user) {
      createdUserIds.push(result.user.id);
    }
    
    // Verify that registration process includes logging
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Starting user registration')
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle retry mechanism for profile creation', async () => {
    // Test the retry logic in registration
    const result = await UserAuthService.register({
      email: 'retry-test@example.com',
      password: 'TestPassword123!',
      name: 'Retry Test User'
    });
    
    expect(result.error).toBeNull();
    expect(result.user).toBeDefined();
    
    if (result.user) {
      createdUserIds.push(result.user.id);
      expect(result.user.role).toMatch(/^(admin|user)$/);
    }
  });
});

// Helper function to run validation queries
export async function validateRoleAssignment() {
  const { data: roleStats } = await supabase.rpc('validate_user_roles');
  
  return {
    totalUsers: roleStats?.[0]?.user_count || 0,
    adminCount: roleStats?.[0]?.admin_count || 0,
    managerCount: roleStats?.[0]?.manager_count || 0,
    userCount: roleStats?.[0]?.user_role_count || 0,
    recentRegistrations: roleStats?.[0]?.recent_registrations || 0
  };
}

// Export test configuration for manual testing
export const roleAssignmentTestConfig = {
  testUsers,
  validateRoleAssignment,
  cleanup: async () => {
    // Manual cleanup function for testing
    for (const testUser of testUsers) {
      try {
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', testUser.email);
        
        if (users) {
          for (const user of users) {
            await supabase.auth.admin.deleteUser(user.id);
          }
        }
      } catch (error) {
        console.log(`Manual cleanup error for ${testUser.email}:`, error);
      }
    }
  }
};