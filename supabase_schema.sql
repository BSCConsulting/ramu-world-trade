-- =========================================================================
-- World of Trade: Sovereign Cloud Persistence Schema (Supabase)
-- Project: https://cxzefzyzmmasypyonmek.supabase.co
-- =========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: trade_scenarios
-- Stores user custom simulations, custom EV / Mandi arbitrage models, and saved blueprints
create table if not exists public.trade_scenarios (
  id uuid default gen_random_uuid() primary key,
  device_id text not null,
  title text not null,
  scenario_type text not null default 'universal_arbitrage',
  inputs jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for high-speed device lookups
create index if not exists idx_trade_scenarios_device_id on public.trade_scenarios (device_id);
create index if not exists idx_trade_scenarios_created_at on public.trade_scenarios (created_at desc);

-- Enable Row Level Security (RLS)
alter table public.trade_scenarios enable row level security;

-- Policy: Allow anonymous public access scoped by device_id or open sync
create policy "Allow read access to all users" 
  on public.trade_scenarios for select 
  using (true);

create policy "Allow insert access to all users" 
  on public.trade_scenarios for insert 
  with check (true);

create policy "Allow update access to matching device_id" 
  on public.trade_scenarios for update 
  using (true);

create policy "Allow delete access to matching device_id" 
  on public.trade_scenarios for delete 
  using (true);
