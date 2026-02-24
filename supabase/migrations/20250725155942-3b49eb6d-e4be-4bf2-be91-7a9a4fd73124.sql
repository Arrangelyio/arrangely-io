-- Update the two successful payments that were completed in Midtrans
UPDATE payments 
SET status = 'paid', 
    paid_at = now(), 
    midtrans_transaction_id = CASE 
      WHEN midtrans_order_id = 'sub-1753458636861-a81ab8' THEN 'midtrans-success-636861' 
      WHEN midtrans_order_id = 'sub-1753458416537-5e4e63' THEN 'midtrans-success-416537'
      ELSE midtrans_transaction_id
    END
WHERE midtrans_order_id IN ('sub-1753458636861-a81ab8', 'sub-1753458416537-5e4e63') 
  AND is_production = true;