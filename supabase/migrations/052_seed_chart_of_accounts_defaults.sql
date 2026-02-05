-- =====================================================
-- Seed default chart_of_accounts per agency + trigger
-- Ensures required account_code mappings exist
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_for_agency(
  p_agency_id UUID,
  p_created_by UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO chart_of_accounts (
    agency_id,
    account_code,
    account_name,
    category,
    subcategory,
    account_type,
    level,
    is_movement_account,
    display_order,
    description,
    is_active,
    created_by
  )
  SELECT
    p_agency_id,
    t.account_code,
    t.account_name,
    t.category,
    t.subcategory,
    t.account_type,
    t.level,
    t.is_movement_account,
    t.display_order,
    t.description,
    true,
    p_created_by
  FROM (
    VALUES
      ('1.1.01', 'Caja', 'ACTIVO', 'CORRIENTE', 'CAJA', 3, true, 10, 'Caja en efectivo'),
      ('1.1.02', 'Bancos', 'ACTIVO', 'CORRIENTE', 'BANCO', 3, true, 20, 'Cuentas bancarias'),
      ('1.1.03', 'Cuentas por Cobrar', 'ACTIVO', 'CORRIENTE', 'CUENTAS_POR_COBRAR', 3, true, 30, 'Clientes pendientes de cobro'),
      ('1.1.04', 'Mercado Pago', 'ACTIVO', 'CORRIENTE', 'PLATAFORMAS_PAGO', 3, true, 40, 'Saldos en Mercado Pago'),
      ('1.1.05', 'Otros Activos', 'ACTIVO', 'NO_CORRIENTE', 'OTROS', 3, true, 50, 'Activos varios'),
      ('2.1.01', 'Cuentas por Pagar', 'PASIVO', 'CORRIENTE', 'CUENTAS_POR_PAGAR', 3, true, 60, 'Obligaciones con proveedores'),
      ('4.1.01', 'Ingresos por Ventas', 'RESULTADO', 'INGRESOS', 'INGRESOS', 3, true, 70, 'Ventas de servicios'),
      ('4.2.01', 'Costos de Ventas', 'RESULTADO', 'COSTOS', 'COSTOS', 3, true, 80, 'Costos directos de ventas'),
      ('4.3.01', 'Gastos Administrativos', 'RESULTADO', 'GASTOS', 'GASTOS', 3, true, 90, 'Gastos operativos')
  ) AS t(account_code, account_name, category, subcategory, account_type, level, is_movement_account, display_order, description)
  ON CONFLICT (agency_id, account_code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_trigger()
RETURNS trigger AS $$
BEGIN
  PERFORM create_default_chart_of_accounts_for_agency(NEW.id, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_default_chart_of_accounts_on_agency ON agencies;
CREATE TRIGGER create_default_chart_of_accounts_on_agency
  AFTER INSERT ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION create_default_chart_of_accounts_trigger();

-- Backfill para agencias existentes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM agencies LOOP
    PERFORM create_default_chart_of_accounts_for_agency(r.id, NULL);
  END LOOP;
END $$;

