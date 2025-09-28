import { TariffService } from '@/lib/tariff-service';

const testTariffService = async () => {
  try {
    console.log('Testing Tariff Service...');
    
    // Test fetching all currencies
    console.log('Fetching currencies...');
    const currencies = await TariffService.getAllCurrencies();
    console.log('Currencies:', currencies);
    
    // Test fetching all tariffs
    console.log('Fetching tariffs...');
    const tariffs = await TariffService.getAllTariffs(true); // Include inactive
    console.log('Tariffs:', tariffs);
    
    // Test fetching a specific tariff
    if (tariffs.length > 0) {
      console.log('Fetching tariff by ID...');
      const tariff = await TariffService.getTariffById(tariffs[0].id);
      console.log('Tariff:', tariff);
    }
    
    console.log('Tariff Service tests completed successfully!');
  } catch (error) {
    console.error('Error testing Tariff Service:', error);
  }
};

export default testTariffService;