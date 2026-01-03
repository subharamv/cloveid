ALTER TABLE public.vendor_sends
ADD COLUMN front_image_url TEXT,
ADD COLUMN back_image_url TEXT,
ADD COLUMN card_details JSONB;