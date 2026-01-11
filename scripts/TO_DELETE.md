# Scripts a Eliminar - FASE 3.3

Esta lista contiene scripts específicos de Maxi/Trello/Madero/Rosario que deben eliminarse para la conversión a SaaS.

## Scripts Específicos de Trello

- [ ] `setup-trello-complete.ts` - Setup específico de Trello para Rosario/Madero
- [ ] `setup-madero-complete.ts` - Setup específico de Trello para Madero
- [ ] `setup-trello-madero.ts` - Setup específico de Trello para Madero
- [ ] `setup-all-trello-agencies.ts` - Setup específico de Trello
- [ ] `sync-madero-complete.ts` - Sync específico de Trello para Madero
- [ ] `sync-madero-trello.ts` - Sync específico de Trello para Madero
- [ ] `sync-rosario-complete.ts` - Sync específico de Trello para Rosario
- [ ] `sync-rosario-only.ts` - Sync específico de Trello para Rosario
- [ ] `register-webhook-rosario.ts` - Webhook específico de Trello para Rosario
- [ ] `register-webhook-madero-manual.ts` - Webhook específico de Trello para Madero
- [ ] `fix-trello-webhook-madero.ts` - Fix específico de Trello para Madero
- [ ] `sync-trello-list-ids-madero.ts` - Sync específico de Trello para Madero
- [ ] `reset-and-sync-trello-production.ts` - Tiene referencia a maxevagestion.com
- [ ] `reset-and-sync-all-trello-leads.ts` - Reset específico de Trello
- [ ] `full-trello-reset.ts` - Reset específico de Trello
- [ ] `trello-restore-integration.ts` - Restore específico de Trello

## Scripts Específicos de Maxi/Rosario/Madero

- [ ] `seed.ts` - Seed data con Maxi, Rosario, Madero hardcoded
- [ ] `import-operations-from-maxi-csv.ts` - Import específico de Maxi
- [ ] `create-sellers-and-assign-operations.ts` - Tiene "rosario" como default

## Scripts Genéricos (MANTENER)

- `generate-payment-reminders.ts` - Genérico, útil
- `generate-recurring-payments.ts` - Genérico, útil
- `delete-all-data.ts` - Genérico, útil para testing
- `list-agencies.ts` - Genérico, útil
- `create-tables.ts` - Genérico, útil (aunque obsoleto con migraciones)
- `execute-migration.ts` - Genérico, útil
- `migrate-historical-accounting-data.ts` - Genérico, útil
- `migrate-ledger-to-chart-of-accounts.ts` - Genérico, útil
- `link-cash-accounts-to-chart.ts` - Genérico, útil
