-- ====================================================================
-- V3: REFACTOR LEDGER TO ACCOUNT SERVICE INTEGRATION
-- Eliminate duplicate ledger account and hold tables while safely
-- preserving historical ledger entries and transactions.
-- ====================================================================

-- 1. REFACTOR LEDGER ENTRIES:
-- Add account_id column if not exists
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS account_id VARCHAR(100);

-- Migrate existing ledger entries to point to account_reference or ledger_account_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_accounts') THEN
        UPDATE ledger_entries e
        SET account_id = COALESCE(la.account_reference, la.ledger_account_id)
        FROM ledger_accounts la
        WHERE e.ledger_account_id = la.id AND e.account_id IS NULL;
    END IF;
END $$;

-- Set account_id NOT NULL and drop foreign key constraint
ALTER TABLE ledger_entries ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_ledger_account_id_fkey;
ALTER TABLE ledger_entries DROP COLUMN IF EXISTS ledger_account_id;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id ON ledger_entries(account_id);


-- 2. REFACTOR LEDGER BALANCE SNAPSHOTS:
-- Add account_id column if not exists
ALTER TABLE ledger_balance_snapshots ADD COLUMN IF NOT EXISTS account_id VARCHAR(100);

-- Migrate existing balance snapshots to point to account_reference or ledger_account_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_accounts') THEN
        UPDATE ledger_balance_snapshots s
        SET account_id = COALESCE(la.account_reference, la.ledger_account_id)
        FROM ledger_accounts la
        WHERE s.ledger_account_id = la.id AND s.account_id IS NULL;
    END IF;
END $$;

ALTER TABLE ledger_balance_snapshots ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE ledger_balance_snapshots DROP CONSTRAINT IF EXISTS ledger_balance_snapshots_ledger_account_id_key;
ALTER TABLE ledger_balance_snapshots DROP CONSTRAINT IF EXISTS ledger_balance_snapshots_ledger_account_id_fkey;
ALTER TABLE ledger_balance_snapshots DROP COLUMN IF EXISTS ledger_account_id;
ALTER TABLE ledger_balance_snapshots ADD CONSTRAINT uq_ledger_balance_snapshots_account_id UNIQUE (account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_balance_snapshots_acc ON ledger_balance_snapshots(account_id);


-- 3. REFACTOR RECONCILIATION DISCREPANCIES:
-- Add account_id column if not exists
ALTER TABLE reconciliation_discrepancies ADD COLUMN IF NOT EXISTS account_id VARCHAR(100);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_accounts') THEN
        UPDATE reconciliation_discrepancies d
        SET account_id = COALESCE(la.account_reference, la.ledger_account_id)
        FROM ledger_accounts la
        WHERE d.ledger_account_id = la.id AND d.account_id IS NULL;
    END IF;
END $$;

ALTER TABLE reconciliation_discrepancies ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE reconciliation_discrepancies DROP CONSTRAINT IF EXISTS reconciliation_discrepancies_ledger_account_id_fkey;
ALTER TABLE reconciliation_discrepancies DROP COLUMN IF EXISTS ledger_account_id;
CREATE INDEX IF NOT EXISTS idx_rec_disc_account_id ON reconciliation_discrepancies(account_id);


-- 4. REMOVE DUPLICATE ACCOUNT HOLDS TABLE (Managed authoritatively by Account Service)
DROP TABLE IF EXISTS account_holds CASCADE;


-- 5. REMOVE DUPLICATE LEDGER ACCOUNTS TABLE (Managed authoritatively by Account Service)
DROP TABLE IF EXISTS ledger_accounts CASCADE;
