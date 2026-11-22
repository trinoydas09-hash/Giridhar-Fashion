-- Replace demo-only store contacts and seed the confirmed VIP membership terms.
update public.store_settings
set whatsapp_number = '',
    store_email = '',
    address = '',
    instagram_url = '',
    facebook_url = '',
    announcement_text = '',
    announcement_active = false,
    delivery_charge_dhaka = 80,
    delivery_charge_outside = 130,
    free_delivery_threshold = 2,
    delivery_info = 'Chattogram city delivery: ৳80 · Outside Chattogram: ৳130 · Free delivery when you order any 2 products.',
    story_title = 'Modern · Minimal · Distinct',
    story_body = 'GIRIDHAR FASHION is a modern menswear brand from Bangladesh.',
    updated_at = now()
where id = 'default-settings';

update public.ai_assistant_settings
set whatsapp_support_number = '',
    updated_at = now()
where id = 'default-ai-settings';

-- This demo combo references sample products and must stay unpublished until real products are loaded.
update public.offers
set is_active = false,
    updated_at = now()
where id = 'offer-shirt-trouser-combo';

insert into public.membership_settings
  (id, is_active, name, tagline, hero_description, price_bdt, billing_period_label,
   validity_text, discount_percentage, promo_banner_text, cta_button_label,
   whatsapp_message_template, benefits, how_it_works, faqs, updated_at)
values
  ('default-membership', true, 'GIRIDHAR PREMIUM MEMBERSHIP',
   'Modern · Minimal · Distinct',
   'An annual membership with 20% off eligible product purchases after admin approval.',
   59, 'year',
   'Valid for 12 months from admin approval and activation.',
   20,
   'Enjoy 20% off product prices with an active membership code. Delivery charges are excluded.',
   'Request Membership',
   E'Hello GIRIDHAR FASHION!\\n\\nI would like to request the Premium Membership for ৳59/year.\\nPlease share the payment and registration details.',
   '["20% discount on product prices with an active approved membership code","Valid for 12 months after admin approval and activation"]'::jsonb,
   '["Submit a membership request through WhatsApp","The store team manually verifies the payment","After approval, receive a unique membership code","Apply the active code at checkout; delivery charges are excluded"]'::jsonb,
   '[]'::jsonb,
   now())
on conflict (id) do update set
  is_active = excluded.is_active,
  name = excluded.name,
  tagline = excluded.tagline,
  hero_description = excluded.hero_description,
  price_bdt = excluded.price_bdt,
  billing_period_label = excluded.billing_period_label,
  validity_text = excluded.validity_text,
  discount_percentage = excluded.discount_percentage,
  promo_banner_text = excluded.promo_banner_text,
  cta_button_label = excluded.cta_button_label,
  whatsapp_message_template = excluded.whatsapp_message_template,
  benefits = excluded.benefits,
  how_it_works = excluded.how_it_works,
  faqs = excluded.faqs,
  updated_at = now();
