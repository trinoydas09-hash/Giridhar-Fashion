'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { slugify } from '@/lib/utils/format';
import { Category, Product, ProductImage, ProductSpecification, ProductVariant, StockStatus } from '@/types/store';

interface AdminProductEditorProps {
  initialProduct: Product | null;
  categories: Category[];
  token: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function AdminProductEditor({
  initialProduct,
  categories,
  token,
  onClose,
  onSaved,
}: AdminProductEditorProps) {
  const [name, setName] = useState(initialProduct?.name || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [shortDescription, setShortDescription] = useState(initialProduct?.short_description || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [price, setPrice] = useState(String(initialProduct?.price || 1990));
  const [compareAtPrice, setCompareAtPrice] = useState(
    initialProduct?.compare_at_price ? String(initialProduct.compare_at_price) : ''
  );
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || categories[0]?.id || '');
  const [isPublished, setIsPublished] = useState(initialProduct?.is_published ?? true);
  const [isFeatured, setIsFeatured] = useState(initialProduct?.is_featured ?? false);
  const [isBestSeller, setIsBestSeller] = useState(initialProduct?.is_best_seller ?? false);
  const [isNewArrival, setIsNewArrival] = useState(initialProduct?.is_new_arrival ?? true);

  const [specs, setSpecs] = useState<ProductSpecification[]>(
    initialProduct?.specifications.length
      ? initialProduct.specifications
      : [{ label: 'Fabric', value: '100% Combed Cotton' }]
  );

  const [images, setImages] = useState<ProductImage[]>(
    initialProduct?.images.length
      ? initialProduct.images
      : [
          {
            id: 'img-new-1',
            product_id: initialProduct?.id || '',
            url: '/images/products/shirt-forest.svg',
            alt_text: '',
            display_order: 1,
            is_primary: true,
          },
        ]
  );

  const [variants, setVariants] = useState<ProductVariant[]>(
    initialProduct?.variants.length
      ? initialProduct.variants
      : [
          {
            id: 'var-new-1',
            product_id: initialProduct?.id || '',
            colour: 'Forest Green',
            colour_hex: '#173D32',
            size: 'M',
            sku: 'GF-NEW-M',
            stock_status: 'in_stock',
            stock_quantity: 10,
            created_at: new Date().toISOString(),
          },
        ]
  );

  // Quick Variant Batch Adder
  const [batchColour, setBatchColour] = useState('Black');
  const [batchHex, setBatchHex] = useState('#1D1D1D');
  const [batchSizes, setBatchSizes] = useState('S, M, L, XL');
  const [batchQty, setBatchQty] = useState('10');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveImage = (from: number, to: number) => {
    setImages((current) => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((image, index) => ({
        ...image,
        display_order: index + 1,
        is_primary: index === 0,
      }));
    });
  };

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isInteger(sourceIndex)) moveImage(sourceIndex, targetIndex);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || 'Image upload failed.');
        return;
      }
      setImages((prev) => [
        ...prev,
        {
          id: `img-${Date.now()}`,
          product_id: initialProduct?.id || '',
          url: data.url,
          alt_text: name || 'Product photo',
          colour: variants[0]?.colour || null,
          display_order: prev.length + 1,
          is_primary: prev.length === 0,
        },
      ]);
    } catch {
      setError('Upload failed. Ensure file is PNG/JPEG/WebP under 4MB.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddVariantBatch = () => {
    const sizeTokens = batchSizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!batchColour.trim() || sizeTokens.length === 0) return;

    const qty = Math.max(0, Number(batchQty) || 0);
    const prefix = slugify(name || 'gf').slice(0, 6).toUpperCase() || 'GF';
    const colCode = batchColour.trim().slice(0, 3).toUpperCase();

    const additions: ProductVariant[] = [];
    for (const size of sizeTokens) {
      const exists = variants.some(
        (v) => v.colour.toLowerCase() === batchColour.trim().toLowerCase() && v.size.toLowerCase() === size.toLowerCase()
      );
      if (!exists) {
        additions.push({
          id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          product_id: initialProduct?.id || '',
          colour: batchColour.trim(),
          colour_hex: batchHex,
          size,
          sku: `${prefix}-${colCode}-${size.toUpperCase()}`,
          stock_status: qty === 0 ? 'out_of_stock' : qty <= 3 ? 'low_stock' : 'in_stock',
          stock_quantity: qty,
          created_at: new Date().toISOString(),
        });
      }
    }
    setVariants((prev) => [...prev, ...additions]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload = {
        id: initialProduct?.id,
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        short_description: shortDescription.trim(),
        description: description.trim(),
        price: Number(price),
        compare_at_price: compareAtPrice.trim() ? Number(compareAtPrice) : null,
        category_id: categoryId,
        is_published: isPublished,
        is_featured: isFeatured,
        is_best_seller: isBestSeller,
        is_new_arrival: isNewArrival,
        specifications: specs.filter((s) => s.label.trim() && s.value.trim()),
        images: images.filter((i) => i.url.trim()),
        variants,
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save product.');
        return;
      }
      await onSaved();
      onClose();
    } catch {
      setError('Network error while saving product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173D32]/40 p-4 overflow-y-auto">
      <div className="bg-[#FAF9F6] border border-[#D8CFC0] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-[#FAF9F6] border-b border-[#E4DDD0] px-6 py-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[#242424]">
            {initialProduct ? `Edit: ${initialProduct.name}` : 'Create New Product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="p-2 text-[#5A5853] hover:text-[#242424]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]">
              {error}
            </div>
          )}

          {/* Core Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#242424] mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!initialProduct) setSlug(slugify(e.target.value));
                }}
                className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#242424] mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#242424] mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#242424] mb-1">
                  Price (৳ BDT) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#242424] mb-1">
                  Original Price
                </label>
                <input
                  type="number"
                  min={1}
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-5 p-4 bg-[#F5F0E7] border border-[#E4DDD0] text-xs font-medium">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              <span>Published on Storefront</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isNewArrival} onChange={(e) => setIsNewArrival(e.target.checked)} />
              <span>New Arrival</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} />
              <span>Best Seller</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <span>Featured Collection</span>
            </label>
          </div>

          {/* Descriptions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#242424] mb-1">
                Short Summary
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#242424] mb-1">
                Full Garment Description *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Images */}
          <div className="space-y-3 border-t border-[#E4DDD0] pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[#242424]">Product Images</h3>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#102B23]">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            <div className="space-y-2">
              {images.map((img, idx) => (
                <div
                  key={img.id || idx}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', String(idx))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleImageDrop(event, idx)}
                  className="flex flex-wrap items-center gap-3 bg-white border border-[#E4DDD0] p-2.5 cursor-grab"
                >
                  <img src={img.url} alt="" className="w-12 h-14 object-cover bg-[#F5F0E7] shrink-0" />
                  <span className="text-[10px] font-semibold text-[#173D32] w-6">#{idx + 1}</span>
                  <select
                    aria-label="Image colour"
                    value={img.colour || ''}
                    onChange={(e) => setImages((prev) => prev.map((item, i) => i === idx ? { ...item, colour: e.target.value || null } : item))}
                    className="border border-[#D8CFC0] px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="">All colours / default</option>
                    {[...new Set(variants.map((variant) => variant.colour).filter(Boolean))].map((colour) => (
                      <option key={colour} value={colour}>{colour}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => moveImage(idx, idx - 1)} disabled={idx === 0} aria-label="Move image up" className="px-2 py-1 border border-[#D8CFC0] text-xs disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => moveImage(idx, idx + 1)} disabled={idx === images.length - 1} aria-label="Move image down" className="px-2 py-1 border border-[#D8CFC0] text-xs disabled:opacity-30">↓</button>
                  <input
                    type="text"
                    value={img.url}
                    onChange={(e) =>
                      setImages((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, url: e.target.value } : item))
                      )
                    }
                    placeholder="Image URL"
                    className="flex-1 border border-[#D8CFC0] px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={images.length <= 1}
                    className="p-1.5 text-[#7A756D] hover:text-[#991B1B] disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setImages((prev) => [
                    ...prev,
                    {
                      id: `img-${Date.now()}`,
                      product_id: initialProduct?.id || '',
                      url: '',
                      alt_text: name,
                      colour: null,
                      display_order: prev.length + 1,
                      is_primary: false,
                    },
                  ])
                }
                className="text-xs font-semibold text-[#173D32] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Image URL Row
              </button>
            </div>
          </div>

          {/* Variants Matrix */}
          <div className="space-y-4 border-t border-[#E4DDD0] pt-5">
            <h3 className="font-serif text-lg font-semibold text-[#242424]">
              Variants (Colours, Sizes, SKU & Stock)
            </h3>

            {/* Quick Batch Generator */}
            <div className="bg-[#F5F0E7] border border-[#E4DDD0] p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#5A5853] mb-1">Colour</label>
                <input
                  type="text"
                  value={batchColour}
                  onChange={(e) => setBatchColour(e.target.value)}
                  className="w-full bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#5A5853] mb-1">Swatch</label>
                <input
                  type="color"
                  value={batchHex}
                  onChange={(e) => setBatchHex(e.target.value)}
                  className="w-full h-8 bg-white border border-[#D8CFC0] px-1 py-0.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#5A5853] mb-1">Sizes (comma)</label>
                <input
                  type="text"
                  value={batchSizes}
                  onChange={(e) => setBatchSizes(e.target.value)}
                  className="w-full bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#5A5853] mb-1">Stock Qty</label>
                <input
                  type="number"
                  min={0}
                  value={batchQty}
                  onChange={(e) => setBatchQty(e.target.value)}
                  className="w-full bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs tabular-nums"
                />
              </div>
              <button
                type="button"
                onClick={handleAddVariantBatch}
                className="py-2 px-3 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider hover:bg-[#102B23]"
              >
                Add Colour Sizes
              </button>
            </div>

            <div className="overflow-x-auto border border-[#E4DDD0] bg-white">
              <table className="w-full text-xs">
                <thead className="bg-[#F5F0E7] text-[#5A5853] uppercase text-[11px]">
                  <tr>
                    <th className="p-2.5 text-left">Colour</th>
                    <th className="p-2.5 text-left">Hex</th>
                    <th className="p-2.5 text-left">Size</th>
                    <th className="p-2.5 text-left">SKU</th>
                    <th className="p-2.5 text-left">Status</th>
                    <th className="p-2.5 text-left">Qty</th>
                    <th className="p-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DDD0]">
                  {variants.map((v, idx) => (
                    <tr key={v.id || idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={v.colour}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, colour: e.target.value } : item))
                            )
                          }
                          className="w-28 border border-[#D8CFC0] px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="color"
                          value={v.colour_hex}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, colour_hex: e.target.value } : item))
                            )
                          }
                          className="w-8 h-7 border border-[#D8CFC0]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, size: e.target.value } : item))
                            )
                          }
                          className="w-16 border border-[#D8CFC0] px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, sku: e.target.value } : item))
                            )
                          }
                          className="w-32 border border-[#D8CFC0] px-2 py-1 font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={v.stock_status}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, stock_status: e.target.value as StockStatus } : item
                              )
                            )
                          }
                          className="border border-[#D8CFC0] px-2 py-1"
                        >
                          <option value="in_stock">In Stock</option>
                          <option value="low_stock">Low Stock</option>
                          <option value="out_of_stock">Out of Stock</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={v.stock_quantity}
                          onChange={(e) => {
                            const qty = Math.max(0, Number(e.target.value) || 0);
                            setVariants((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      stock_quantity: qty,
                                      stock_status: qty === 0 ? 'out_of_stock' : qty <= 3 ? 'low_stock' : 'in_stock',
                                    }
                                  : item
                              )
                            );
                          }}
                          className="w-16 border border-[#D8CFC0] px-2 py-1 tabular-nums"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={variants.length <= 1}
                          className="text-[#7A756D] hover:text-[#991B1B] disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-3 border-t border-[#E4DDD0] pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[#242424]">Specifications</h3>
              <button
                type="button"
                onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])}
                className="text-xs font-semibold text-[#173D32] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Spec
              </button>
            </div>
            <div className="space-y-2">
              {specs.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={s.label}
                    onChange={(e) =>
                      setSpecs((prev) => prev.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))
                    }
                    placeholder="Label (e.g. Fabric)"
                    className="col-span-4 bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={s.value}
                    onChange={(e) =>
                      setSpecs((prev) => prev.map((it, i) => (i === idx ? { ...it, value: e.target.value } : it)))
                    }
                    placeholder="Value"
                    className="col-span-7 bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setSpecs((prev) => prev.filter((_, i) => i !== idx))}
                    className="col-span-1 flex items-center justify-center text-[#7A756D] hover:text-[#991B1B]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="sticky bottom-0 bg-[#FAF9F6] border-t border-[#E4DDD0] pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-[#D8CFC0] text-xs font-semibold uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-7 py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
