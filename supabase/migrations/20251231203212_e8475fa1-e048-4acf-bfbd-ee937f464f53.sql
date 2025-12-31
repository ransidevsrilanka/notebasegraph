-- Create a security definer function to set user role during creator signup
-- This bypasses RLS since it runs with elevated privileges
CREATE OR REPLACE FUNCTION public.set_creator_role(_user_id uuid, _cmo_id uuid, _display_name text, _referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_profile creator_profiles%ROWTYPE;
BEGIN
  -- Delete the default student role created by trigger
  DELETE FROM public.user_roles 
  WHERE user_id = _user_id AND role = 'student';
  
  -- Insert content_creator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'content_creator')
  ON CONFLICT DO NOTHING;
  
  -- Create creator profile
  INSERT INTO public.creator_profiles (user_id, cmo_id, display_name, referral_code)
  VALUES (_user_id, _cmo_id, _display_name, _referral_code)
  RETURNING * INTO v_creator_profile;
  
  RETURN jsonb_build_object(
    'success', true,
    'creator_id', v_creator_profile.id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;