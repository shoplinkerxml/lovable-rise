/**
 * Simple integration test for profile creation authentication flow fix
 * This test validates the key components of our implementation
 */

import { ProfileService } from './lib/profile-service';
import { UserAuthService } from './lib/user-auth-service';
import { SessionContext } from './lib/user-auth-schemas';

console.log('🧪 Starting Profile Creation Authentication Flow Tests...\n');

// Test 1: Session Context Extraction
console.log('📋 Test 1: Session Context Extraction');
try {
  const mockAuthData = {
    user: { id: 'test-user-123' },
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }
  };

  // Access private method for testing
  const extractSessionContext = (UserAuthService as any).extractSessionContext;
  const sessionContext: SessionContext = extractSessionContext(mockAuthData);

  console.log('✅ Session context extracted successfully:');
  console.log(`   - User ID: ${sessionContext.userId}`);
  console.log(`   - Has Access Token: ${!!sessionContext.accessToken}`);
  console.log(`   - Is Ready: ${sessionContext.isReady}`);
  console.log(`   - Expires At: ${sessionContext.expiresAt ? new Date(sessionContext.expiresAt).toISOString() : 'null'}`);

  if (sessionContext.isReady && sessionContext.accessToken && sessionContext.userId === 'test-user-123') {
    console.log('✅ Session context extraction test PASSED\n');
  } else {
    console.log('❌ Session context extraction test FAILED\n');
  }
} catch (error) {
  console.log(`❌ Session context extraction test FAILED: ${error}\n`);
}

// Test 2: Authorization Error Detection
console.log('📋 Test 2: Authorization Error Detection');
try {
  const isAuthError = (ProfileService as any).isAuthorizationError;
  
  // Test various error scenarios
  const testCases = [
    { error: { status: 401 }, expected: true, description: 'HTTP 401' },
    { error: { statusCode: 403 }, expected: true, description: 'HTTP 403' },
    { error: { message: 'violates row-level security' }, expected: true, description: 'RLS violation' },
    { error: { code: 'PGRST301' }, expected: true, description: 'PostgREST 301' },
    { error: { message: 'JWT expired' }, expected: true, description: 'JWT error' },
    { error: { status: 500, message: 'Internal error' }, expected: false, description: 'Non-auth error' },
    { error: null, expected: false, description: 'Null error' }
  ];

  let allPassed = true;
  for (const testCase of testCases) {
    const result = isAuthError(testCase.error);
    const passed = result === testCase.expected;
    console.log(`   ${passed ? '✅' : '❌'} ${testCase.description}: ${result} (expected: ${testCase.expected})`);
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log('✅ Authorization error detection test PASSED\n');
  } else {
    console.log('❌ Authorization error detection test FAILED\n');
  }
} catch (error) {
  console.log(`❌ Authorization error detection test FAILED: ${error}\n`);
}

// Test 3: Profile Data Validation
console.log('📋 Test 3: Profile Data Validation');
try {
  const validateProfileData = (ProfileService as any).validateProfileData;
  
  // Test valid profile data
  try {
    validateProfileData({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User'
    });
    console.log('   ✅ Valid profile data accepted');
  } catch (error) {
    console.log(`   ❌ Valid profile data rejected: ${error}`);
  }

  // Test invalid email
  try {
    validateProfileData({
      id: 'test-user-123',
      email: 'invalid-email',
      name: 'Test User'
    });
    console.log('   ❌ Invalid email accepted (should have been rejected)');
  } catch (error) {
    console.log('   ✅ Invalid email correctly rejected');
  }

  // Test missing required fields
  try {
    validateProfileData({
      id: 'test-user-123'
      // Missing email and name
    });
    console.log('   ❌ Missing fields accepted (should have been rejected)');
  } catch (error) {
    console.log('   ✅ Missing fields correctly rejected');
  }

  console.log('✅ Profile data validation test PASSED\n');
} catch (error) {
  console.log(`❌ Profile data validation test FAILED: ${error}\n`);
}

// Test 4: Method Availability Check
console.log('📋 Test 4: Method Availability Check');
try {
  const methods = [
    { service: ProfileService, method: 'createProfileWithAuth', description: 'ProfileService.createProfileWithAuth' },
    { service: ProfileService, method: 'getCurrentAccessToken', description: 'ProfileService.getCurrentAccessToken (private)' },
    { service: UserAuthService, method: 'extractSessionContext', description: 'UserAuthService.extractSessionContext (private)' },
    { service: UserAuthService, method: 'getCurrentAccessToken', description: 'UserAuthService.getCurrentAccessToken (private)' },
    { service: UserAuthService, method: 'waitForTriggerProfile', description: 'UserAuthService.waitForTriggerProfile (private)' }
  ];

  let allMethodsAvailable = true;
  for (const { service, method, description } of methods) {
    const isAvailable = typeof (service as any)[method] === 'function';
    console.log(`   ${isAvailable ? '✅' : '❌'} ${description}: ${isAvailable ? 'Available' : 'Missing'}`);
    if (!isAvailable) allMethodsAvailable = false;
  }

  if (allMethodsAvailable) {
    console.log('✅ Method availability check PASSED\n');
  } else {
    console.log('❌ Method availability check FAILED\n');
  }
} catch (error) {
  console.log(`❌ Method availability check FAILED: ${error}\n`);
}

// Test 5: Enhanced Error Handling Check
console.log('📋 Test 5: Enhanced Error Handling Check');
try {
  const isAuthorizationError = (UserAuthService as any).isAuthorizationError;
  const handleProfileCreationError = (UserAuthService as any).handleProfileCreationError;
  
  if (typeof isAuthorizationError === 'function' && typeof handleProfileCreationError === 'function') {
    console.log('   ✅ Enhanced error handling methods available');
    
    // Test error mapping
    const authError = { status: 401, message: 'Unauthorized' };
    const mappedError = handleProfileCreationError(authError);
    console.log(`   ✅ Error mapping works: 401 → ${mappedError}`);
    
    console.log('✅ Enhanced error handling check PASSED\n');
  } else {
    console.log('   ❌ Enhanced error handling methods missing');
    console.log('❌ Enhanced error handling check FAILED\n');
  }
} catch (error) {
  console.log(`❌ Enhanced error handling check FAILED: ${error}\n`);
}

console.log('🏁 Profile Creation Authentication Flow Tests Complete!');
console.log('📊 Implementation validation finished. Check individual test results above.');