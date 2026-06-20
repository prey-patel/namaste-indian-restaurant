-- Add settings, menu, site content, and dining tables to supabase_realtime publication
do $$
begin
  begin
    alter publication supabase_realtime add table public.system_settings;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.operational_status;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.service_hours;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.holiday_closures;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.categories;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.menu_items;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.delivery_fee_rules;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.packaging_fee_rules;
  exception
    when duplicate_object then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.site_content;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.dining_tables;
  exception
    when duplicate_object then null;
  end;
end $$;
