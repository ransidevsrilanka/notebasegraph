CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'super_admin',
    'content_admin',
    'support_admin',
    'student'
);


--
-- Name: code_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.code_status AS ENUM (
    'active',
    'used',
    'expired',
    'revoked'
);


--
-- Name: grade_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.grade_level AS ENUM (
    'ol',
    'al_grade12',
    'al_grade13'
);


--
-- Name: medium_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.medium_type AS ENUM (
    'english',
    'sinhala'
);


--
-- Name: stream_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stream_type AS ENUM (
    'maths',
    'biology',
    'commerce',
    'arts',
    'technology'
);


--
-- Name: tier_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tier_type AS ENUM (
    'starter',
    'standard',
    'lifetime'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  
  RETURN new;
END;
$$;


--
-- Name: has_enrollment_access(uuid, public.grade_level, public.stream_type, public.medium_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_enrollment_access(_user_id uuid, _grade public.grade_level, _stream public.stream_type, _medium public.medium_type) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE user_id = _user_id
      AND grade = _grade
      AND stream = _stream
      AND medium = _medium
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'content_admin', 'support_admin')
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_access_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_access_code(_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code_record access_codes%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Look up the code
  SELECT * INTO v_code_record
  FROM access_codes
  WHERE code = upper(_code);

  -- Code not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'INVALID_CODE',
      'message', 'Access code not found'
    );
  END IF;

  -- Check if code is active
  IF v_code_record.status <> 'active' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'CODE_NOT_ACTIVE',
      'message', 'This access code is no longer active'
    );
  END IF;

  -- Check activation limit
  IF v_code_record.activations_used >= COALESCE(v_code_record.activation_limit, 1) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'CODE_FULLY_USED',
      'message', 'This access code has already been used'
    );
  END IF;

  -- Check expiry (if set on the code itself)
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'CODE_EXPIRED',
      'message', 'This access code has expired'
    );
  END IF;

  -- Code is valid - return details
  RETURN jsonb_build_object(
    'valid', true,
    'code_id', v_code_record.id,
    'grade', v_code_record.grade,
    'stream', v_code_record.stream,
    'medium', v_code_record.medium,
    'tier', v_code_record.tier,
    'duration_days', v_code_record.duration_days
  );
END;
$$;


SET default_table_access_method = heap;

--
-- Name: access_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    grade public.grade_level NOT NULL,
    stream public.stream_type NOT NULL,
    medium public.medium_type NOT NULL,
    tier public.tier_type NOT NULL,
    duration_days integer NOT NULL,
    status public.code_status DEFAULT 'active'::public.code_status NOT NULL,
    activation_limit integer DEFAULT 1,
    activations_used integer DEFAULT 0,
    created_by uuid,
    activated_by uuid,
    activated_at timestamp with time zone,
    bound_email text,
    bound_device text,
    ip_history jsonb DEFAULT '[]'::jsonb,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_order_id text,
    is_payment_generated boolean DEFAULT false
);


--
-- Name: download_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.download_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    note_id uuid NOT NULL,
    ip_address text,
    downloaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    access_code_id uuid NOT NULL,
    grade public.grade_level NOT NULL,
    stream public.stream_type NOT NULL,
    medium public.medium_type NOT NULL,
    tier public.tier_type NOT NULL,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    file_url text,
    file_size integer,
    min_tier public.tier_type DEFAULT 'starter'::public.tier_type NOT NULL,
    view_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    device_fingerprint text,
    max_devices integer DEFAULT 2,
    is_locked boolean DEFAULT false,
    abuse_flags integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stream_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stream_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream public.stream_type NOT NULL,
    subject_name text NOT NULL,
    subject_code text,
    is_mandatory boolean DEFAULT false,
    basket text DEFAULT 'optional'::text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    grade public.grade_level NOT NULL,
    stream public.stream_type NOT NULL,
    medium public.medium_type NOT NULL,
    icon text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    streams public.stream_type[] DEFAULT ARRAY[]::public.stream_type[]
);


--
-- Name: topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upgrade_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upgrade_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    reference_number text NOT NULL,
    current_tier public.tier_type NOT NULL,
    requested_tier public.tier_type NOT NULL,
    amount numeric(10,2) NOT NULL,
    receipt_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT upgrade_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'student'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token text NOT NULL,
    device_info text,
    ip_address text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    subject_1 text NOT NULL,
    subject_2 text NOT NULL,
    subject_3 text NOT NULL,
    is_locked boolean DEFAULT false,
    locked_at timestamp with time zone,
    locked_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: access_codes access_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_code_key UNIQUE (code);


--
-- Name: access_codes access_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_pkey PRIMARY KEY (id);


