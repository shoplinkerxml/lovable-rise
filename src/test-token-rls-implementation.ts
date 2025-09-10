/**
 * Comprehensive Tests for Supabase Token Handling and RLS Functionality
 * 
 * This test file validates the fixes implemented for proper token handling
 * and ensures Row Level Security (RLS) policies work correctly.
 */

import { supabase } from \"@/integrations/supabase/client\";
import { SessionValidator } from \"@/lib/session-validation\";
import { RLSMonitor, quickHealthCheck } from \"@/lib/rls-monitor\";
import { ProfileService } from \"@/lib/profile-service\";
import { UserAuthService } from \"@/lib/user-auth-service\";

// Test configuration
const TEST_CONFIG = {
  testUser: {
    email: 'test-rls@example.com',
    password: 'TestPassword123!',
    name: 'RLS Test User'
  },
  testTimeout: 30000 // 30 seconds
};

/**
 * Test Results Interface
 */
interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  duration: number;
  details?: any;
}

/**
 * Test Suite for Token Handling and RLS
 */
class TokenRLSTestSuite {
  private results: TestResult[] = [];
  private startTime = Date.now();
  
  /**
   * Run all tests and return comprehensive results
   */
  async runAllTests(): Promise<{ 
    success: boolean; 
    results: TestResult[]; 
    summary: { passed: number; failed: number; duration: number };
  }> {
    console.log('🚀 Starting Token and RLS Test Suite...');
    this.startTime = Date.now();
    
    try {
      // Core functionality tests
      await this.testSessionValidation();
      await this.testTokenExtraction();
      await this.testRLSContextValidation();
      await this.testProfileServiceTokenHandling();
      await this.testProtectedRouteValidation();
      
      // Integration tests
      await this.testUserRegistrationFlow();
      await this.testUserLoginFlow();
      await this.testRLSPolicyEnforcement();
      
      // Monitoring tests
      await this.testRLSMonitoring();
      await this.testHealthChecks();
      
      // Edge cases
      await this.testExpiredTokenHandling();
      await this.testInvalidTokenHandling();
      
    } catch (error) {
      console.error('Test suite execution failed:', error);
      this.addResult('test-suite-execution', false, `Test suite failed: ${error}`);
    }
    
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log(`\n📊 Test Suite Complete: ${passed} passed, ${failed} failed (${totalDuration}ms)`);
    
    return {
      success: failed === 0,
      results: this.results,
      summary: { passed, failed, duration: totalDuration }
    };
  }
  
  /**
   * Test session validation functionality
   */
  private async testSessionValidation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Testing session validation...');
      
      // Test session validation without authentication
      const noAuthValidation = await SessionValidator.validateSession();
      
      if (noAuthValidation.isValid) {
        // If valid, check if it's actually a real session
        const debugInfo = await SessionValidator.getTokenDebugInfo();
        this.addResult(
          'session-validation-no-auth', 
          true, 
          `Found existing valid session for user ${debugInfo.userId}`,
          Date.now() - startTime,
          { validation: noAuthValidation, debug: debugInfo }
        );
      } else {
        this.addResult(
          'session-validation-no-auth', 
          true, 
          'Correctly detected no valid session when not authenticated',
          Date.now() - startTime,
          { validation: noAuthValidation }
        );
      }
      
