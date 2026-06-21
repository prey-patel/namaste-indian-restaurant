-- Allow public SELECT access on system_settings to enable anonymous clients to receive Realtime updates
CREATE POLICY select_system_settings_public ON public.system_settings
    FOR SELECT TO public USING (true);
