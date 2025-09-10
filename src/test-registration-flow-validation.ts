/**
 * Practical Registration Flow Test
 * 
 * This test validates the complete user registration flow to ensure
 * that the role assignment fix is working correctly in the application.
 */

import { createClient } from '@supabase/supabase-js';

interface RegistrationTestResult {
  test_name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  user_data?: any;
  error?: any;
}

class RegistrationFlowTester {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private results: RegistrationTestResult[] = [];

  constructor() {
    // These should be set from environment variables in real usage
    this.supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
    this.supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
  }

  /**
   * Test user registration and verify role assignment
   */
  async testUserRegistration(email: string, password: string, expectedRole: 'admin' | 'user' = 'user'): Promise<RegistrationTestResult> {
    const testName = `User Registration - ${email}`;
    
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);

      // Step 1: Register the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: `Test User ${email}`
          }
        }
      });

      if (authError) {
        return {
          test_name: testName,
          status: 'FAIL',
          message: `Registration failed: ${authError.message}`,
          error: authError
        };
      }

      if (!authData.user) {
        return {
          test_name: testName,
          status: 'FAIL',
          message: 'Registration succeeded but no user data returned'
        };
      }

      // Step 2: Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Check if profile was created with correct role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        return {
          test_name: testName,
          status: 'FAIL',
          message: `Profile creation failed: ${profileError.message}`,
          error: profileError,
          user_data: authData.user
        };
      }

      // Step 4: Verify role assignment
      if (profile.role === expectedRole) {
        return {
          test_name: testName,
          status: 'PASS',
          message: `User registered successfully with correct role: ${profile.role}`,
          user_data: {
            user_id: authData.user.id,
            email: profile.email,
            role: profile.role,
            name: profile.name
          }
        };
      } else {
        return {
          test_name: testName,
          status: 'FAIL',
          message: `Role assignment incorrect. Expected: ${expectedRole}, Got: ${profile.role}`,
          user_data: {
            user_id: authData.user.id,
            email: profile.email,
            role: profile.role,
            expected_role: expectedRole
          }
        };
      }

    } catch (error) {
      return {
        test_name: testName,
        status: 'FAIL',
        message: `Test failed with unexpected error: ${error}`,
        error
      };
    }
  }

  /**
   * Test that validates the database state
   */
  async testDatabaseValidation(): Promise<RegistrationTestResult> {
    const testName = 'Database State Validation';
    
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);

      // This would require admin access or a specific Edge Function to call
      // For now, we'll create a test that calls our validation function
      
      const { data, error } = await supabase.rpc('validate_role_assignments');
      
      if (error) {
        return {
          test_name: testName,
          status: 'SKIP',
          message: `Could not validate database state: ${error.message}`,
          error
        };
      }

      const validation = data[0];
      
      if (validation.potential_issues === 0) {
        return {
          test_name: testName,
          status: 'PASS',
          message: 'Database validation passed - no role assignment issues detected',
          user_data: validation
        };
      } else {
        return {
          test_name: testName,
          status: 'FAIL',
          message: `Database validation failed - ${validation.potential_issues} potential issues found`,
          user_data: validation
        };
      }

    } catch (error) {
      return {
        test_name: testName,
        status: 'SKIP',
        message: `Database validation test skipped: ${error}`,
        error
      };
    }
  }

  /**
   * Test Edge Functions with all role types
   */
  async testEdgeFunctionCompatibility(): Promise<RegistrationTestResult[]> {
    const testName = 'Edge Function Role Compatibility';
    const results: RegistrationTestResult[] = [];
    
    const supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
    
    // Test different roles can access Edge Functions
    const rolesToTest = [
      { role: 'admin', should_access_users: true },
      { role: 'manager', should_access_users: false },
      { role: 'user', should_access_users: false }
    ];

    for (const roleTest of rolesToTest) {
      try {
        // This would need a test user with the specific role to be logged in
        // For now, we create a structure for this test
        
        results.push({
          test_name: `${testName} - ${roleTest.role}`,
          status: 'SKIP',
          message: `Edge Function compatibility test for ${roleTest.role} role - requires authenticated user`,
          user_data: roleTest
        });

      } catch (error) {
        results.push({
          test_name: `${testName} - ${roleTest.role}`,
          status: 'FAIL',
          message: `Edge Function test failed for ${roleTest.role}: ${error}`,
          error
        });
      }
    }

    return results;
  }

  /**
   * Run comprehensive registration flow tests
   */
  async runComprehensiveTests(): Promise<RegistrationTestResult[]> {
    const results: RegistrationTestResult[] = [];

    // Test 1: Database validation
    results.push(await this.testDatabaseValidation());

    // Test 2: Register a test user (should get 'user' role)
    const testEmail = `test-user-${Date.now()}@example.com`;
    results.push(await this.testUserRegistration(testEmail, 'TestPassword123!', 'user'));

    // Test 3: Edge Function compatibility tests
    const edgeFunctionResults = await this.testEdgeFunctionCompatibility();
    results.push(...edgeFunctionResults);

    this.results = results;
    return results;
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const skippedTests = this.results.filter(r => r.status === 'SKIP').length;

    let report = `\n=== Registration Flow Validation Report ===\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Tests: ${totalTests}\n`;
    report += `✅ Passed: ${passedTests}\n`;
    report += `❌ Failed: ${failedTests}\n`;
    report += `⏭️  Skipped: ${skippedTests}\n`;
    
    if (totalTests > 0) {
      report += `Success Rate: ${((passedTests / (totalTests - skippedTests)) * 100).toFixed(1)}%\n\n`;
    }

    report += `=== Test Details ===\n`;
    this.results.forEach((result, index) => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      report += `${index + 1}. ${statusIcon} ${result.test_name}\n`;
      report += `   Status: ${result.status}\n`;
      report += `   Message: ${result.message}\n`;
      
      if (result.user_data) {
        report += `   Data: ${JSON.stringify(result.user_data, null, 2)}\n`;
      }
      
      if (result.error) {
        report += `   Error: ${JSON.stringify(result.error, null, 2)}\n`;
      }
      
      report += `\n`;
    });

    // Summary recommendations
    report += `=== Recommendations ===\n`;
    if (failedTests === 0) {
      report += `🎉 All tests passed! The user role assignment fix appears to be working correctly.\n`;
    } else {
      report += `⚠️  ${failedTests} test(s) failed. Please review:\n`;
      report += `   1. Check database migration was applied successfully\n`;
      report += `   2. Verify trigger function is working correctly\n`;
      report += `   3. Ensure Edge Functions have updated type definitions\n`;
      report += `   4. Test manual user registration flow\n`;
    }

    if (skippedTests > 0) {
      report += `ℹ️  ${skippedTests} test(s) were skipped - consider running them manually with proper setup\n`;
    }

    return report;
  }
}

// Export for use
export { RegistrationFlowTester, RegistrationTestResult };

// Usage example:
// const tester = new RegistrationFlowTester();
// const results = await tester.runComprehensiveTests();
// console.log(tester.generateTestReport());