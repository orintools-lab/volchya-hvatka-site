INSERT INTO "SiteSetting" ("id", "key", "label", "value", "isSecret", "createdAt", "updatedAt")
VALUES (
  'checkout-payment-mode',
  'checkoutPaymentMode',
  'Порядок оплаты заказа',
  '"PAY_AFTER_DELIVERY_AGREEMENT"'::jsonb,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
