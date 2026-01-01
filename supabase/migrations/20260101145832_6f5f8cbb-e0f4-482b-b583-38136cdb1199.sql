-- Enable realtime for payment tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_attributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;