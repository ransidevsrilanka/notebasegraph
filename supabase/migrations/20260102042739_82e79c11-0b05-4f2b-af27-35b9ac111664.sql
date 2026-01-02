-- Drop the partial unique index that's preventing upsert from working
DROP INDEX IF EXISTS payment_attributions_order_id_unique;

-- Add a proper unique constraint on order_id (not partial)
ALTER TABLE payment_attributions 
ADD CONSTRAINT payment_attributions_order_id_key UNIQUE (order_id);