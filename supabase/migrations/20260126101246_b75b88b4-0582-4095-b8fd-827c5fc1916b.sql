-- Add missing columns to print_requests table
ALTER TABLE public.print_requests ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.print_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create policy to allow users to update their own print requests (for receipt upload)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'print_requests' 
    AND policyname = 'Users can update own print requests'
  ) THEN
    CREATE POLICY "Users can update own print requests"
      ON public.print_requests
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;