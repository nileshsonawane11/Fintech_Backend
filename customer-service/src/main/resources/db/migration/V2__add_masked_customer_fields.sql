ALTER TABLE customer_profiles
    ADD COLUMN mobile_masked VARCHAR(32),
    ADD COLUMN email_masked VARCHAR(254),
    ADD COLUMN pan_masked VARCHAR(16);