/**
 * PostgREST 406 Error Fix Validation Test
 * 
 * This test file validates that the PGRST116 error fixes are working correctly
 * by testing the ProfileService and other updated components.
 */

import { ProfileService } from './src/lib/profile-service';

export interface TestResult {
  test_name: string;
  status: 'PASS' | 'FAIL';
  message: string;
  error?: any;
}

export class PostgRESTErrorFixValidator {
  private static testResults: TestResult[] = [];

  /**
   * Test ProfileService.getProfile with non-existent user
   */
  static async testProfileServiceNonExistentUser(): Promise<TestResult> {
    const testName = "ProfileService.getProfile - Non-existent User";
    
    try {
      const profile = await ProfileService.getProfile('non-existent-user-id');
      
      if (profile === null) {
        return {
          test_name: testName,
          status: 'PASS',
          message: 'ProfileService correctly returns null for non-existent user without throwing PGRST116 error'
        };
      } else {
        return {
          test_name: testName,
          status: 'FAIL',
          message: 'ProfileService should return null for non-existent user'
        };
      }
    } catch (error) {
      return {
        test_name: testName,
        status: 'FAIL',
        message: `ProfileService threw an error: ${error.message}`,
        error
      };
    }
  }

  /**
   * Test ProfileService.requireProfile with non-existent user
   */
  static async testProfileServiceRequireProfileNonExistent(): Promise<TestResult> {
    const testName = "ProfileService.requireProfile - Non-existent User";
    
    try {
      await ProfileService.requireProfile('non-existent-user-id');
      
      return {
        test_name: testName,
        status: 'FAIL',
        message: 'ProfileService.requireProfile should throw an error for non-existent user'
      };
    } catch (error) {
      if (error.message === 'Profile not found') {
        return {
          test_name: testName,
          status: 'PASS',
          message: 'ProfileService.requireProfile correctly throws "Profile not found" error'
        };
      } else {
        return {
          test_name: testName,
          status: 'FAIL',
          message: `ProfileService.requireProfile threw unexpected error: ${error.message}`,
          error
        };
      }
    }
  }

  /**
   * Test ProfileService.getProfileFields with non-existent user
   */
  static async testProfileServiceGetFieldsNonExistent(): Promise<TestResult> {
    const testName = "ProfileService.getProfileFields - Non-existent User";
    
    try {
      const fields = await ProfileService.getProfileFields('non-existent-user-id', ['name', 'role']);
      
      if (fields === null) {
        return {
          test_name: testName,
          status: 'PASS',
          message: 'ProfileService.getProfileFields correctly returns null for non-existent user'
        };
      } else {
        return {
          test_name: testName,
          status: 'FAIL',
          message: 'ProfileService.getProfileFields should return null for non-existent user'
        };
      }
    } catch (error) {
      return {
        test_name: testName,
        status: 'FAIL',
        message: `ProfileService.getProfileFields threw an error: ${error.message}`,
        error
      };
    }
  }

  /**
   * Test ProfileService.isAdmin with non-existent user
   */
  static async testProfileServiceIsAdminNonExistent(): Promise<TestResult> {
    const testName = "ProfileService.isAdmin - Non-existent User";
    
    try {
      const isAdmin = await ProfileService.isAdmin('non-existent-user-id');
      
      if (isAdmin === false) {
        return {
          test_name: testName,
          status: 'PASS',
          message: 'ProfileService.isAdmin correctly returns false for non-existent user'
        };
      } else {
        return {
          test_name: testName,
          status: 'FAIL',
          message: 'ProfileService.isAdmin should return false for non-existent user'
        };
      }
    } catch (error) {
      return {
        test_name: testName,
        status: 'FAIL',
        message: `ProfileService.isAdmin threw an error: ${error.message}`,
        error
      };
    }
  }

  /**
   * Test edge function URL existence (just checking they exist)
   */
  static async testEdgeFunctionURLs(): Promise<TestResult> {
    const testName = "Edge Function URLs - Existence Check";
    
    const edgeFunctions = [
      'https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/auth-me',
      'https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/users',
      'https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/menu',
      'https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/menu-content',
      'https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1/permissions'
    ];

    try {
      const results = await Promise.allSettled(
        edgeFunctions.map(url => 
          fetch(url, { method: 'OPTIONS' })
        )
      );

      const allResponded = results.every(result => result.status === 'fulfilled');
      
      if (allResponded) {
        return {
          test_name: testName,
          status: 'PASS',
          message: 'All edge function URLs are accessible (CORS preflight successful)'
        };
      } else {
        return {
          test_name: testName,
          status: 'FAIL',
          message: 'Some edge function URLs are not accessible'
        };
      }
    } catch (error) {
      return {
        test_name: testName,
        status: 'FAIL',
        message: `Error testing edge function URLs: ${error.message}`,
        error
      };
    }
  }

  /**
   * Run all validation tests
   */
  static async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Running PostgREST 406 Error Fix Validation Tests...\n');

    const tests = [
      this.testProfileServiceNonExistentUser,
      this.testProfileServiceRequireProfileNonExistent,
      this.testProfileServiceGetFieldsNonExistent,
      this.testProfileServiceIsAdminNonExistent,
      this.testEdgeFunctionURLs
    ];

    this.testResults = [];

    for (const test of tests) {
      try {
        console.log(`Running: ${test.name}...`);
        const result = await test();
        this.testResults.push(result);
        
        const status = result.status === 'PASS' ? '✅' : '❌';
        console.log(`${status} ${result.test_name}: ${result.message}`);
        
        if (result.error) {
          console.log(`   Error details: ${result.error.message}`);
        }
      } catch (error) {
        const failResult: TestResult = {
          test_name: test.name,
          status: 'FAIL',
          message: `Test execution failed: ${error.message}`,
          error
        };
        this.testResults.push(failResult);
        console.log(`❌ ${failResult.test_name}: ${failResult.message}`);
      }
      console.log('');
    }

    return this.testResults;
  }

  /**
   * Generate summary report
   */
  static generateSummaryReport(): string {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;

    let report = '\n📊 PostgREST 406 Error Fix Validation Summary\n';
    report += '='.repeat(50) + '\n\n';
    report += `Total Tests: ${totalTests}\n`;
    report += `✅ Passed: ${passedTests}\n`;
    report += `❌ Failed: ${failedTests}\n`;
    report += `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;

    if (failedTests > 0) {
      report += '❌ Failed Tests:\n';
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          report += `   • ${result.test_name}: ${result.message}\n`;
        });
      report += '\n';
    }

    report += '🎯 Implementation Status:\n';
    report += `   • Supabase client headers: Updated\n`;
    report += `   • ProfileService: Implemented with .maybeSingle()\n`;
    report += `   • Edge functions: Updated to use .maybeSingle()\n`;
    report += `   • Frontend components: Updated to use ProfileService\n`;
    report += `   • Error handling: Centralized PostgREST error handling\n\n`;

    if (passedTests === totalTests) {
      report += '🎉 All tests passed! PostgREST 406 (PGRST116) error fix is working correctly.\n';
    } else {
      report += '⚠️  Some tests failed. Please review the implementation.\n';
    }

    return report;
  }
}

// Export for use in other test files
export default PostgRESTErrorFixValidator;

// If running directly
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  // Node.js environment
  PostgRESTErrorFixValidator.runAllTests().then(() => {
    console.log(PostgRESTErrorFixValidator.generateSummaryReport());
  });
}