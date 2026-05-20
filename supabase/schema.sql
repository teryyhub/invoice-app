-- Enable UUID
create extension if not exists "uuid-ossp";

-- Vendor Profiles
create table if not exists vendor_profiles (
  id uuid primary key default uuid_generate_v4(),
  vendor_name text not null,
  gstin text not null,
  address text not null,
  stamp_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoices
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null,
  invoice_date date,
  delivery_order_number text,
  vendor_id uuid references vendor_profiles(id),
  customer_name text not null,
  customer_mobile text,
  customer_address text,
  mode text default 'CHOLA',
  product_description text,
  product_model text,
  imei_serial text,
  quantity integer default 1,
  product_price numeric(12,2) default 0,
  rate numeric(12,2) default 0,
  cgst numeric(12,2) default 0,
  sgst numeric(12,2) default 0,
  grand_total numeric(12,2) default 0,
  delivery_order_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table vendor_profiles enable row level security;
alter table invoices enable row level security;

-- Policies: authenticated users can manage their own data
create policy "Authenticated users can manage vendor profiles"
  on vendor_profiles for all
  to authenticated
  using (true) with check (true);

create policy "Authenticated users can manage invoices"
  on invoices for all
  to authenticated
  using (true) with check (true);

-- Storage buckets (run these too)
-- insert into storage.buckets (id, name, public) values ('delivery-orders', 'delivery-orders', true);
-- insert into storage.buckets (id, name, public) values ('stamps', 'stamps', true);
