-- First migration: Add new roles to app_role enum only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cmo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_creator';