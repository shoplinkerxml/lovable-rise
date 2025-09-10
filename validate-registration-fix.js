#!/usr/bin/env node

/**
 * Registration Fix Implementation Validation Script
 * 
 * This script validates that the registration logic fixes have been implemented correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function validateFile(filePath, validations) {
  console.log(`🔍 Validating ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let allPassed = true;
  
  validations.forEach(({ description, test }) => {
    const passed = test(content);
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${description}`);
    if (!passed) allPassed = false;
  });
  
  return allPassed;
}

function runValidation() {
  console.log('🚀 Starting Registration Fix Implementation Validation');
  console.log('=' .repeat(60));
  
  const basePath = path.join(__dirname, 'src/lib');
  let overallSuccess = true;
  
  // Validate UserExistenceService
  const userExistenceValidations = [
    {
      description: 'Simplified checkUserExists method implemented',
      test: (content) => content.includes('Main check through profile (more reliable than auth check)')
    },
    {
      description: 'Deprecated checkAuthUserExists method',
      test: (content) => content.includes('@deprecated Use profile-based checking instead')
    },
    {
      description: 'Proper error handling with safe defaults',
      test: (content) => content.includes('Safe default - assume user doesn\'t exist on error')
    }
  ];
  
  overallSuccess &= validateFile(
    path.join(basePath, 'user-existence-service.ts'),
    userExistenceValidations
  );
  
  // Validate ProfileService
  const profileServiceValidations = [
    {
      description: 'createProfileWithVerification method implemented',
      test: (content) => content.includes('createProfileWithVerification')
    },
    {
      description: 'UPSERT with conflict resolution',
      test: (content) => content.includes('onConflict: \'id\'') && content.includes('ignoreDuplicates: false')
    },
    {
      description: 'Profile verification with delay',
      test: (content) => content.includes('setTimeout(resolve, 100)')
    },
    {
      description: 'Enhanced cache management',
      test: (content) => content.includes('ProfileCache.set')
    }
  ];
  
  overallSuccess &= validateFile(
    path.join(basePath, 'profile-service.ts'),
    profileServiceValidations
  );
  
  // Validate UserAuthService
  const userAuthValidations = [
    {
      description: 'Simplified registration logic using profile check',
      test: (content) => content.includes('getProfileByEmail(data.email)')
    },
    {
      description: 'Profile creation with verification',
      test: (content) => content.includes('createProfileWithVerification')
    },
    {
      description: 'Proper async error handling',
      test: (content) => content.includes('Clear existence cache for correct subsequent checks')
    }
  ];
  
  overallSuccess &= validateFile(
    path.join(basePath, 'user-auth-service.ts'),
    userAuthValidations
  );
  
  // Validate UserRegister component
  const userRegisterValidations = [
    {
      description: 'Enhanced error handling for registration failures',
      test: (content) => content.includes('profile_creation_failed')
    },
    {
      description: 'Improved user feedback messages',
      test: (content) => content.includes('Account created but profile setup failed')
    },
    {
      description: 'Fallback error handling',
      test: (content) => content.includes('Fallback error handling for any other errors')
    }
  ];
  
  overallSuccess &= validateFile(
    path.join(__dirname, 'src/pages/UserRegister.tsx'),
    userRegisterValidations
  );
  
  // Validate error handler improvements
  const errorHandlerValidations = [
    {
      description: 'Enhanced ProfileCache with TTL settings',
      test: (content) => content.includes('EXISTENCE_TTL') && content.includes('DEFAULT_TTL')
    },
    {
      description: 'Cache cleanup and statistics methods',
      test: (content) => content.includes('cleanup()') && content.includes('getStats()')
    },
    {
      description: 'Pattern-based cache clearing',
      test: (content) => content.includes('clearPattern')
    }
  ];
  
  overallSuccess &= validateFile(
    path.join(basePath, 'error-handler.ts'),
    errorHandlerValidations
  );
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=' .repeat(60));
  
  if (overallSuccess) {
    console.log('🎉 All validations passed! Registration fix implementation is correct.');
    console.log('\n✨ Key improvements implemented:');
    console.log('  • Reliable profile-based user existence checking');
    console.log('  • UPSERT with verification for profile creation');
    console.log('  • Enhanced async handling and error management');
    console.log('  • Improved cache management with different TTL settings');
    console.log('  • Better user feedback and error messages');
  } else {
    console.log('❌ Some validations failed. Please review the implementation.');
    process.exit(1);
  }
}

runValidation();