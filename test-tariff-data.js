// Simple test to check tariff data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'your-supabase-url';
const supabaseAnonKey = 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTariffData() {
  console.log('Testing tariff data...');
  
  // Test 1: Check currencies
  console.log('\n1. Checking currencies...');
  const { data: currencies, error: currencyError } = await supabase
    .from('currencies')
    .select('*');
  
  if (currencyError) {
    console.error('Currency error:', currencyError);
  } else {
    console.log('Currencies found:', currencies.length);
    console.log('Sample currency:', currencies[0]);
  }
  
  // Test 2: Check tariffs (without RLS)
  console.log('\n2. Checking tariffs...');
  const { data: tariffs, error: tariffError } = await supabase
    .from('tariffs')
    .select('*');
  
  if (tariffError) {
    console.error('Tariff error:', tariffError);
  } else {
    console.log('Tariffs found:', tariffs.length);
    if (tariffs.length > 0) {
      console.log('Sample tariff:', tariffs[0]);
    }
  }
  
  // Test 3: Check with the same query as TariffService
  console.log('\n3. Testing TariffService query...');
  const { data: fullData, error: fullError } = await supabase
    .from('tariffs')
    .select(`
      *,
      currency_data:currencies(*),
      tariff_features(*),
      tariff_limits(*)
    `)
    .eq('is_active', true)
    .order('name');
  
  if (fullError) {
    console.error('Full query error:', fullError);
  } else {
    console.log('Full query results:', fullData.length);
    if (fullData.length > 0) {
      console.log('Sample full data:', JSON.stringify(fullData[0], null, 2));
    }
  }
}

testTariffData();