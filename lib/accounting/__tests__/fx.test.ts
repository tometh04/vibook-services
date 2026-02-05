import { calculateAndRecordFX } from "../fx"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import * as ledger from "../ledger"
import * as exchangeRates from "../exchange-rates"

// Mock ledger functions
jest.mock("../ledger", () => ({
  createLedgerMovement: jest.fn(),
  getOrCreateDefaultAccount: jest.fn(),
}))

// Mock exchange rates
jest.mock("../exchange-rates", () => ({
  getLatestExchangeRate: jest.fn(),
  getExchangeRate: jest.fn(),
}))

const createMockSupabase = () => {
  return {
    from: jest.fn(),
  } as unknown as SupabaseClient<Database>
}

describe("FX Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(ledger.getOrCreateDefaultAccount as jest.Mock).mockResolvedValue("account-id-123")
    ;(ledger.createLedgerMovement as jest.Mock).mockResolvedValue({ id: "movement-id-123" })
    ;(exchangeRates.getLatestExchangeRate as jest.Mock).mockResolvedValue(1000)
    ;(exchangeRates.getExchangeRate as jest.Mock).mockResolvedValue(1000)
  })

  describe("calculateAndRecordFX", () => {
    it("should return null FX when currencies are the same", async () => {
      const mockSupabase = createMockSupabase()

      const result = await calculateAndRecordFX(
        mockSupabase,
        "op-123",
        "ARS",
        1000,
        null,
        "ARS",
        1000,
        null,
        "user-123"
      )

      expect(result.fxType).toBeNull()
      expect(result.fxAmount).toBe(0)
      expect(ledger.createLedgerMovement).not.toHaveBeenCalled()
    })

    it("should calculate FX_GAIN when sale in USD and payment in ARS with better rate", async () => {
      const mockSupabase = createMockSupabase()

      // Sale: 100 USD
      // Payment: 90,000 ARS at 1000 ARS/USD = 90 USD (gain 10 USD)
      const result = await calculateAndRecordFX(
        mockSupabase,
        "op-123",
        "USD",
        100,
        1000, // sale exchange rate
        "ARS",
        90000,
        null, // payment is in ARS, no exchange rate needed
        "user-123"
      )

      expect(result.fxType).toBe("FX_GAIN")
      expect(result.fxAmount).toBeCloseTo(10, 2)
      expect(ledger.createLedgerMovement).toHaveBeenCalled()
    })

    it("should calculate FX_LOSS when sale in USD and payment in ARS with worse rate", async () => {
      const mockSupabase = createMockSupabase()

      // Sale: 100 USD
      // Payment: 110,000 ARS at 1000 ARS/USD = 110 USD (loss 10 USD)
      const result = await calculateAndRecordFX(
        mockSupabase,
        "op-123",
        "USD",
        100,
        1000, // sale exchange rate
        "ARS",
        110000,
        null,
        "user-123"
      )

      expect(result.fxType).toBe("FX_LOSS")
      expect(result.fxAmount).toBeCloseTo(10, 2)
      expect(ledger.createLedgerMovement).toHaveBeenCalled()
    })

    it("should ignore very small differences (< 0.01 USD)", async () => {
      const mockSupabase = createMockSupabase()

      // Sale: 100 USD
      // Payment: 100,000.50 ARS at 1000 ARS/USD = 100.0005 USD (difference < 0.01 USD)
      const result = await calculateAndRecordFX(
        mockSupabase,
        "op-123",
        "USD",
        100,
        1000,
        "ARS",
        100000.50,
        null,
        "user-123"
      )

      expect(result.fxType).toBeNull()
      expect(result.fxAmount).toBe(0)
      expect(ledger.createLedgerMovement).not.toHaveBeenCalled()
    })

    it("should handle sale in ARS and payment in USD", async () => {
      const mockSupabase = createMockSupabase()

      // Sale: 100,000 ARS = 100 USD
      // Payment: 90 USD (gain 10 USD)
      const result = await calculateAndRecordFX(
        mockSupabase,
        "op-123",
        "ARS",
        100000,
        null,
        "USD",
        90,
        1000, // payment exchange rate
        "user-123"
      )

      expect(result.fxType).toBe("FX_GAIN")
      expect(result.fxAmount).toBeCloseTo(10, 2)
    })

    it("should use default exchange rate of 1 if not provided for USD", async () => {
      const mockSupabase = createMockSupabase()

      // Sale: 100 USD
      // Payment: 50,000 ARS at 1000 ARS/USD = 50 USD (gain 50 USD)
      const result = await calculateAndRecordFX(
        mockSupabase,
        "op-123",
        "USD",
        100,
        null, // no exchange rate
        "ARS",
        50000,
        null,
        "user-123"
      )

      expect(result.fxType).toBe("FX_GAIN")
      expect(result.fxAmount).toBeCloseTo(50, 2)
    })
  })
})
