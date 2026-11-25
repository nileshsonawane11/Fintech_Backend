ALTER TABLE loan_applications
    ALTER COLUMN loan_application_id TYPE VARCHAR(50);

ALTER TABLE loan_offers
    ALTER COLUMN loan_application_id TYPE VARCHAR(50);

ALTER TABLE loan_accounts
    ALTER COLUMN loan_application_id TYPE VARCHAR(50);
