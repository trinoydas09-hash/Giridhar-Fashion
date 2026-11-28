-- Associate each product gallery image with its colour variant group.
-- Existing rows remain visible as unassigned until their alt text is mapped below.
alter table public.product_images
  add column if not exists colour text;

create index if not exists idx_product_images_product_colour_order
  on public.product_images (product_id, colour, display_order);

update public.product_images
set colour = case
  when lower(alt_text) like 'black hoodie%' then 'Black'
  when lower(alt_text) like 'off-white hoodie%' then 'Off-White'
  when lower(alt_text) like 'burgundy hoodie%' then 'Burgundy'
  when lower(alt_text) like 'dark chocolate brown hoodie%' then 'Dark Chocolate Brown'
  else colour
end
where colour is null
  and (
    lower(alt_text) like 'black hoodie%'
    or lower(alt_text) like 'off-white hoodie%'
    or lower(alt_text) like 'burgundy hoodie%'
    or lower(alt_text) like 'dark chocolate brown hoodie%'
  );
