-- Change user_stores.id from serial to uuid
-- This migration converts existing integer IDs to UUIDs and updates all foreign keys

-- Step 1: Add a new uuid column
ALTER TABLE public.user_stores ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();

-- Step 2: Update existing rows to have uuid values
UPDATE public.user_stores SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

-- Step 3: Add temporary columns to tables with foreign keys
-- For store_categories
ALTER TABLE public.store_categories ADD COLUMN store_id_uuid UUID;

UPDATE public.store_categories sc
SET store_id_uuid = us.id_uuid
FROM public.user_stores us
WHERE sc.store_id = us.id;

-- For store_currencies
ALTER TABLE public.store_currencies ADD COLUMN store_id_uuid UUID;

UPDATE public.store_currencies sc
SET store_id_uuid = us.id_uuid
FROM public.user_stores us
WHERE sc.store_id = us.id;

-- For store_products
ALTER TABLE public.store_products ADD COLUMN store_id_uuid UUID;

UPDATE public.store_products sp
SET store_id_uuid = us.id_uuid
FROM public.user_stores us
WHERE sp.store_id = us.id;

-- For store_product_links
ALTER TABLE public.store_product_links ADD COLUMN store_id_uuid UUID;

UPDATE public.store_product_links spl
SET store_id_uuid = us.id_uuid
FROM public.user_stores us
WHERE spl.store_id = us.id;

-- Step 4: Drop old foreign key constraints and columns
ALTER TABLE public.store_categories DROP CONSTRAINT IF EXISTS store_categories_store_id_fkey;
ALTER TABLE public.store_categories DROP COLUMN store_id;
ALTER TABLE public.store_categories RENAME COLUMN store_id_uuid TO store_id;

ALTER TABLE public.store_currencies DROP CONSTRAINT IF EXISTS store_currencies_store_id_fkey;
ALTER TABLE public.store_currencies DROP COLUMN store_id;
ALTER TABLE public.store_currencies RENAME COLUMN store_id_uuid TO store_id;

ALTER TABLE public.store_products DROP CONSTRAINT IF EXISTS store_products_store_id_fkey;
ALTER TABLE public.store_products DROP COLUMN store_id;
ALTER TABLE public.store_products RENAME COLUMN store_id_uuid TO store_id;

ALTER TABLE public.store_product_links DROP CONSTRAINT IF EXISTS store_product_links_store_id_fkey;
ALTER TABLE public.store_product_links DROP COLUMN store_id;
ALTER TABLE public.store_product_links RENAME COLUMN store_id_uuid TO store_id;

-- Step 5: Drop the old id column and rename id_uuid to id in user_stores
ALTER TABLE public.user_stores DROP CONSTRAINT IF EXISTS user_stores_pkey;
ALTER TABLE public.user_stores DROP COLUMN id;
ALTER TABLE public.user_stores RENAME COLUMN id_uuid TO id;

-- Step 6: Set the new id as primary key
ALTER TABLE public.user_stores ADD PRIMARY KEY (id);

-- Step 7: Make id NOT NULL and set default
ALTER TABLE public.user_stores ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.user_stores ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 8: Re-create foreign key constraints
ALTER TABLE public.store_categories
  ADD CONSTRAINT store_categories_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.user_stores(id) ON DELETE CASCADE;

ALTER TABLE public.store_currencies
  ADD CONSTRAINT store_currencies_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.user_stores(id) ON DELETE CASCADE;

ALTER TABLE public.store_products
  ADD CONSTRAINT store_products_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.user_stores(id) ON DELETE CASCADE;

ALTER TABLE public.store_product_links
  ADD CONSTRAINT store_product_links_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.user_stores(id) ON DELETE CASCADE;

-- Step 9: Re-create indexes
CREATE INDEX IF NOT EXISTS idx_store_categories_store_id ON public.store_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_store_currencies_store_id ON public.store_currencies(store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_store_id ON public.store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_product_links_store_id ON public.store_product_links(store_id);
