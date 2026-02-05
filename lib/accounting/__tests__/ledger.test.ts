import { calculateARSEquivalent } from '../ledger'

describe('Ledger Service - calculateARSEquivalent', () => {
  describe('ARS currency', () => {
    it('should convert ARS to USD using exchange rate', () => {
      const result = calculateARSEquivalent(1000, 'ARS', 1000)
      expect(result).toBe(1)
    })

    it('should handle decimal exchange rates for ARS', () => {
      const result = calculateARSEquivalent(1234.56, 'ARS', 1234.56)
      expect(result).toBe(1)
    })

    it('should throw error if exchange rate is missing for ARS', () => {
      expect(() => {
        calculateARSEquivalent(1000, 'ARS')
      }).toThrow('exchange_rate es requerido para convertir ARS a USD')
    })
  })

  describe('USD currency', () => {
    it('should return the same amount for USD currency', () => {
      const result = calculateARSEquivalent(100, 'USD')
      expect(result).toBe(100)
    })

    it('should ignore exchange rate for USD', () => {
      const result = calculateARSEquivalent(50, 'USD', 1234.56)
      expect(result).toBe(50)
    })
  })
})
