-- Add is_model_paper column to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_model_paper BOOLEAN DEFAULT false;

-- Print Request Settings (for admin pricing)
CREATE TABLE public.print_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notes_price_per_page NUMERIC DEFAULT 5,
  model_paper_price_per_page NUMERIC DEFAULT 8,
  base_delivery_fee NUMERIC DEFAULT 200,
  cod_extra_fee NUMERIC DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Print Requests
CREATE TABLE public.print_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  full_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  print_type TEXT NOT NULL,
  subject_id UUID,
  subject_name TEXT NOT NULL,
  topic_ids UUID[],
  estimated_pages INTEGER DEFAULT 0,
  estimated_price NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  order_id TEXT,
  admin_notes TEXT,
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Print Request Items
CREATE TABLE public.print_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES print_requests(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id),
  topic_id UUID REFERENCES topics(id),
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  page_count INTEGER DEFAULT 1,
  price_per_page NUMERIC DEFAULT 5,
  subtotal NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.print_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_request_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for print_settings (admin only read/write)
CREATE POLICY "Admins can manage print settings" ON public.print_settings
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active print settings" ON public.print_settings
  FOR SELECT USING (is_active = true);

-- RLS Policies for print_requests
CREATE POLICY "Users can view own print requests" ON public.print_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own print requests" ON public.print_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all print requests" ON public.print_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_admin'));

CREATE POLICY "Admins can update print requests" ON public.print_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_admin'));

-- RLS Policies for print_request_items
CREATE POLICY "Users can view own print request items" ON public.print_request_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM print_requests WHERE id = request_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create own print request items" ON public.print_request_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM print_requests WHERE id = request_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all print request items" ON public.print_request_items
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Insert default print settings
INSERT INTO public.print_settings (notes_price_per_page, model_paper_price_per_page, base_delivery_fee, cod_extra_fee, is_active)
VALUES (5, 8, 200, 50, true);