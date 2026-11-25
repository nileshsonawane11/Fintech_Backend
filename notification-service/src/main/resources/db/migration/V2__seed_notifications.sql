-- V2: Seed sample notifications for test customer (sub claim: CUST-TEST001)

INSERT INTO notifications (id, notification_id, customer_id, template_code, channel, title, body, read, created_at)
VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'NOT-778801',
    'CUST-TEST001',
    'PAYMENT_SUCCESS',
    'IN_APP',
    'Payment Successful',
    'Your payment of $250.00 to John Doe has been processed successfully. Reference: PAY-778801.',
    false,
    NOW() - INTERVAL '2 hours'
),
(
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'NOT-778802',
    'CUST-TEST001',
    'ACCOUNT_WELCOME',
    'EMAIL',
    'Welcome to FintechBank',
    'Dear valued customer, your account has been activated. You can now access all banking services. Thank you for choosing FintechBank.',
    true,
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (notification_id) DO NOTHING;
