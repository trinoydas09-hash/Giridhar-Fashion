'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle,
  Check,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Minimize2,
  Send,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { useCart } from '@/components/providers/CartProvider';
import { formatPrice } from '@/lib/utils/format';
import { sanitizeWhatsAppNumber } from '@/lib/whatsapp/checkout';
import { Product } from '@/types/store';
import { SafeImage } from './SafeImage';

interface PublicAIConfig {
  is_enabled: boolean;
  availability_status: 'online' | 'away' | 'offline';
  assistant_name: string;
  welcome_message: string;
  whatsapp_support_number: string;
  brand_name: string;
  currency_symbol: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  products?: Product[];
  showWhatsAppSupport?: boolean;
}

let messageSequence = 0;
function nextMessageId(prefix: 'u' | 'm'): string {
  messageSequence += 1;
  return `${prefix}-${messageSequence}`;
}

function ChatProductCard({
  product,
  currencySymbol,
  onNavigate,
}: {
  product: Product;
  currencySymbol: string;
  onNavigate: () => void;
}) {
  const { addItem } = useCart();

  const inStockVariants = useMemo(
    () => product.variants.filter((v) => v.stock_status !== 'out_of_stock' && v.stock_quantity > 0),
    [product.variants]
  );

  const uniqueColours = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of product.variants) {
      if (!map.has(v.colour)) map.set(v.colour, v.colour_hex);
    }
    return Array.from(map.entries());
  }, [product.variants]);

  const [selectedColour, setSelectedColour] = useState<string>(
    inStockVariants[0]?.colour || product.variants[0]?.colour || ''
  );

  const sizesForColour = useMemo(() => {
    const list = product.variants.filter((v) => v.colour === selectedColour);
    return list.length > 0 ? list : product.variants;
  }, [product.variants, selectedColour]);

  const [selectedSize, setSelectedSize] = useState<string>(
    inStockVariants[0]?.size || product.variants[0]?.size || ''
  );
  const [added, setAdded] = useState(false);

  const activeVariant =
    product.variants.find((v) => v.colour === selectedColour && v.size === selectedSize) ||
    inStockVariants[0] ||
    product.variants[0];

  const isOutOfStock =
    !activeVariant || activeVariant.stock_status === 'out_of_stock' || activeVariant.stock_quantity <= 0;

  const handleAdd = () => {
    if (!activeVariant || isOutOfStock) return;
    addItem(product, activeVariant, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="bg-white border border-[#E4DDD0] p-3 space-y-2.5">
      <div className="flex gap-3">
        <Link
          href={`/products/${product.slug}`}
          onClick={onNavigate}
          className="w-16 h-20 shrink-0 bg-[#F5F0E7] border border-[#E4DDD0] overflow-hidden"
        >
          <SafeImage
            src={product.images[0]?.url || ''}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/products/${product.slug}`}
            onClick={onNavigate}
            className="text-xs font-semibold text-[#242424] hover:text-[#173D32] line-clamp-2 leading-snug"
          >
            {product.name}
          </Link>
          <div className="flex items-baseline gap-2 mt-1 tabular-nums">
            <span className="text-xs font-bold text-[#173D32]">
              {formatPrice(product.price, currencySymbol)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-[11px] text-[#7A756D] line-through">
                {formatPrice(product.compare_at_price, currencySymbol)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#5A5853] mt-1 truncate">
            {uniqueColours.map(([c]) => c).join(', ')}
          </p>
        </div>
      </div>

      {/* Quick Variant Pickers */}
      {product.variants.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[#F0EAE0]">
          <div className="flex flex-wrap items-center gap-1.5">
            {uniqueColours.slice(0, 5).map(([colour, hex]) => (
              <button
                key={colour}
                type="button"
                onClick={() => {
                  setSelectedColour(colour);
                  const firstMatch = product.variants.find(
                    (v) => v.colour === colour && v.stock_status !== 'out_of_stock'
                  );
                  if (firstMatch) setSelectedSize(firstMatch.size);
                }}
                title={colour}
                aria-label={`Select colour ${colour}`}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  selectedColour === colour
                    ? 'border-[#173D32] ring-2 ring-[#173D32]/30 scale-110'
                    : 'border-black/25'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
            <span className="text-[10px] text-[#5A5853] ml-1 truncate">{selectedColour}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {sizesForColour.slice(0, 5).map((v) => {
              const disabled = v.stock_status === 'out_of_stock' || v.stock_quantity <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedSize(v.size)}
                  className={`px-2 py-0.5 text-[10px] font-medium border ${
                    selectedSize === v.size
                      ? 'bg-[#173D32] text-[#FAF9F6] border-[#173D32]'
                      : 'bg-[#FAF9F6] text-[#242424] border-[#D8CFC0]'
                  } disabled:opacity-35 disabled:line-through`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <Link
          href={`/products/${product.slug}`}
          onClick={onNavigate}
          className="py-1.5 px-2 border border-[#173D32] text-[#173D32] text-[10px] font-semibold uppercase tracking-wider text-center hover:bg-[#F5F0E7]"
        >
          View Product
        </Link>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isOutOfStock}
          className="py-1.5 px-2 bg-[#173D32] text-[#FAF9F6] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-45 inline-flex items-center justify-center gap-1"
        >
          {added ? <Check className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
          <span>{isOutOfStock ? 'Sold Out' : added ? 'Added' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  );
}

export function GiridharAiWidget() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  const [config, setConfig] = useState<PublicAIConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Lightweight check only for enabled flag; full state initialized cleanly
  useEffect(() => {
    if (isAdminRoute) return;
    let active = true;
    fetch('/api/chat', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicAIConfig | null) => {
        if (!active || !data) return;
        setConfig(data);
        setMessages((prev) =>
          prev.length === 0
            ? [
                {
                  id: 'welcome',
                  role: 'model',
                  text: data.welcome_message,
                },
              ]
            : prev
        );
      })
      .catch(() => {
        // Silently degrade if config fails; widget stays unobtrusive
      })
      .finally(() => {
        if (active) setConfigLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [isAdminRoute]);

  useEffect(() => {
    if (isOpen && !isMinimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, isOpen, isMinimized]);

  if (isAdminRoute) return null;
  if (configLoaded && config && !config.is_enabled) return null;

  const latestUserQuestion =
    [...messages].reverse().find((m) => m.role === 'user')?.text || '';

  const whatsappDigits = sanitizeWhatsAppNumber(config?.whatsapp_support_number || '8801711000000');
  const whatsappText = latestUserQuestion
    ? `Hello ${config?.brand_name || 'GIRIDHAR FASHION'} Support! I was chatting with GIRIDHAR AI and need assistance with:\n\n"${latestUserQuestion}"`
    : `Hello ${config?.brand_name || 'GIRIDHAR FASHION'} Support! I would like assistance with your menswear collection.`;
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(whatsappText)}`
    : '';

  const sendMessage = async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || sending) return;

    setErrorMsg(null);
    if (!textOverride) setInput('');

    const userMsg: ChatMessage = {
      id: nextMessageId('u'),
      role: 'user',
      text: trimmed,
    };

    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'GIRIDHAR AI could not respond right now.');
        return;
      }

      const aiMsg: ChatMessage = {
        id: nextMessageId('m'),
        role: 'model',
        text: data.reply,
        products: Array.isArray(data.products) ? data.products : [],
        showWhatsAppSupport: Boolean(data.showWhatsAppSupport),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setErrorMsg('Network error while connecting to GIRIDHAR AI. Please try again or contact WhatsApp Support.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const statusText =
    config?.availability_status === 'away'
      ? 'Limited Availability'
      : config?.availability_status === 'offline'
      ? 'Offline'
      : 'Online';

  const statusColor =
    config?.availability_status === 'away'
      ? 'bg-[#B99A61]'
      : config?.availability_status === 'offline'
      ? 'bg-[#9CA3AF]'
      : 'bg-[#6EE7B7]';

  return (
    <div className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-40">
      {/* Closed Floating Trigger */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open GIRIDHAR AI Shopping Assistant"
          className="group flex items-center gap-2.5 bg-[#173D32] text-[#FAF9F6] border border-[#B99A61]/60 px-4 py-3 shadow-xl hover:bg-[#102B23] transition-colors min-h-[48px]"
        >
          <Sparkles className="w-4 h-4 text-[#B99A61]" />
          <span className="text-xs font-semibold tracking-[0.14em] uppercase whitespace-nowrap">
            {config?.assistant_name || 'GIRIDHAR AI'}
          </span>
        </button>
      )}

      {/* Open Chat Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="GIRIDHAR AI Shopping Assistant"
          className="w-[calc(100vw-2rem)] sm:w-[390px] bg-[#FAF9F6] border border-[#173D32]/30 shadow-2xl flex flex-col overflow-hidden"
          style={{ height: isMinimized ? 'auto' : 'min(610px, 78vh)' }}
        >
          {/* Header */}
          <div className="bg-[#173D32] text-[#FAF9F6] px-4 py-3.5 flex items-center justify-between gap-3 border-b border-[#B99A61]/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-[#102B23] border border-[#B99A61]/50 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#B99A61]" />
              </div>
              <div className="min-w-0">
                <p className="font-serif text-base font-semibold tracking-wide text-[#FAF9F6] truncate">
                  {config?.assistant_name || 'GIRIDHAR AI'}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#F5F0E7]/85">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} aria-hidden="true" />
                  <span>{statusText} · Shopping Concierge</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
                className="p-1.5 text-[#F5F0E7]/80 hover:text-white min-w-[34px] min-h-[34px] flex items-center justify-center"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="p-1.5 text-[#F5F0E7]/80 hover:text-white min-w-[34px] min-h-[34px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF9F6]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-[#173D32] text-[#FAF9F6]'
                          : 'bg-[#F5F0E7] text-[#242424] border border-[#E4DDD0]'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-2.5 w-full space-y-2.5">
                        {msg.products.map((prod) => (
                          <ChatProductCard
                            key={prod.id}
                            product={prod}
                            currencySymbol={config?.currency_symbol || '৳'}
                            onNavigate={() => setIsOpen(false)}
                          />
                        ))}
                      </div>
                    )}

                    {msg.showWhatsAppSupport && whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#173D32] text-[#173D32] text-[11px] font-semibold hover:bg-[#F5F0E7]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Continue on WhatsApp Support</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}

                {/* Quick Starter Prompts on first turn */}
                {messages.length <= 1 && !sending && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {[
                      'What offers & bundles are active?',
                      'Tell me about Premium Membership',
                      'Shirts under ৳2,000',
                      'আমাকে শার্ট দেখাও',
                      'Delivery & return policy',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        className="px-2.5 py-1.5 bg-white border border-[#D8CFC0] text-[11px] text-[#242424] hover:border-[#173D32] transition-colors text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {sending && (
                  <div className="flex items-start">
                    <div className="bg-[#F5F0E7] border border-[#E4DDD0] px-3.5 py-2.5 text-xs text-[#5A5853] inline-flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#173D32] animate-bounce" />
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#173D32] animate-bounce [animation-delay:150ms]" />
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#173D32] animate-bounce [animation-delay:300ms]" />
                      <span className="ml-1">Checking collection...</span>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#991B1B]/30 text-[#173D32] text-[11px] font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Contact WhatsApp Support</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Support Bar + Composer */}
              <div className="border-t border-[#E4DDD0] bg-white">
                {whatsappUrl && (
                  <div className="px-3.5 py-2 bg-[#F5F0E7]/70 border-b border-[#E4DDD0] flex items-center justify-between text-[11px]">
                    <span className="text-[#5A5853] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#173D32]" />
                      <span>Prefer a human stylist?</span>
                    </span>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#173D32] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Contact Support</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="p-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                    placeholder="Ask in English or বাংলা..."
                    maxLength={800}
                    className="flex-1 bg-[#FAF9F6] border border-[#D8CFC0] px-3 py-2 text-xs sm:text-sm text-[#242424] placeholder:text-[#7A756D] focus:outline-none focus:border-[#173D32] disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    aria-label="Send message"
                    className="p-2.5 bg-[#173D32] text-[#FAF9F6] hover:bg-[#102B23] transition-colors disabled:opacity-45 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
