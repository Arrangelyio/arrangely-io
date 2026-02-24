-- Grant table privileges so PostgREST exposes relations to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registrations TO authenticated;

-- Also ensure service_role has full access
GRANT ALL ON public.events TO service_role;
GRANT ALL ON public.event_registrations TO service_role;

-- In case sequences are added in future, grant default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;