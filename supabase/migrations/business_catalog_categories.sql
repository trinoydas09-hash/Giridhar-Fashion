-- Keep the storefront category set aligned with the confirmed launch assortment.
delete from public.categories
where slug not in ('full-sleeve-shirts','shirts','half-sleeve-shirts','trousers');

insert into public.categories (id,name,slug,description,image_url,display_order,is_published)
values
 ('cat-full-sleeve','Full Sleeve Shirts','full-sleeve-shirts','Modern full-sleeve shirts for everyday and smart-casual wear.','/images/categories/shirts.svg',1,true),
 ('cat-shirts','Shirts','shirts','Minimal shirts for a clean, versatile wardrobe.','/images/categories/shirts.svg',2,true),
 ('cat-half-sleeve','Half Sleeve Shirts','half-sleeve-shirts','Easy-wearing half-sleeve shirts for everyday style.','/images/categories/shirts.svg',3,true),
 ('cat-trousers','Trousers','trousers','Versatile trousers to pair with the GIRIDHAR FASHION collection.','/images/categories/trousers.svg',4,true)
on conflict (id) do update set
 name=excluded.name, slug=excluded.slug, description=excluded.description,
 image_url=excluded.image_url, display_order=excluded.display_order, is_published=true, updated_at=now();

