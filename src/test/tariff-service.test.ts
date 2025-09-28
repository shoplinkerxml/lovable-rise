import { describe, it, expect, vi } from 'vitest';
import { TariffService } from '@/lib/tariff-service';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  }
}));

describe('TariffService', () => {
  it('should have getAllTariffs method', () => {
    expect(TariffService.getAllTariffs).toBeDefined();
  });

  it('should have getTariffById method', () => {
    expect(TariffService.getTariffById).toBeDefined();
  });

  it('should have createTariff method', () => {
    expect(TariffService.createTariff).toBeDefined();
  });

  it('should have updateTariff method', () => {
    expect(TariffService.updateTariff).toBeDefined();
  });

  it('should have deleteTariff method', () => {
    expect(TariffService.deleteTariff).toBeDefined();
  });

  it('should have getAllCurrencies method', () => {
    expect(TariffService.getAllCurrencies).toBeDefined();
  });
});