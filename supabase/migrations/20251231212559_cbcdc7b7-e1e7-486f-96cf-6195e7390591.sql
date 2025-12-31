-- Add foreign key from creator_profiles to cmo_profiles
ALTER TABLE public.creator_profiles 
ADD CONSTRAINT creator_profiles_cmo_id_fkey 
FOREIGN KEY (cmo_id) REFERENCES public.cmo_profiles(id);

-- Add foreign key from cmo_payouts to cmo_profiles
ALTER TABLE public.cmo_payouts 
ADD CONSTRAINT cmo_payouts_cmo_id_fkey 
FOREIGN KEY (cmo_id) REFERENCES public.cmo_profiles(id);