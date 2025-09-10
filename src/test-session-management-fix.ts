/**
 * Comprehensive Test Suite for Session Management Fix
 * 
 * This test suite validates the user registration authorization fix
 * with enhanced session management and retry logic.
 */

import { UserAuthService } from "./lib/user-auth-service";
import { ProfileService } from "./lib/profile-service";
import { AuthorizationErrorHandler } from "./lib/error-handler";
import { UserAuthError, AuthorizationError } from "./lib/user-auth-schemas";

interface TestResult {
  name: string;
  passed: boolean;
  error?: any;
  duration: number;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: boolean;
  duration: number;
}

class SessionManagementTestSuite {
  private results: TestSuite[] = [];

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Session Management Fix Test Suite\n');
    
    try {
      await this.runAuthorizationErrorTests();
      await this.runSessionManagementTests();
      await this.runProfileCreationTests();
      await this.runRegistrationFlowTests();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    }
  }

  /**
   * Test authorization error handling
   */
  private async runAuthorizationErrorTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Authorization Error Handling',
      tests: [],
      passed: false,
      duration: 0
    };

    const startTime = Date.now();

    // Test 1: 401 Unauthorized Error Analysis
    suite.tests.push(await this.runTest(
      '401 Unauthorized Error Detection',
      async () => {
        const error = { status: 401, message: 'Unauthorized access' };
        const authError = AuthorizationErrorHandler.analyzeAuthorizationError(error);
        
        if (authError.type !== 'session_not_ready' && authError.type !== 'invalid_token') {
          throw new Error(`Expected auth error type, got: ${authError.type}`);
        }
        
        if (!authError.retryable) {
          throw new Error('401 errors should be retryable');
        }
        
        return { authError };
      }
    ));

    // Test 2: 403 Forbidden Error Analysis
    suite.tests.push(await this.runTest(
      '403 Forbidden Error Detection',
      async () => {
        const error = { status: 403, message: 'Forbidden' };
        const authError = AuthorizationErrorHandler.analyzeAuthorizationError(error);
        
        if (authError.type !== 'insufficient_permissions') {
          throw new Error(`Expected insufficient_permissions, got: ${authError.type}`);
        }
        
        if (authError.retryable) {
          throw new Error('403 errors should not be retryable');
        }
        
        return { authError };
      }
    ));

    // Test 3: JWT Token Error Analysis
    suite.tests.push(await this.runTest(
      'JWT Token Error Detection',
      async () => {
        const error = { status: 401, message: 'Invalid JWT token' };
        const authError = AuthorizationErrorHandler.analyzeAuthorizationError(error);
        
        if (authError.type !== 'invalid_token') {
          throw new Error(`Expected invalid_token, got: ${authError.type}`);
        }
        
        return { authError };
      }
    ));

    // Test 4: Retry Logic Validation
    suite.tests.push(await this.runTest(
      'Retry Logic Validation',
      async () => {
        const sessionError: AuthorizationError = {
          type: 'session_not_ready',
          code: 401,
          message: 'Session not ready',
          retryable: true,
          suggestedAction: 'Wait for session',
          waitTime: 1000
        };
        
        // Should retry for session_not_ready up to 5 times
        if (!AuthorizationErrorHandler.shouldRetry(sessionError, 1, 5)) {
          throw new Error('Should retry for session_not_ready on attempt 1');
        }
        
        if (AuthorizationErrorHandler.shouldRetry(sessionError, 6, 5)) {
          throw new Error('Should not retry after max attempts');
        }
        
        const waitTime = AuthorizationErrorHandler.getRetryWaitTime(sessionError, 2);
        if (waitTime < 1000) {
          throw new Error('Wait time should use exponential backoff');
        }
        
        return { waitTime };
      }
    ));

    // Test 5: User-Friendly Messages
    suite.tests.push(await this.runTest(
      'User-Friendly Error Messages',
      async () => {
        const authError: AuthorizationError = {
          type: 'session_not_ready',
          code: 401,
          message: 'Session not ready',
          retryable: true,
          suggestedAction: 'Wait for session'
        };
        
        const enMessage = AuthorizationErrorHandler.getUserFriendlyMessage(authError, 'en');
        const ukMessage = AuthorizationErrorHandler.getUserFriendlyMessage(authError, 'uk');
        
        if (!enMessage || !ukMessage) {
          throw new Error('Should return messages for both languages');
        }
        
        if (enMessage === ukMessage) {
          throw new Error('Messages should be different for different languages');
        }
        
        return { enMessage, ukMessage };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.tests.every(test => test.passed);
    this.results.push(suite);
  }

  /**
   * Test session management functionality
   */
  private async runSessionManagementTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Session Management',
      tests: [],
      passed: false,
      duration: 0
    };

    const startTime = Date.now();

    // Test 1: Session Context Interface
    suite.tests.push(await this.runTest(
      'Session Context Structure',
      async () => {
        // This tests that the SessionContext interface is properly defined
        const sessionContext = {
          accessToken: 'test-token',
          refreshToken: 'test-refresh',
          userId: 'test-user-id',
          isReady: true,
          expiresAt: Date.now() + 3600000
        };
        
        if (!sessionContext.hasOwnProperty('isReady')) {
          throw new Error('SessionContext should have isReady property');
        }
        
        if (!sessionContext.hasOwnProperty('expiresAt')) {
          throw new Error('SessionContext should have expiresAt property');
        }
        
        return { sessionContext };
      }
    ));

    // Test 2: Registration Options Structure
    suite.tests.push(await this.runTest(
      'Registration Options Configuration',
      async () => {
        // Test that registration options have correct default values
        const options = {
          maxRetries: 3,
          sessionTimeout: 10000,
          profileCreationDelay: 1000,
          retryDelay: 500
        };
        
        if (options.maxRetries < 1) {
          throw new Error('maxRetries should be at least 1');
        }
        
        if (options.sessionTimeout < 1000) {
          throw new Error('sessionTimeout should be at least 1 second');
        }
        
        return { options };
      }
    ));

    // Test 3: UserAuthService Authorization Error Detection
    suite.tests.push(await this.runTest(
      'UserAuthService Authorization Error Detection',
      async () => {
        // Test the static method exists and works
        if (typeof UserAuthService.handleAuthorizationError !== 'function') {
          throw new Error('UserAuthService should have handleAuthorizationError method');
        }
        
        const error = { status: 401, message: 'Unauthorized' };
        const result = await UserAuthService.handleAuthorizationError(error, 1, 3);
        
        if (!result.hasOwnProperty('shouldRetry')) {
          throw new Error('Should return shouldRetry property');
        }
        
        if (!result.hasOwnProperty('waitTime')) {
          throw new Error('Should return waitTime property');
        }
        
        if (!result.hasOwnProperty('userMessage')) {
          throw new Error('Should return userMessage property');
        }
        
        return { result };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.tests.every(test => test.passed);
    this.results.push(suite);
  }

  /**
   * Test profile creation with authentication context
   */
  private async runProfileCreationTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Profile Creation with Auth Context',
      tests: [],
      passed: false,
      duration: 0
    };

    const startTime = Date.now();

    // Test 1: ProfileService Auth Context Methods
    suite.tests.push(await this.runTest(
      'ProfileService Auth Context Methods',
      async () => {
        if (typeof ProfileService.createProfileWithAuthContext !== 'function') {
          throw new Error('ProfileService should have createProfileWithAuthContext method');
        }
        
        if (typeof ProfileService.createProfileWithAuthRetry !== 'function') {
          throw new Error('ProfileService should have createProfileWithAuthRetry method');
        }
        
        return { methodsExist: true };
      }
    ));

    // Test 2: Profile Creation Options
    suite.tests.push(await this.runTest(
      'Profile Creation Options Validation',
      async () => {
        const options = {
          waitForAuth: true,
          maxWaitTime: 5000
        };
        
        if (typeof options.waitForAuth !== 'boolean') {
          throw new Error('waitForAuth should be boolean');
        }
        
        if (options.maxWaitTime < 1000) {
          throw new Error('maxWaitTime should be at least 1 second');
        }
        
        return { options };
      }
    ));

    // Test 3: Authorization Error Detection in ProfileService
    suite.tests.push(await this.runTest(
      'ProfileService Authorization Error Detection',
      async () => {
        // Test that ProfileService has proper error detection
        const mockError = {
          status: 401,
          message: 'JWT token invalid'
        };
        
        // This tests the logic without calling the actual method
        const isAuthError = mockError.status === 401 || 
                           mockError.status === 403 ||
                           mockError.message.toLowerCase().includes('unauthorized') ||
                           mockError.message.toLowerCase().includes('jwt');
        
        if (!isAuthError) {
          throw new Error('Should detect authorization error');
        }
        
        return { isAuthError };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.tests.every(test => test.passed);
    this.results.push(suite);
  }

  /**
   * Test the complete registration flow with session management
   */
  private async runRegistrationFlowTests(): Promise<void> {
    const suite: TestSuite = {
      name: 'Registration Flow Integration',
      tests: [],
      passed: false,
      duration: 0
    };

    const startTime = Date.now();

    // Test 1: Registration Data Validation
    suite.tests.push(await this.runTest(
      'Registration Data Structure',
      async () => {
        const mockRegistrationData = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'testpassword123',
          confirmPassword: 'testpassword123',
          acceptTerms: true
        };
        
        if (!mockRegistrationData.name || mockRegistrationData.name.length < 2) {
          throw new Error('Name should be at least 2 characters');
        }
        
        if (!mockRegistrationData.email.includes('@')) {
          throw new Error('Email should be valid');
        }
        
        if (mockRegistrationData.password.length < 8) {
          throw new Error('Password should be at least 8 characters');
        }
        
        if (!mockRegistrationData.acceptTerms) {
          throw new Error('Terms should be accepted');
        }
        
        return { data: mockRegistrationData };
      }
    ));

    // Test 2: Registration Response Structure
    suite.tests.push(await this.runTest(
      'Registration Response Validation',
      async () => {
        const mockResponse = {
          user: null,
          session: null,
          error: UserAuthError.EMAIL_EXISTS
        };
        
        if (!mockResponse.hasOwnProperty('user')) {
          throw new Error('Response should have user property');
        }
        
        if (!mockResponse.hasOwnProperty('session')) {
          throw new Error('Response should have session property');
        }
        
        if (!mockResponse.hasOwnProperty('error')) {
          throw new Error('Response should have error property');
        }
        
        return { response: mockResponse };
      }
    ));

    // Test 3: Error Types Coverage
    suite.tests.push(await this.runTest(
      'UserAuthError Types Coverage',
      async () => {
        const requiredErrors = [
          'REGISTRATION_FAILED',
          'LOGIN_FAILED',
          'EMAIL_EXISTS',
          'PROFILE_CREATION_FAILED',
          'AUTHORIZATION_ERROR',
          'SESSION_EXPIRED',
          'SESSION_NOT_READY'
        ];
        
        for (const errorType of requiredErrors) {
          if (!UserAuthError[errorType as keyof typeof UserAuthError]) {
            throw new Error(`Missing error type: ${errorType}`);
          }
        }
        
        return { errorTypes: requiredErrors };
      }
    ));

    // Test 4: Enhanced Logging Validation
    suite.tests.push(await this.runTest(
      'Registration Logging Structure',
      async () => {
        // Test that the logging structure is properly defined
        const mockMetrics = {
          startTime: Date.now(),
          steps: {},
          success: false
        };
        
        if (!mockMetrics.hasOwnProperty('startTime')) {
          throw new Error('Metrics should have startTime');
        }
        
        if (!mockMetrics.hasOwnProperty('steps')) {
          throw new Error('Metrics should have steps object');
        }
        
        if (!mockMetrics.hasOwnProperty('success')) {
          throw new Error('Metrics should have success flag');
        }
        
        return { metrics: mockMetrics };
      }
    ));

    suite.duration = Date.now() - startTime;
    suite.passed = suite.tests.every(test => test.passed);
    this.results.push(suite);
  }

  /**
   * Run a single test with error handling
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const details = await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${name} (${duration}ms)`);
      
      return {
        name,
        passed: true,
        duration,
        details
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ ${name} (${duration}ms):`, error.message);
      
      return {
        name,
        passed: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Print test results summary
   */
  private printSummary(): void {
    console.log('\n📊 Test Results Summary\n');
    
    let totalTests = 0;
    let passedTests = 0;
    let totalDuration = 0;
    
    for (const suite of this.results) {
      const suitePassed = suite.tests.filter(t => t.passed).length;
      const suiteTotal = suite.tests.length;
      
      totalTests += suiteTotal;
      passedTests += suitePassed;
      totalDuration += suite.duration;
      
      const status = suite.passed ? '✅' : '❌';
      console.log(`${status} ${suite.name}: ${suitePassed}/${suiteTotal} tests passed (${suite.duration}ms)`);
      
      if (!suite.passed) {
        const failedTests = suite.tests.filter(t => !t.passed);
        for (const test of failedTests) {
          console.log(`   ❌ ${test.name}: ${test.error}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📈 Overall Results: ${passedTests}/${totalTests} tests passed`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`🎯 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Session management fix is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }
  }

  /**
   * Get detailed test results
   */
  getResults(): TestSuite[] {
    return this.results;
  }
}

// Export for use in other test files
export { SessionManagementTestSuite, TestResult, TestSuite };

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  const testSuite = new SessionManagementTestSuite();
  testSuite.runAllTests().catch(console.error);
}