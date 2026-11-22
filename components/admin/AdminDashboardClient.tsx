'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Bot,
  Check,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Megaphone,
  Package,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatPrice, slugify } from '@/lib/utils/format';
import {
  Category,
  HomepageBanner,
  HomepageSectionConfig,
  Product,
  Promotion,
  StoreSettings,
  StoreSnapshot,
} from '@/types/store';
import { AdminAuthGate } from './AdminAuthGate';
import { AdminBrandExperienceManager } from './AdminBrandExperienceManager';
import { AdminMembershipManager } from './AdminMembershipManager';
import { AdminOffersManager } from './AdminOffersManager';
import { AdminProductEditor } from './AdminProductEditor';
import { AdminUnifiedAIPanel } from './AdminUnifiedAIPanel';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'homepage'
  | 'brand_experience'
  | 'offers'
  | 'promotions'
  | 'membership'
  | 'settings'
  | 'assistant';

export function AdminDashboardClient() {
  const [session, setSession] = useState<{
    token: string;
    email: string;
    mode: 'supabase' | 'preview';
  } | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Product state
  const [productSearch, setProductSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);

  // Category form state
  const [catForm, setCatForm] = useState<Partial<Category>>({
    name: '',
    slug: '',
    description: '',
    image_url: '/images/categories/shirts.svg',
    display_order: 1,
    is_published: true,
  });

  // Banner form state
  const [bannerForm, setBannerForm] = useState<Partial<HomepageBanner>>({
    title: '',
    subtitle: '',
    description: '',
    image_url: '/images/banners/hero-autumn-winter.svg',
    cta_label: 'Explore Collection',
    cta_href: '/shop',
    placement: 'hero',
    display_order: 1,
    is_active: true,
  });

  // Promotion form state
  const [promoForm, setPromoForm] = useState<Partial<Promotion>>({
    title: '',
    description: '',
    discount_text: '',
    promo_code: '',
    banner_image_url: '/images/banners/promo-tailoring.svg',
    cta_href: '/shop',
    start_date: '2026-11-01',
    end_date: '2027-01-31',
    is_active: true,
  });

  // Sections & Settings local editable states
  const [sectionsDraft, setSectionsDraft] = useState<HomepageSectionConfig[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings | null>(null);

  const flashNotice = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadSnapshot = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/admin/snapshot', {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        flashNotice('err', data.error || 'Failed to load admin snapshot.');
        return;
      }
      setSnapshot(data);
      setSectionsDraft(data.sections || []);
      setSettingsDraft(data.settings || null);
    } catch {
      flashNotice('err', 'Network error while fetching dashboard.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    fetch('/api/admin/snapshot', {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: 'no-store',
    })
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) {
          flashNotice('err', data.error || 'Failed to load admin snapshot.');
          return;
        }
        setSnapshot(data);
        setSectionsDraft(data.sections || []);
        setSettingsDraft(data.settings || null);
      })
      .catch(() => {
        if (active) flashNotice('err', 'Network error while fetching dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const handleLogout = async () => {
    if (session?.mode === 'supabase') {
      const sb = createSupabaseBrowserClient();
      await sb?.auth.signOut();
    }
    setSession(null);
    setSnapshot(null);
  };

  const uploadAdminImage = async (file: File): Promise<string | null> => {
    if (!session) return null;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      flashNotice('err', data.error || 'Image upload failed.');
      return null;
    }
    return data.url;
  };

  const toggleProductPublish = async (product: Product) => {
    if (!session) return;
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          ...product,
          is_published: !product.is_published,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        flashNotice('err', d.error || 'Failed to update product status.');
        return;
      }
      flashNotice('ok', `${product.name} ${!product.is_published ? 'published' : 'moved to draft'}.`);
      await loadSnapshot();
    } catch {
      flashNotice('err', 'Network error.');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!session) return;
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (!res.ok) {
      flashNotice('err', 'Could not delete product.');
      return;
    }
    flashNotice('ok', `Deleted ${name}.`);
    await loadSnapshot();
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        ...catForm,
        display_order: Number(catForm.display_order) || 1,
        slug: catForm.slug || slugify(catForm.name || ''),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      flashNotice('err', data.error || 'Failed to save category.');
      return;
    }
    flashNotice('ok', `Saved category: ${data.category.name}`);
    setCatForm({
      name: '',
      slug: '',
      description: '',
      image_url: '/images/categories/shirts.svg',
      display_order: (snapshot?.categories.length || 0) + 1,
      is_published: true,
    });
    await loadSnapshot();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!session) return;
    const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (res.ok) {
      flashNotice('ok', 'Category deleted.');
      await loadSnapshot();
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const res = await fetch('/api/admin/homepage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        ...bannerForm,
        type: 'banner',
        display_order: Number(bannerForm.display_order) || 1,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      flashNotice('err', data.error || 'Failed to save banner.');
      return;
    }
    flashNotice('ok', `Saved banner: ${data.banner.title}`);
    setBannerForm({
      title: '',
      subtitle: '',
      description: '',
      image_url: '/images/banners/hero-autumn-winter.svg',
      cta_label: 'Explore Collection',
      cta_href: '/shop',
      placement: 'hero',
      display_order: 1,
      is_active: true,
    });
    await loadSnapshot();
  };

  const handleDeleteBanner = async (id: string) => {
    if (!session) return;
    const res = await fetch(`/api/admin/homepage?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (res.ok) {
      flashNotice('ok', 'Banner removed.');
      await loadSnapshot();
    }
  };

  const moveSection = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= sectionsDraft.length) return;
    const copy = [...sectionsDraft];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    setSectionsDraft(copy.map((s, idx) => ({ ...s, display_order: idx + 1 })));
  };

  const handleSaveSections = async () => {
    if (!session) return;
    const res = await fetch('/api/admin/homepage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ type: 'sections', sections: sectionsDraft }),
    });
    if (!res.ok) {
      flashNotice('err', 'Failed to update homepage sections.');
      return;
    }
    flashNotice('ok', 'Homepage layout & visibility saved.');
    await loadSnapshot();
  };

  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const res = await fetch('/api/admin/promotions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        ...promoForm,
        promo_code: promoForm.promo_code?.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      flashNotice('err', data.error || 'Failed to save promotion.');
      return;
    }
    flashNotice('ok', `Saved promotion: ${data.promotion.title}`);
    setPromoForm({
      title: '',
      description: '',
      discount_text: '',
      promo_code: '',
      banner_image_url: '/images/banners/promo-tailoring.svg',
      cta_href: '/shop',
      start_date: '2026-11-01',
      end_date: '2027-01-31',
      is_active: true,
    });
    await loadSnapshot();
  };

  const handleDeletePromotion = async (id: string) => {
    if (!session) return;
    const res = await fetch(`/api/admin/promotions?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (res.ok) {
      flashNotice('ok', 'Promotion deleted.');
      await loadSnapshot();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !settingsDraft) return;
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        ...settingsDraft,
        delivery_charge_dhaka: Number(settingsDraft.delivery_charge_dhaka) || 0,
        delivery_charge_outside: Number(settingsDraft.delivery_charge_outside) || 0,
        free_delivery_threshold: Number(settingsDraft.free_delivery_threshold) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      flashNotice('err', data.error || 'Failed to save settings.');
      return;
    }
    flashNotice('ok', 'Store settings updated across storefront.');
    await loadSnapshot();
  };

  if (!session) {
    return <AdminAuthGate onAuthenticated={setSession} />;
  }

  const totalProducts = snapshot?.products.length || 0;
  const publishedProducts = snapshot?.products.filter((p) => p.is_published).length || 0;
  const draftProducts = totalProducts - publishedProducts;
  const totalCategories = snapshot?.categories.length || 0;

  const filteredProducts = (snapshot?.products || []).filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  const navItems: { key: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'products', label: 'Products & Variants', icon: Package },
    { key: 'categories', label: 'Categories', icon: FolderTree },
    { key: 'homepage', label: 'Homepage Manager', icon: LayoutTemplate },
    { key: 'brand_experience', label: 'Brand Experience', icon: Sparkles },
    { key: 'offers', label: 'Offers & Combos', icon: Tag },
    { key: 'promotions', label: 'Campaigns', icon: Megaphone },
    { key: 'membership', label: 'Membership', icon: Award },
    { key: 'settings', label: 'Store Settings', icon: SettingsIcon },
    { key: 'assistant', label: 'AI & Knowledge Base', icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-[#173D32] text-[#F5F0E7] shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-[#F5F0E7]/15">
            <p className="font-serif text-xl font-bold tracking-[0.06em] text-[#FAF9F6]">
              GIRIDHAR ADMIN
            </p>
            <p className="text-[11px] text-[#B99A61] mt-1 truncate">{session.email}</p>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto" aria-label="Admin Sidebar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium tracking-wide whitespace-nowrap transition-colors text-left ${
                    active
                      ? 'bg-[#B99A61] text-[#173D32] font-semibold'
                      : 'text-[#F5F0E7]/80 hover:bg-[#102B23] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#F5F0E7]/15 space-y-2 hidden lg:block">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs text-[#F5F0E7]/85 hover:bg-[#102B23]"
          >
            <span>View Live Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#F5F0E7]/80 hover:bg-[#102B23] text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 sm:p-8 lg:p-10 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-[#E4DDD0]">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B99A61]">
              {session.mode === 'supabase' ? 'Supabase Production Mode' : 'Local Preview Storage Mode'}
            </p>
            <h1 className="font-serif text-3xl font-semibold text-[#242424] capitalize">
              {navItems.find((n) => n.key === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="lg:hidden px-3 py-2 border border-[#D8CFC0] text-xs font-medium"
            >
              Storefront
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden px-3 py-2 border border-[#D8CFC0] text-xs font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={`mb-6 p-3.5 border text-xs font-medium flex items-center gap-2 ${
              notice.type === 'ok'
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{notice.text}</span>
          </div>
        )}

        {loading && !snapshot ? (
          <p className="text-sm text-[#5A5853]">Loading store records...</p>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && snapshot && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Products', value: totalProducts },
                    { label: 'Published Products', value: publishedProducts },
                    { label: 'Draft Products', value: draftProducts },
                    { label: 'Categories', value: totalCategories },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white border border-[#E4DDD0] p-5">
                      <p className="text-xs font-medium uppercase tracking-wider text-[#5A5853]">
                        {stat.label}
                      </p>
                      <p className="font-serif text-4xl font-semibold text-[#173D32] mt-2 tabular-nums">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-[#E4DDD0] p-6">
                    <h2 className="font-serif text-xl font-semibold text-[#242424] mb-4">
                      Recent Activity
                    </h2>
                    <ul className="divide-y divide-[#E4DDD0] text-xs">
                      {snapshot.activity.slice(0, 8).map((act) => (
                        <li key={act.id} className="py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#242424]">{act.action}</p>
                            <p className="text-[#5A5853]">{act.entity_name}</p>
                          </div>
                          <span className="text-[#7A756D] tabular-nums shrink-0">
                            {act.created_at.slice(0, 10)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E4DDD0] p-6">
                    <h2 className="font-serif text-xl font-semibold text-[#242424] mb-4">
                      Recent WhatsApp Order Inquiries
                    </h2>
                    {snapshot.orders.length === 0 ? (
                      <p className="text-xs text-[#5A5853]">
                        No WhatsApp checkout inquiries recorded yet. Customer orders prepared via checkout appear here.
                      </p>
                    ) : (
                      <ul className="divide-y divide-[#E4DDD0] text-xs">
                        {snapshot.orders.slice(0, 8).map((ord) => (
                          <li key={ord.id} className="py-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#242424]">
                                {ord.reference_code} · {ord.customer_name}
                              </p>
                              <p className="text-[#5A5853]">
                                {ord.customer_phone} · {ord.items.length} item(s)
                                {ord.membership_code ? ` · VIP ${ord.membership_code}` : ''}
                              </p>
                            </div>
                            <span className="font-semibold text-[#173D32] tabular-nums">
                              {formatPrice(ord.total_amount, snapshot.settings.currency_symbol)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && snapshot && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products by name or slug..."
                    className="w-full sm:w-80 bg-white border border-[#D8CFC0] px-3.5 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider hover:bg-[#102B23]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                </div>

                <div className="bg-white border border-[#E4DDD0] overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F5F0E7] text-[#5A5853] uppercase text-[11px]">
                      <tr>
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-left">Price</th>
                        <th className="p-3 text-left">Variants</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4DDD0]">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF9F6]">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.images[0]?.url || ''}
                                alt=""
                                className="w-10 h-12 object-cover bg-[#F5F0E7] border border-[#E4DDD0] shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-[#242424]">{p.name}</p>
                                <p className="text-[11px] text-[#5A5853]">
                                  {[
                                    p.is_new_arrival && 'New Arrival',
                                    p.is_best_seller && 'Best Seller',
                                    p.is_featured && 'Featured',
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || 'Standard'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-[#5A5853]">{p.category?.name || '—'}</td>
                          <td className="p-3 font-semibold text-[#173D32] tabular-nums">
                            {formatPrice(p.price, snapshot.settings.currency_symbol)}
                          </td>
                          <td className="p-3 tabular-nums text-[#5A5853]">{p.variants.length} SKUs</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => toggleProductPublish(p)}
                              className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border ${
                                p.is_published
                                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                                  : 'bg-[#F5F0E7] border-[#D8CFC0] text-[#5A5853]'
                              }`}
                            >
                              {p.is_published ? 'Published' : 'Draft'}
                            </button>
                          </td>
                          <td className="p-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(p)}
                              className="px-3 py-1.5 border border-[#D8CFC0] hover:border-[#173D32] font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="px-2.5 py-1.5 border border-[#FECACA] text-[#991B1B] hover:bg-[#FEF2F2]"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editingProduct !== undefined && (
                  <AdminProductEditor
                    initialProduct={editingProduct}
                    categories={snapshot.categories}
                    token={session.token}
                    onClose={() => setEditingProduct(undefined)}
                    onSaved={loadSnapshot}
                  />
                )}
              </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === 'categories' && snapshot && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <form onSubmit={handleSaveCategory} className="lg:col-span-5 bg-white border border-[#E4DDD0] p-6 space-y-4">
                  <h2 className="font-serif text-xl font-semibold text-[#242424]">
                    {catForm.id ? 'Edit Category' : 'Add Category'}
                  </h2>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={catForm.name || ''}
                      onChange={(e) =>
                        setCatForm((p) => ({
                          ...p,
                          name: e.target.value,
                          slug: p.id ? p.slug : slugify(e.target.value),
                        }))
                      }
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Slug *</label>
                    <input
                      type="text"
                      required
                      value={catForm.slug || ''}
                      onChange={(e) => setCatForm((p) => ({ ...p, slug: e.target.value }))}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={catForm.description || ''}
                      onChange={(e) => setCatForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold uppercase">Category Image</label>
                      <label className="text-xs font-semibold text-[#173D32] cursor-pointer hover:underline inline-flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Upload
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const url = await uploadAdminImage(f);
                            if (url) setCatForm((p) => ({ ...p, image_url: url }));
                          }}
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={catForm.image_url || ''}
                      onChange={(e) => setCatForm((p) => ({ ...p, image_url: e.target.value }))}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">Display Order</label>
                      <input
                        type="number"
                        value={catForm.display_order ?? 1}
                        onChange={(e) => setCatForm((p) => ({ ...p, display_order: Number(e.target.value) }))}
                        className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium pt-5">
                      <input
                        type="checkbox"
                        checked={catForm.is_published ?? true}
                        onChange={(e) => setCatForm((p) => ({ ...p, is_published: e.target.checked }))}
                      />
                      <span>Published</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider"
                    >
                      {catForm.id ? 'Update Category' : 'Create Category'}
                    </button>
                    {catForm.id && (
                      <button
                        type="button"
                        onClick={() =>
                          setCatForm({
                            name: '',
                            slug: '',
                            description: '',
                            image_url: '/images/categories/shirts.svg',
                            display_order: 1,
                            is_published: true,
                          })
                        }
                        className="px-4 py-2.5 border border-[#D8CFC0] text-xs"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </form>

                <div className="lg:col-span-7 bg-white border border-[#E4DDD0] divide-y divide-[#E4DDD0]">
                  {snapshot.categories.map((cat) => (
                    <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={cat.image_url} alt="" className="w-14 h-11 object-cover bg-[#F5F0E7] border border-[#E4DDD0]" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#242424] truncate">
                            #{cat.display_order} · {cat.name}
                          </p>
                          <p className="text-xs text-[#5A5853] truncate">
                            /{cat.slug} · {cat.is_published ? 'Published' : 'Hidden'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCatForm(cat)}
                          className="px-3 py-1.5 border border-[#D8CFC0] text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-[#991B1B] border border-[#FECACA]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HOMEPAGE MANAGER TAB */}
            {activeTab === 'homepage' && snapshot && (
              <div className="space-y-10">
                {/* Section Order & Visibility */}
                <div className="bg-white border border-[#E4DDD0] p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-serif text-2xl font-semibold text-[#242424]">
                        Homepage Section Order & Visibility
                      </h2>
                      <p className="text-xs text-[#5A5853]">
                        Toggle sections on/off or reorder how they appear on the customer homepage.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveSections}
                      className="px-5 py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider"
                    >
                      Save Layout Order
                    </button>
                  </div>

                  <div className="divide-y divide-[#E4DDD0] border-t border-[#E4DDD0]">
                    {sectionsDraft.map((sec, idx) => (
                      <div key={sec.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                          <input
                            type="checkbox"
                            checked={sec.is_visible}
                            onChange={(e) =>
                              setSectionsDraft((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, is_visible: e.target.checked } : s))
                              )
                            }
                          />
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) =>
                                setSectionsDraft((prev) =>
                                  prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s))
                                )
                              }
                              className="border border-[#D8CFC0] px-2.5 py-1.5 text-xs font-semibold"
                            />
                            <input
                              type="text"
                              value={sec.subtitle}
                              onChange={(e) =>
                                setSectionsDraft((prev) =>
                                  prev.map((s, i) => (i === idx ? { ...s, subtitle: e.target.value } : s))
                                )
                              }
                              className="border border-[#D8CFC0] px-2.5 py-1.5 text-xs text-[#5A5853]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSection(idx, -1)}
                            disabled={idx === 0}
                            className="p-1.5 border border-[#D8CFC0] disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSection(idx, 1)}
                            disabled={idx === sectionsDraft.length - 1}
                            className="p-1.5 border border-[#D8CFC0] disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Banners CRUD */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <form onSubmit={handleSaveBanner} className="lg:col-span-5 bg-white border border-[#E4DDD0] p-6 space-y-4">
                    <h2 className="font-serif text-xl font-semibold text-[#242424]">
                      {bannerForm.id ? 'Edit Campaign Banner' : 'Add Hero / Promo Banner'}
                    </h2>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">Placement</label>
                      <select
                        value={bannerForm.placement || 'hero'}
                        onChange={(e) =>
                          setBannerForm((p) => ({ ...p, placement: e.target.value as 'hero' | 'promotional' }))
                        }
                        className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                      >
                        <option value="hero">Main Hero</option>
                        <option value="promotional">Promotional Banner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">Headline *</label>
                      <input
                        type="text"
                        required
                        value={bannerForm.title || ''}
                        onChange={(e) => setBannerForm((p) => ({ ...p, title: e.target.value }))}
                        className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">Subtitle / Kicker</label>
                      <input
                        type="text"
                        value={bannerForm.subtitle || ''}
                        onChange={(e) => setBannerForm((p) => ({ ...p, subtitle: e.target.value }))}
                        className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={bannerForm.description || ''}
                        onChange={(e) => setBannerForm((p) => ({ ...p, description: e.target.value }))}
                        className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1">Button Label</label>
                        <input
                          type="text"
                          value={bannerForm.cta_label || ''}
                          onChange={(e) => setBannerForm((p) => ({ ...p, cta_label: e.target.value }))}
                          className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1">Button Link</label>
                        <input
                          type="text"
                          value={bannerForm.cta_href || ''}
                          onChange={(e) => setBannerForm((p) => ({ ...p, cta_href: e.target.value }))}
                          className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold uppercase">Banner Image</label>
                        <label className="text-xs font-semibold text-[#173D32] cursor-pointer hover:underline inline-flex items-center gap-1">
                          <Upload className="w-3 h-3" /> Upload
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const url = await uploadAdminImage(f);
                              if (url) setBannerForm((p) => ({ ...p, image_url: url }));
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        required
                        value={bannerForm.image_url || ''}
                        onChange={(e) => setBannerForm((p) => ({ ...p, image_url: e.target.value }))}
                        className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={bannerForm.is_active ?? true}
                        onChange={(e) => setBannerForm((p) => ({ ...p, is_active: e.target.checked }))}
                      />
                      <span>Active on Homepage</span>
                    </label>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider"
                    >
                      {bannerForm.id ? 'Update Banner' : 'Save Banner'}
                    </button>
                  </form>

                  <div className="lg:col-span-7 bg-white border border-[#E4DDD0] divide-y divide-[#E4DDD0]">
                    {snapshot.banners.map((b) => (
                      <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={b.image_url} alt="" className="w-20 h-12 object-cover bg-[#173D32] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#242424] truncate">{b.title}</p>
                            <p className="text-xs text-[#5A5853] uppercase">
                              {b.placement} · {b.is_active ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setBannerForm(b)}
                            className="px-3 py-1.5 border border-[#D8CFC0] text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(b.id)}
                            className="p-1.5 text-[#991B1B] border border-[#FECACA]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PROMOTIONS TAB */}
            {activeTab === 'promotions' && snapshot && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <form onSubmit={handleSavePromotion} className="lg:col-span-5 bg-white border border-[#E4DDD0] p-6 space-y-4">
                  <h2 className="font-serif text-xl font-semibold text-[#242424]">
                    {promoForm.id ? 'Edit Campaign' : 'Create Promotion Campaign'}
                  </h2>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Offer Title *</label>
                    <input
                      type="text"
                      required
                      value={promoForm.title || ''}
                      onChange={(e) => setPromoForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Discount Info *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 15% Off Knitwear Capsule"
                      value={promoForm.discount_text || ''}
                      onChange={(e) => setPromoForm((p) => ({ ...p, discount_text: e.target.value }))}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={promoForm.description || ''}
                      onChange={(e) => setPromoForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={promoForm.start_date || ''}
                        onChange={(e) => setPromoForm((p) => ({ ...p, start_date: e.target.value }))}
                        className="w-full border border-[#D8CFC0] px-2.5 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">End Date *</label>
                      <input
                        type="date"
                        required
                        value={promoForm.end_date || ''}
                        onChange={(e) => setPromoForm((p) => ({ ...p, end_date: e.target.value }))}
                        className="w-full border border-[#D8CFC0] px-2.5 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Optional Promo Code</label>
                    <input
                      type="text"
                      value={promoForm.promo_code || ''}
                      onChange={(e) => setPromoForm((p) => ({ ...p, promo_code: e.target.value }))}
                      placeholder="Leave empty if none"
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={promoForm.is_active ?? true}
                      onChange={(e) => setPromoForm((p) => ({ ...p, is_active: e.target.checked }))}
                    />
                    <span>Campaign Active</span>
                  </label>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider"
                  >
                    {promoForm.id ? 'Update Campaign' : 'Publish Campaign'}
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white border border-[#E4DDD0] divide-y divide-[#E4DDD0]">
                  {snapshot.promotions.length === 0 ? (
                    <p className="p-6 text-xs text-[#5A5853]">No promotional campaigns created yet.</p>
                  ) : (
                    snapshot.promotions.map((pr) => (
                      <div key={pr.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#242424]">{pr.title}</p>
                          <p className="text-xs text-[#173D32] font-medium">{pr.discount_text}</p>
                          <p className="text-[11px] text-[#5A5853] mt-1 tabular-nums">
                            {pr.start_date} to {pr.end_date} · {pr.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPromoForm(pr)}
                            className="px-3 py-1.5 border border-[#D8CFC0] text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePromotion(pr.id)}
                            className="p-1.5 text-[#991B1B] border border-[#FECACA]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && settingsDraft && (
              <form onSubmit={handleSaveSettings} className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-6 max-w-4xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Brand Name *</label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.brand_name}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, brand_name: e.target.value })}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Tagline</label>
                    <input
                      type="text"
                      value={settingsDraft.tagline}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, tagline: e.target.value })}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">
                      WhatsApp Business Number (with country code) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.whatsapp_number}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, whatsapp_number: e.target.value })}
                      placeholder="e.g. 8801711000000"
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Store Email *</label>
                    <input
                      type="email"
                      required
                      value={settingsDraft.store_email}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, store_email: e.target.value })}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-[#E4DDD0] pt-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase">Announcement Bar</label>
                    <label className="inline-flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={settingsDraft.announcement_active}
                        onChange={(e) =>
                          setSettingsDraft({ ...settingsDraft, announcement_active: e.target.checked })
                        }
                      />
                      <span>Visible</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settingsDraft.announcement_text}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, announcement_text: e.target.value })}
                    className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#E4DDD0] pt-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Dhaka Delivery (৳)</label>
                    <input
                      type="number"
                      value={settingsDraft.delivery_charge_dhaka}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, delivery_charge_dhaka: Number(e.target.value) })
                      }
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Outside Dhaka (৳)</label>
                    <input
                      type="number"
                      value={settingsDraft.delivery_charge_outside}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, delivery_charge_outside: Number(e.target.value) })
                      }
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Free Delivery Threshold (৳)</label>
                    <input
                      type="number"
                      value={settingsDraft.free_delivery_threshold}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, free_delivery_threshold: Number(e.target.value) })
                      }
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Delivery Information Summary</label>
                  <textarea
                    rows={2}
                    value={settingsDraft.delivery_info}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, delivery_info: e.target.value })}
                    className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#E4DDD0] pt-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Instagram URL</label>
                    <input
                      type="url"
                      value={settingsDraft.instagram_url}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, instagram_url: e.target.value })}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Facebook URL</label>
                    <input
                      type="url"
                      value={settingsDraft.facebook_url}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, facebook_url: e.target.value })}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t border-[#E4DDD0] pt-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Brand Story Headline</label>
                    <input
                      type="text"
                      value={settingsDraft.story_title}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, story_title: e.target.value })}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1">Brand Story Body</label>
                    <textarea
                      rows={3}
                      value={settingsDraft.story_body}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, story_body: e.target.value })}
                      className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-8 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider hover:bg-[#102B23]"
                >
                  Save Store Settings
                </button>
              </form>
            )}

            {/* OFFERS & COMBO BUILDER TAB */}
            {activeTab === 'offers' && snapshot && (
              <AdminOffersManager
                offers={snapshot.offers || []}
                products={snapshot.products}
                categories={snapshot.categories}
                currencySymbol={snapshot.settings.currency_symbol}
                token={session.token}
                onUploadImage={uploadAdminImage}
                onRefresh={loadSnapshot}
                onNotice={flashNotice}
              />
            )}

            {/* PREMIUM MEMBERSHIP TAB */}
            {activeTab === 'membership' && snapshot && (
              <AdminMembershipManager
                key={snapshot.membership.updated_at}
                membership={snapshot.membership}
                currencySymbol={snapshot.settings.currency_symbol}
                brandName={snapshot.settings.brand_name}
                token={session.token}
                onRefresh={loadSnapshot}
                onNotice={flashNotice}
              />
            )}

            {/* BRAND EXPERIENCE MANAGEMENT TAB */}
            {activeTab === 'brand_experience' && snapshot && (
              <AdminBrandExperienceManager
                features={snapshot.brand_experience_features || []}
                styleGuides={snapshot.style_guides || []}
                surpriseBoxes={snapshot.surprise_boxes || []}
                products={snapshot.products}
                categories={snapshot.categories}
                sections={snapshot.sections}
                currencySymbol={snapshot.settings.currency_symbol}
                token={session.token}
                onUploadImage={uploadAdminImage}
                onRefresh={loadSnapshot}
                onNotice={flashNotice}
              />
            )}

            {/* UNIFIED AI CONTROL PANEL & RAG KNOWLEDGE BASE TAB */}
            {activeTab === 'assistant' && snapshot && snapshot.ai_settings && (
              <AdminUnifiedAIPanel
                key={snapshot.ai_settings.updated_at || 'ai-panel'}
                aiSettings={snapshot.ai_settings}
                aiUsage={snapshot.ai_usage}
                aiProviders={snapshot.ai_providers || []}
                knowledgeDocuments={snapshot.knowledge_documents || []}
                token={session.token}
                onRefresh={loadSnapshot}
                onNotice={flashNotice}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
