#!/usr/bin/env node

/**
 * Role Assignment Fix Validation Script (JavaScript)
 * 
 * This script validates that the user role assignment fix has been implemented correctly.
 */

import * as fs from 'fs';
import * as path from 'path';

class RoleAssignmentValidator {
  constructor() {
    this.results = [];
    this.projectRoot = process.cwd();
  }

  /**
   * Validate that the latest migration exists and has correct content
   */
  validateMigrationFile() {
    const migrationPath = path.join(this.projectRoot, 'supabase/migrations/20250112000000_final_role_assignment_fix.sql');
    
    try {
      if (!fs.existsSync(migrationPath)) {
        return {
          category: 'Database Migration',
          test_name: 'Migration File Exists',
          status: 'FAIL',
          message: 'Migration file 20250112000000_final_role_assignment_fix.sql not found',
          details: { expected_path: migrationPath }
        };
      }

      const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
      
      // Check for key components in the migration
      const requiredComponents = [
        'DROP FUNCTION IF EXISTS public.handle_new_user()',
        'CREATE OR REPLACE FUNCTION public.handle_new_user()',
        "assigned_role := 'user'::public.user_role",
        'CREATE TRIGGER on_auth_user_created',
        'public.validate_role_assignments()'
      ];

      const missingComponents = requiredComponents.filter(component => 
        !migrationContent.includes(component)
      );

      if (missingComponents.length === 0) {
        return {
          category: 'Database Migration',
          test_name: 'Migration Content Validation',
          status: 'PASS',
          message: 'Migration file contains all required components',
          details: { file_size: migrationContent.length, components_checked: requiredComponents.length }
        };
      } else {
        return {
          category: 'Database Migration',
          test_name: 'Migration Content Validation',
          status: 'FAIL',
          message: `Migration file missing required components: ${missingComponents.join(', ')}`,
          details: { missing_components: missingComponents }
        };
      }

    } catch (error) {
      return {
        category: 'Database Migration',
        test_name: 'Migration File Access',
        status: 'FAIL',
        message: `Error reading migration file: ${error}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate that shared database types file exists and is correct
   */
  validateSharedTypes() {
    const typesPath = path.join(this.projectRoot, 'supabase/functions/_shared/database-types.ts');
    
    try {
      if (!fs.existsSync(typesPath)) {
        return {
          category: 'Edge Function Types',
          test_name: 'Shared Types File Exists',
          status: 'FAIL',
          message: 'Shared database types file not found',
          details: { expected_path: typesPath }
        };
      }

      const typesContent = fs.readFileSync(typesPath, 'utf-8');
      
      // Check for complete role definition
      const hasCompleteRoles = typesContent.includes("role: 'admin' | 'manager' | 'user'");
      const hasDatabase = typesContent.includes('export interface Database');
      const hasTypeAliases = typesContent.includes('export type UserRole');

      if (hasCompleteRoles && hasDatabase && hasTypeAliases) {
        return {
          category: 'Edge Function Types',
          test_name: 'Shared Types Content',
          status: 'PASS',
          message: 'Shared database types file contains all required type definitions',
          details: { 
            complete_roles: hasCompleteRoles,
            database_interface: hasDatabase,
            type_aliases: hasTypeAliases 
          }
        };
      } else {
        return {
          category: 'Edge Function Types', 
          test_name: 'Shared Types Content',
          status: 'FAIL',
          message: 'Shared database types file missing required definitions',
          details: { 
            complete_roles: hasCompleteRoles,
            database_interface: hasDatabase,
            type_aliases: hasTypeAliases 
          }
        };
      }

    } catch (error) {
      return {
        category: 'Edge Function Types',
        test_name: 'Shared Types File Access',
        status: 'FAIL',
        message: `Error reading shared types file: ${error}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate that all Edge Functions use the shared types
   */
  validateEdgeFunctionTypes() {
    const edgeFunctions = [
      'auth-me/index.ts',
      'users/index.ts', 
      'menu/index.ts',
      'menu-content/index.ts',
      'permissions/index.ts'
    ];

    const results = [];

    for (const functionPath of edgeFunctions) {
      const fullPath = path.join(this.projectRoot, 'supabase/functions', functionPath);
      
      try {
        if (!fs.existsSync(fullPath)) {
          results.push({
            category: 'Edge Functions',
            test_name: `${functionPath} - File Exists`,
            status: 'WARNING',
            message: `Edge function file not found: ${functionPath}`,
            details: { expected_path: fullPath }
          });
          continue;
        }

        const functionContent = fs.readFileSync(fullPath, 'utf-8');
        
        // Check if it uses shared types
        const usesSharedTypes = functionContent.includes("import type { Database } from '../_shared/database-types.ts'");
        const hasOldInterface = functionContent.includes('interface Database {');

        if (usesSharedTypes && !hasOldInterface) {
          results.push({
            category: 'Edge Functions',
            test_name: `${functionPath} - Type Import`,
            status: 'PASS',
            message: `Edge function correctly uses shared database types`,
            details: { uses_shared_types: true, has_old_interface: false }
          });
        } else if (!usesSharedTypes && hasOldInterface) {
          results.push({
            category: 'Edge Functions',
            test_name: `${functionPath} - Type Import`,
            status: 'FAIL',
            message: `Edge function still uses local Database interface instead of shared types`,
            details: { uses_shared_types: false, has_old_interface: true }
          });
        } else {
          results.push({
            category: 'Edge Functions',
            test_name: `${functionPath} - Type Import`,
            status: 'WARNING',
            message: `Edge function type usage unclear`,
            details: { uses_shared_types: usesSharedTypes, has_old_interface: hasOldInterface }
          });
        }

      } catch (error) {
        results.push({
          category: 'Edge Functions',
          test_name: `${functionPath} - File Access`,
          status: 'FAIL',
          message: `Error reading edge function file: ${error}`,
          details: { error: error.message }
        });
      }
    }

    return results;
  }

  /**
   * Run all validation tests
   */
  async runAllValidations() {
    console.log('🔍 Running Role Assignment Fix Validation...\n');

    // Run all validations
    const results = [
      this.validateMigrationFile(),
      this.validateSharedTypes(),
      ...this.validateEdgeFunctionTypes()
    ];

    this.results = results;
    return results;
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const warningTests = this.results.filter(r => r.status === 'WARNING').length;

    let report = `\n=== Role Assignment Fix Validation Report ===\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Project: ${this.projectRoot}\n\n`;
    
    report += `=== Summary ===\n`;
    report += `Total Validations: ${totalTests}\n`;
    report += `✅ Passed: ${passedTests}\n`;
    report += `❌ Failed: ${failedTests}\n`;
    report += `⚠️  Warnings: ${warningTests}\n`;
    
    if (totalTests > 0) {
      report += `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;
    }

    // Group results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      report += `=== ${category} ===\n`;
      
      categoryResults.forEach(result => {
        const statusIcon = result.status === 'PASS' ? '✅' : 
                          result.status === 'FAIL' ? '❌' : '⚠️';
        report += `${statusIcon} ${result.test_name}\n`;
        report += `   ${result.message}\n`;
        
        if (result.details) {
          report += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
        }
        report += `\n`;
      });
    });

    // Overall assessment
    report += `=== Overall Assessment ===\n`;
    if (failedTests === 0) {
      if (warningTests === 0) {
        report += `🎉 Perfect! All validations passed. The role assignment fix is properly implemented.\n\n`;
      } else {
        report += `✅ Good! Core fix is implemented correctly. ${warningTests} warnings should be reviewed.\n\n`;
      }
    } else {
      report += `❌ Issues Found! ${failedTests} critical issues need to be addressed before the fix is complete.\n\n`;
    }

    // Next steps
    report += `=== Next Steps ===\n`;
    if (failedTests > 0) {
      report += `1. 🔧 Address all failed validations above\n`;
      report += `2. 🗄️  Apply database migration: 20250112000000_final_role_assignment_fix.sql\n`;
      report += `3. 🔄 Re-run this validation script\n`;
    } else {
      report += `1. 🗄️  Apply database migration if not already done\n`;
      report += `2. 🧪 Test user registration flow manually\n`;
      report += `3. 📊 Monitor role assignments in production\n`;
    }

    if (warningTests > 0) {
      report += `4. ⚠️  Review and address warnings for optimal implementation\n`;
    }

    return report;
  }
}

// Main execution
async function main() {
  const validator = new RoleAssignmentValidator();
  
  try {
    await validator.runAllValidations();
    const report = validator.generateReport();
    
    console.log(report);
    
    // Also write report to file
    const reportPath = path.join(process.cwd(), 'role-assignment-validation-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Full report saved to: ${reportPath}\n`);
    
    // Exit with appropriate code
    const hasFailures = validator.results.some(r => r.status === 'FAIL');
    process.exit(hasFailures ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  }
}

// Run the validation
main();