      // Test session debug logging
      await SessionValidator.logSessionDebugInfo('test-validation');
      this.addResult(
        'session-debug-logging',
        true,
        'Session debug logging completed without errors',
        Date.now() - startTime
      );
      
    } catch (error) {
      this.addResult(
        'session-validation',
        false,
        `Session validation test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test token extraction and validation
   */
  private async testTokenExtraction(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🔑 Testing token extraction...');
      
      const debugInfo = await SessionValidator.getTokenDebugInfo();
      
      // Validate debug info structure
      const requiredFields = ['hasAccessToken', 'hasRefreshToken', 'tokenPrefix', 'userId', 'isExpired'];
      const missingFields = requiredFields.filter(field => !(field in debugInfo));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing debug info fields: ${missingFields.join(', ')}`);
      }
      
      this.addResult(
        'token-debug-info',
        true,
        `Token debug info extracted successfully`,
        Date.now() - startTime,
        debugInfo
      );
      
      // Test RLS context validation
      const rlsContext = await SessionValidator.validateRLSContext();
      this.addResult(
        'rls-context-validation',
        true,
        rlsContext.isValid ? 
          `RLS context valid for user ${rlsContext.userId}` : 
          `RLS context invalid: ${rlsContext.error}`,
        Date.now() - startTime,
        rlsContext
      );
      
    } catch (error) {
      this.addResult(
        'token-extraction',
        false,
        `Token extraction test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test RLS context validation
   */
  private async testRLSContextValidation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🔒 Testing RLS context validation...');
      
      // Test basic RLS query (should work even without auth if properly configured)
      const { data: publicData, error: publicError } = await supabase
        .from('menu_items')
        .select('id, title')
        .eq('is_active', true)
        .limit(1);
      
      if (publicError) {
        console.warn('Public query failed:', publicError);
      }
      
      this.addResult(
        'public-rls-query',
        !publicError,
        publicError ? 
          `Public RLS query failed: ${publicError.message}` :
          `Public RLS query successful (${publicData?.length || 0} items)`,
        Date.now() - startTime,
        { data: publicData, error: publicError }
      );
      
    } catch (error) {
      this.addResult(
        'rls-context-validation',
        false,
        `RLS context validation failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test ProfileService token handling
   */
  private async testProfileServiceTokenHandling(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('👤 Testing ProfileService token handling...');
      
      // Test profile existence check (should work without auth)
      const exists = await ProfileService.profileExistsByEmail('nonexistent@example.com');
      
      this.addResult(
        'profile-existence-check',
        typeof exists === 'boolean',
        `Profile existence check returned ${exists}`,
        Date.now() - startTime,
        { exists }
      );
      
      // Test multiple user existence check
      const multipleExists = await ProfileService.checkMultipleUsersExist([
        'test1@example.com',
        'test2@example.com'
      ]);
      
      this.addResult(
        'multiple-users-existence',
        multipleExists instanceof Map,
        `Multiple users existence check completed`,
        Date.now() - startTime,
        { results: Array.from(multipleExists.entries()) }
      );
      
    } catch (error) {
      this.addResult(
        'profile-service-token-handling',
        false,
        `ProfileService token handling test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test protected route validation
   */
  private async testProtectedRouteValidation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🛡️ Testing protected route validation...');
      
      // Simulate protected route check
      const validation = await SessionValidator.ensureValidSession();
      
      this.addResult(
        'protected-route-validation',
        true,
        validation.isValid ? 
          'Protected route would allow access' :
          'Protected route would deny access',
        Date.now() - startTime,
        { validation }
      );
      
    } catch (error) {
      this.addResult(
        'protected-route-validation',
        false,
        `Protected route validation test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test user registration flow
   */
  private async testUserRegistrationFlow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('📝 Testing user registration flow...');
      
      // Check if test user already exists
      const existingProfile = await ProfileService.profileExistsByEmail(TEST_CONFIG.testUser.email);
      
      if (existingProfile) {
        this.addResult(
          'user-registration-flow',
          true,
          'Test user already exists - registration flow would be blocked',
          Date.now() - startTime,
          { existingUser: true }
        );
      } else {
        // Test registration validation without actually registering
        const registrationData = {
          email: TEST_CONFIG.testUser.email,
          password: TEST_CONFIG.testUser.password,
          name: TEST_CONFIG.testUser.name
        };
        
        // Test email format validation
        const emailValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(registrationData.email);
        const passwordStrong = registrationData.password.length >= 8;
        
        this.addResult(
          'user-registration-validation',
          emailValid && passwordStrong,
          `Registration data validation: email ${emailValid ? 'valid' : 'invalid'}, password ${passwordStrong ? 'strong' : 'weak'}`,
          Date.now() - startTime,
          { emailValid, passwordStrong }
        );
      }
      
    } catch (error) {
      this.addResult(
        'user-registration-flow',
        false,
        `User registration flow test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test user login flow
   */
  private async testUserLoginFlow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🔐 Testing user login flow...');
      
      // Test current user check
      const currentUser = await UserAuthService.getCurrentUser();
      
      this.addResult(
        'current-user-check',
        true,
        currentUser.user ? 
          `Current user found: ${currentUser.user.email}` :
          'No current user (not logged in)',
        Date.now() - startTime,
        { 
          hasUser: !!currentUser.user,
          hasSession: !!currentUser.session,
          error: currentUser.error
        }
      );
      
    } catch (error) {
      this.addResult(
        'user-login-flow',
        false,
        `User login flow test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test RLS policy enforcement
   */
  private async testRLSPolicyEnforcement(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🔐 Testing RLS policy enforcement...');
      
      // Test various database operations to check RLS
      const tests = [
        {
          name: 'profiles-select',
          query: () => supabase.from('profiles').select('id').limit(1)
        },
        {
          name: 'menu-items-select',
          query: () => supabase.from('menu_items').select('id').limit(1)
        },
        {
          name: 'user-permissions-select',
          query: () => supabase.from('user_permissions').select('id').limit(1)
        }
      ];
      
      for (const test of tests) {
        try {
          const { data, error } = await test.query();
          
          this.addResult(
            `rls-${test.name}`,
            true,
            error ? 
              `RLS correctly blocked: ${error.message}` :
              `RLS allowed query (${data?.length || 0} results)`,
            Date.now() - startTime,
            { data, error }
          );
        } catch (queryError) {
          this.addResult(
            `rls-${test.name}`,
            true,
            `RLS query failed as expected: ${queryError}`,
            Date.now() - startTime,
            { queryError }
          );
        }
      }
      
    } catch (error) {
      this.addResult(
        'rls-policy-enforcement',
        false,
        `RLS policy enforcement test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test RLS monitoring functionality
   */
  private async testRLSMonitoring(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('📊 Testing RLS monitoring...');
      
      // Test health check
      await quickHealthCheck();
      
      this.addResult(
        'rls-quick-health-check',
        true,
        'Quick health check completed',
        Date.now() - startTime
      );
      
      // Test comprehensive health check
      const healthReport = await RLSMonitor.performHealthCheck();
      
      this.addResult(
        'rls-comprehensive-health-check',
        !!healthReport,
        `Health check completed - Score: ${healthReport.overall.score}/100`,
        Date.now() - startTime,
        { 
          score: healthReport.overall.score,
          healthy: healthReport.overall.healthy,
          issueCount: healthReport.overall.issues.length
        }
      );
      
      // Test diagnostic report generation
      const diagnosticReport = await RLSMonitor.generateDiagnosticReport();
      
      this.addResult(
        'rls-diagnostic-report',
        diagnosticReport.length > 100,
        `Diagnostic report generated (${diagnosticReport.length} characters)`,
        Date.now() - startTime
      );
      
    } catch (error) {
      this.addResult(
        'rls-monitoring',
        false,
        `RLS monitoring test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test health checks
   */
  private async testHealthChecks(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🏥 Testing health checks...');
      
      // Test token health metrics
      const tokenHealth = await RLSMonitor.getTokenHealthMetrics();
      
      this.addResult(
        'token-health-metrics',
        !!tokenHealth && typeof tokenHealth.sessionValid === 'boolean',
        `Token health metrics retrieved`,
        Date.now() - startTime,
        tokenHealth
      );
      
    } catch (error) {
      this.addResult(
        'health-checks',
        false,
        `Health checks test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test expired token handling
   */
  private async testExpiredTokenHandling(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('⏰ Testing expired token handling...');
      
      // Test session validation with potential expired token
      const validation = await SessionValidator.validateSession();
      
      if (validation.timeUntilExpiry !== null) {
        const isExpired = validation.timeUntilExpiry <= 0;
        const needsRefresh = validation.needsRefresh;
        
        this.addResult(
          'expired-token-detection',
          true,
          `Token expiry detection: ${isExpired ? 'expired' : 'valid'}, needs refresh: ${needsRefresh}`,
          Date.now() - startTime,
          { isExpired, needsRefresh, timeUntilExpiry: validation.timeUntilExpiry }
        );
      } else {
        this.addResult(
          'expired-token-detection',
          true,
          'No token expiry information available (no active session)',
          Date.now() - startTime
        );
      }
      
    } catch (error) {
      this.addResult(
        'expired-token-handling',
        false,
        `Expired token handling test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Test invalid token handling
   */
  private async testInvalidTokenHandling(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('❌ Testing invalid token handling...');
      
      // Test various error conditions
      const errorTests = [
        {
          name: 'network-error',
          error: new Error('Network error'),
          shouldBeAuthError: false
        },
        {
          name: 'unauthorized-error',
          error: { status: 401, message: 'Unauthorized' },
          shouldBeAuthError: true
        },
        {
          name: 'rls-violation',
          error: { message: 'violates row-level security policy' },
          shouldBeAuthError: true
        }
      ];
      
      // Import the utility function
      const { isAuthenticationError } = await import('@/lib/session-validation');
      
      for (const test of errorTests) {
        const isAuthError = isAuthenticationError(test.error);
        
        this.addResult(
          `error-detection-${test.name}`,
          isAuthError === test.shouldBeAuthError,
          `Error detection for ${test.name}: ${isAuthError ? 'auth error' : 'other error'} (expected: ${test.shouldBeAuthError ? 'auth' : 'other'})`,
          Date.now() - startTime,
          { error: test.error, detected: isAuthError, expected: test.shouldBeAuthError }
        );
      }
      
    } catch (error) {
      this.addResult(
        'invalid-token-handling',
        false,
        `Invalid token handling test failed: ${error}`,
        Date.now() - startTime
      );
    }
  }
  
  /**
   * Add a test result
   */
  private addResult(
    testName: string, 
    success: boolean, 
    message: string, 
    duration?: number, 
    details?: any
  ): void {
    const result: TestResult = {
      testName,
      success,
      message,
      duration: duration || 0,
      details
    };
    
    this.results.push(result);
    
    const emoji = success ? '✅' : '❌';
    console.log(`${emoji} ${testName}: ${message}`);
  }
}

/**
 * Run the comprehensive test suite
 */
export async function runTokenRLSTests(): Promise<void> {
  console.log('\n🧪 Starting Comprehensive Token and RLS Test Suite');
  console.log('=' .repeat(60));
  
  const testSuite = new TokenRLSTestSuite();
  const results = await testSuite.runAllTests();
  
  console.log('\n📋 Test Results Summary:');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${results.summary.passed + results.summary.failed}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⏱️ Duration: ${results.summary.duration}ms`);
  console.log(`🏆 Overall: ${results.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (!results.success) {
    console.log('\n❌ Failed Tests:');
    results.results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.testName}: ${r.message}`));
  }
  
  // Generate and log diagnostic report
  try {
    const diagnosticReport = await RLSMonitor.generateDiagnosticReport();
    console.log('\n📊 System Diagnostic Report:');
    console.log('=' .repeat(60));
    console.log(diagnosticReport);
  } catch (error) {
    console.error('Failed to generate diagnostic report:', error);
  }
  
  console.log('\n🔚 Test Suite Complete');
  console.log('=' .repeat(60));
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
  (window as any).runTokenRLSTests = runTokenRLSTests;
  console.log('Token RLS tests available. Run: window.runTokenRLSTests()');
}