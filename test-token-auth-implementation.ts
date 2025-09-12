/**
 * Test file for validating the token authentication implementation
 * This file tests both the Edge Functions and frontend service updates
 */

import { UserService } from "@/lib/user-service";
import { supabase } from "@/integrations/supabase/client";

// Test 1: Validate Edge Functions properly handle apikey header
async function testEdgeFunctionApiKeyAuth() {
  console.log("Testing Edge Function API Key Authentication...");
  
  try {
    // This simulates an anonymous request using only the apikey header
    // In a real scenario, this would be done from the Edge Function itself
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users`, {
      method: 'GET',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log("API Key Auth Response Status:", response.status);
    if (response.status === 401) {
      console.log("✅ Edge Functions correctly reject anonymous requests without proper session");
    } else {
      console.log("⚠️  Check if Edge Functions are properly configured for authentication");
    }
  } catch (error) {
    console.error("Error testing API Key Auth:", error);
  }
}

// Test 2: Validate Edge Functions properly handle Authorization header
async function testEdgeFunctionBearerAuth() {
  console.log("Testing Edge Function Bearer Token Authentication...");
  
  try {
    // This requires a valid session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Bearer Auth Response Status:", response.status);
      if (response.status === 200) {
        console.log("✅ Edge Functions correctly accept authenticated requests");
      } else {
        console.log("⚠️  Check if Edge Functions are properly configured for authentication");
      }
    } else {
      console.log("⚠️  No active session - skipping Bearer Auth test");
    }
  } catch (error) {
    console.error("Error testing Bearer Auth:", error);
  }
}

// Test 3: Validate frontend service sends correct headers
async function testFrontendServiceHeaders() {
  console.log("Testing Frontend Service Header Implementation...");
  
  try {
    // Mock the supabase functions.invoke to capture headers
    const originalInvoke = supabase.functions.invoke;
    
    let capturedHeaders: Record<string, string> = {};
    supabase.functions.invoke = function(name: string, options: any) {
      capturedHeaders = options.headers || {};
      // Restore original function and return a mock response
      supabase.functions.invoke = originalInvoke;
      return Promise.resolve({ data: { users: [], total: 0, page: 1, limit: 10 }, error: null });
    };
    
    // Call the service method
    await UserService.getUsers();
    
    // Check headers
    const hasAuthHeader = 'Authorization' in capturedHeaders;
    const hasApiKeyHeader = 'apikey' in capturedHeaders;
    
    if (hasAuthHeader && !hasApiKeyHeader) {
      console.log("✅ Frontend service correctly uses Authorization header when authenticated");
    } else if (hasApiKeyHeader && !hasAuthHeader) {
      console.log("✅ Frontend service correctly uses apikey header when not authenticated");
    } else {
      console.log("⚠️  Frontend service header implementation needs review");
      console.log("Captured headers:", capturedHeaders);
    }
  } catch (error) {
    console.error("Error testing frontend service headers:", error);
  }
}

// Run all tests
async function runAllTests() {
  console.log("Starting Token Authentication Implementation Tests...\n");
  
  await testEdgeFunctionApiKeyAuth();
  console.log(); // Add spacing
  
  await testEdgeFunctionBearerAuth();
  console.log(); // Add spacing
  
  await testFrontendServiceHeaders();
  console.log(); // Add spacing
  
  console.log("Token Authentication Implementation Tests Completed.");
}

// Export for manual execution
export { runAllTests, testEdgeFunctionApiKeyAuth, testEdgeFunctionBearerAuth, testFrontendServiceHeaders };