/**
 * Profile Creation and Array Response Handling Fix - Validation Tests
 */

import { ProfileService } from './lib/profile-service';
import { UserAuthService } from './lib/user-auth-service';
import { ProfileOperationError, ProfileErrorCode, ProfileCache } from './lib/error-handler';

// Test data
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_EMAIL = 'test@example.com';
const TEST_NAME = 'Test User';

/**
 * Test ProfileService.getProfile() with non-existent profile
 */
async function testGetNonExistentProfile(): Promise<boolean> {
  console.log('🧪 Testing getProfile with non-existent profile...');
  
  try {
    const profile = await ProfileService.getProfile('non-existent-user-id');
    return profile === null;
  } catch (error) {
    return error instanceof ProfileOperationError && error.code === ProfileErrorCode.PROFILE_NOT_FOUND;
  }
}

/**
 * Test ProfileService.ensureProfile() creates profile when missing
 */
async function testEnsureProfileCreation(): Promise<boolean> {
  console.log('🧪 Testing ensureProfile creates profile when missing...');
  
  try {
    const profile = await ProfileService.ensureProfile(TEST_USER_ID, {
      email: TEST_EMAIL,
      name: TEST_NAME
    });
    
    return profile && profile.id === TEST_USER_ID && profile.email === TEST_EMAIL;
  } catch (error) {
    console.error('❌ Error in ensureProfile:', error);
    return false;
  }
}

/**
 * Test ProfileService caching functionality
 */
async function testProfileCaching(): Promise<boolean> {
  console.log('🧪 Testing profile caching...');
  
  try {
    ProfileCache.clear();
    
    const startTime1 = Date.now();
    const profile1 = await ProfileService.getProfile(TEST_USER_ID);
    const time1 = Date.now() - startTime1;
    
    const startTime2 = Date.now();
    const profile2 = await ProfileService.getProfile(TEST_USER_ID);
    const time2 = Date.now() - startTime2;
    
    return profile1 && profile2 && profile1.id === profile2.id && time2 < time1;
  } catch (error) {
    console.error('❌ Error in caching test:', error);
    return false;
  }
}

/**
 * Main test runner
 */
export async function runProfileImplementationTests(): Promise<void> {
  console.log('🚀 Starting Profile Implementation Validation Tests');
  
  const tests = [
    testGetNonExistentProfile,
    testEnsureProfileCreation,
    testProfileCaching
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passedTests++;
        console.log('✅ Test passed');
      } else {
        console.log('❌ Test failed');
      }
    } catch (error) {
      console.error('❌ Test failed with exception:', error);
    }
  }
  
  console.log(`📊 Results: ${passedTests}/${tests.length} tests passed`);
}

console.log('Profile Implementation Tests Ready - Run: runProfileImplementationTests()');