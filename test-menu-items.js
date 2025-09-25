// Test script to verify menu items are loading correctly
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ehznqzaumsnjkrntaiox.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoem5xemF1bXNuamtybnRhaW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MTM2MjMsImV4cCI6MjA3MjI4OTYyM30.5-H09_f8r8pW6E0LpDQX0jJxX5pP5pP5pP5pP5pP5pP";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMenuItems() {
  try {
    console.log('Testing menu items loading...');
    
    // Test the correct query (without user_id filter)
    const { data, error } = await supabase
      .from('user_menu_items')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
      return;
    }

    console.log('Successfully fetched menu items:');
    console.log(JSON.stringify(data, null, 2));
    
    // Test the incorrect query (with user_id filter) that was causing the error
    try {
      const { data: badData, error: badError } = await supabase
        .from('user_menu_items')
        .select('*')
        .eq('user_id', 'be45c4de-a2e5-45ba-a455-913ec674fe3e') // Example user ID
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (badError) {
        console.log('Expected error with user_id filter:', badError.message);
      } else {
        console.log('Unexpected success with user_id filter');
      }
    } catch (badError) {
      console.log('Expected error with user_id filter:', badError.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMenuItems();