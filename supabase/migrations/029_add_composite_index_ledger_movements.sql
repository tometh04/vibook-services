-- =====================================================
-- OPTIMIZACIÓN: Índice compuesto para queries comunes
-- =====================================================
-- Este índice mejora significativamente el rendimiento de queries
-- que filtran por account_id y created_at (muy común en balances y reportes)

CREATE INDEX IF NOT EXISTS idx_ledger_movements_account_created 
ON ledger_movements(account_id, created_at DESC);

-- Este índice también ayuda con queries que filtran por account_id y tipo
CREATE INDEX IF NOT EXISTS idx_ledger_movements_account_type 
ON ledger_movements(account_id, type);

-- Índice compuesto para queries que filtran por account_id, currency y created_at
-- Útil para reportes de flujo de caja y balances por moneda
CREATE INDEX IF NOT EXISTS idx_ledger_movements_account_currency_created 
ON ledger_movements(account_id, currency, created_at DESC);