--
-- Name: download_logs download_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_user_id_access_code_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_access_code_id_key UNIQUE (user_id, access_code_id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_key UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: stream_subjects stream_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_subjects
    ADD CONSTRAINT stream_subjects_pkey PRIMARY KEY (id);


--
-- Name: stream_subjects stream_subjects_stream_subject_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_subjects
    ADD CONSTRAINT stream_subjects_stream_subject_name_key UNIQUE (stream, subject_name);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: upgrade_requests upgrade_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upgrade_requests
    ADD CONSTRAINT upgrade_requests_pkey PRIMARY KEY (id);


--
-- Name: upgrade_requests upgrade_requests_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upgrade_requests
    ADD CONSTRAINT upgrade_requests_reference_number_key UNIQUE (reference_number);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_subjects user_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subjects
    ADD CONSTRAINT user_subjects_pkey PRIMARY KEY (id);


--
-- Name: user_subjects user_subjects_user_id_enrollment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subjects
    ADD CONSTRAINT user_subjects_user_id_enrollment_id_key UNIQUE (user_id, enrollment_id);


--
-- Name: idx_access_codes_payment_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_codes_payment_order_id ON public.access_codes USING btree (payment_order_id);


--
-- Name: enrollments update_enrollments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: upgrade_requests update_upgrade_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_upgrade_requests_updated_at BEFORE UPDATE ON public.upgrade_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_subjects update_user_subjects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_subjects_updated_at BEFORE UPDATE ON public.user_subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: access_codes access_codes_activated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_activated_by_fkey FOREIGN KEY (activated_by) REFERENCES auth.users(id);


--
-- Name: access_codes access_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: download_logs download_logs_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: download_logs download_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_access_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_access_code_id_fkey FOREIGN KEY (access_code_id) REFERENCES public.access_codes(id);


--
-- Name: enrollments enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notes notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: notes notes_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: topics topics_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: upgrade_requests upgrade_requests_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upgrade_requests
    ADD CONSTRAINT upgrade_requests_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_subjects user_subjects_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subjects
    ADD CONSTRAINT user_subjects_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE CASCADE;


--
-- Name: access_codes Admins can manage access codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage access codes" ON public.access_codes USING (public.is_admin(auth.uid()));


--
-- Name: user_subjects Admins can manage all subject selections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all subject selections" ON public.user_subjects USING (public.is_admin(auth.uid()));


--
-- Name: enrollments Admins can manage enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage enrollments" ON public.enrollments TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: notes Admins can manage notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notes" ON public.notes USING (public.is_admin(auth.uid()));


--
-- Name: user_sessions Admins can manage sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sessions" ON public.user_sessions USING (public.is_admin(auth.uid()));


--
-- Name: site_settings Admins can manage site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage site settings" ON public.site_settings USING (public.is_admin(auth.uid()));


--
-- Name: stream_subjects Admins can manage stream subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage stream subjects" ON public.stream_subjects USING (public.is_admin(auth.uid()));


--
-- Name: subjects Admins can manage subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage subjects" ON public.subjects USING (public.is_admin(auth.uid()));


--
-- Name: topics Admins can manage topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage topics" ON public.topics USING (public.is_admin(auth.uid()));


--
-- Name: upgrade_requests Admins can manage upgrade requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage upgrade requests" ON public.upgrade_requests USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: download_logs Admins can view all downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all downloads" ON public.download_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: site_settings Anyone can read site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: stream_subjects Anyone can read stream subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read stream subjects" ON public.stream_subjects FOR SELECT USING (true);


--
-- Name: access_codes Anyone can validate active codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can validate active codes" ON public.access_codes FOR SELECT TO authenticated, anon USING ((status = 'active'::public.code_status));


--
-- Name: user_roles Super admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: download_logs Users can insert own downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own downloads" ON public.download_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: enrollments Users can insert own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own enrollments" ON public.enrollments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_subjects Users can insert own subject selections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own subject selections" ON public.user_subjects FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: upgrade_requests Users can insert own upgrade requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own upgrade requests" ON public.upgrade_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: upgrade_requests Users can update own pending requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own pending requests" ON public.upgrade_requests FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_subjects Users can update own unlocked selections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own unlocked selections" ON public.user_subjects FOR UPDATE USING (((auth.uid() = user_id) AND (is_locked = false)));


--
-- Name: notes Users can view notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view notes" ON public.notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.topics t
     JOIN public.subjects s ON ((s.id = t.subject_id)))
  WHERE ((t.id = notes.topic_id) AND (public.is_admin(auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.enrollments e
          WHERE ((e.user_id = auth.uid()) AND (e.grade = s.grade) AND (e.stream = s.stream) AND (e.medium = s.medium) AND (e.is_active = true) AND ((e.expires_at IS NULL) OR (e.expires_at > now()))))))))));


--
-- Name: download_logs Users can view own downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own downloads" ON public.download_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: enrollments Users can view own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_subjects Users can view own subject selections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subject selections" ON public.user_subjects FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: upgrade_requests Users can view own upgrade requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own upgrade requests" ON public.upgrade_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subjects Users can view subjects matching enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view subjects matching enrollment" ON public.subjects FOR SELECT USING ((public.is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.enrollments e
  WHERE ((e.user_id = auth.uid()) AND (e.grade = subjects.grade) AND (e.stream = ANY (subjects.streams)) AND (e.medium = subjects.medium) AND (e.is_active = true) AND ((e.expires_at IS NULL) OR (e.expires_at > now())))))));


--
-- Name: access_codes Users can view their activated code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their activated code" ON public.access_codes FOR SELECT USING ((activated_by = auth.uid()));


--
-- Name: topics Users can view topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view topics" ON public.topics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.subjects s
  WHERE ((s.id = topics.subject_id) AND (public.is_admin(auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.enrollments e
          WHERE ((e.user_id = auth.uid()) AND (e.grade = s.grade) AND (e.stream = s.stream) AND (e.medium = s.medium) AND (e.is_active = true) AND ((e.expires_at IS NULL) OR (e.expires_at > now()))))))))));


--
-- Name: access_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: download_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: stream_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stream_subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

--
-- Name: upgrade_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;