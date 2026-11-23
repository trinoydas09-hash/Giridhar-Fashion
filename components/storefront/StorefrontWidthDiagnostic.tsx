'use client';

import { useEffect, useState } from 'react';

type Measurement = { label: string; width: number; left: number; right: number; tag: string; className: string };

export function StorefrontWidthDiagnostic() {
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [overflowers, setOverflowers] = useState<Measurement[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('layoutDebug') !== '1') return;

    const measure = (label: string, element: Element | null): Measurement | null => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        label,
        width: Math.round(rect.width * 10) / 10,
        left: Math.round(rect.left * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className.slice(0, 90) : '',
      };
    };

    const bodyChildren = Array.from(document.body.children).filter((el) => el.tagName !== 'SCRIPT');
    const root = bodyChildren.find((el) => !el.hasAttribute('data-nextjs-scroll-focus-boundary')) || bodyChildren[0] || null;
    const rows = [
      measure('html', document.documentElement),
      measure('body', document.body),
      measure('body first child', root),
      measure('header', document.querySelector('header')),
      measure('main', document.querySelector('main')),
      measure('footer', document.querySelector('footer')),
    ].filter(Boolean) as Measurement[];

    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.body.querySelectorAll('*'))
      .filter((el) => !el.closest('[aria-label="Temporary storefront width diagnostic"]'))
      .map((el) => measure('', el))
      .filter((m): m is Measurement => Boolean(m && (m.right > viewportWidth + 2 || m.left < -2 || m.width > viewportWidth + 2)))
      .sort((a, b) => (b.right - viewportWidth) - (a.right - viewportWidth))
      .slice(0, 10)
      .map((m, i) => ({ ...m, label: String(i + 1) }));

    setMeasurements(rows);
    setOverflowers(offenders);
  }, []);

  if (!measurements) return null;

  return (
    <aside
      aria-label="Temporary storefront width diagnostic"
      style={{
        position: 'fixed', zIndex: 99999, top: 8, left: 8, maxWidth: 'calc(100vw - 16px)',
        maxHeight: '70vh', overflow: 'auto', padding: 10, background: '#111827',
        color: '#fff', border: '1px solid #fbbf24', borderRadius: 8,
        font: '11px/1.4 monospace', boxShadow: '0 4px 20px #0006',
      }}
    >
      <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 5 }}>GF WIDTH DEBUG v2</div>
      <div>innerWidth: {window.innerWidth}px | clientWidth: {document.documentElement.clientWidth}px</div>
      <div>screen: {window.screen.width}px | DPR: {window.devicePixelRatio}</div>
      <div>scrollWidth: {document.documentElement.scrollWidth}px</div>
      {measurements.map((m) => (
        <div key={m.label} style={{ borderTop: '1px solid #ffffff33', paddingTop: 3, marginTop: 3 }}>
          <strong>{m.label}</strong>: {m.width}px (L{m.left}/R{m.right})<br />
          <span style={{ color: '#d1d5db' }}>{m.tag} {m.className}</span>
        </div>
      ))}
      <div style={{ color: '#fbbf24', fontWeight: 700, marginTop: 7 }}>OVERFLOWING ELEMENTS</div>
      {overflowers.length ? overflowers.map((m) => (
        <div key={m.label} style={{ borderTop: '1px solid #ffffff33', paddingTop: 3, marginTop: 3 }}>
          <strong>#{m.label} {m.tag}</strong> {m.width}px (L{m.left}/R{m.right})<br />
          <span style={{ color: '#d1d5db' }}>{m.className}</span>
        </div>
      )) : <div>None found</div>}
      <button
        type="button"
        onClick={() => setMeasurements(null)}
        style={{ marginTop: 7, padding: '3px 7px', background: '#fbbf24', color: '#111827', borderRadius: 4 }}
      >
        Hide
      </button>
    </aside>
  );
}
