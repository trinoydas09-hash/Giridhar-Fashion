import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function garmentSvg({ bg1, bg2, garmentFill, garmentStroke, accent, type, label }) {
  // Clean 3:4 luxury fashion studio garment plate (600x800)
  let silhouette = '';

  if (type === 'sweater') {
    silhouette = `
      <g transform="translate(300, 410)">
        <!-- Sweater body -->
        <path d="M-95,-190 L-45,-210 C-20,-192 20,-192 45,-210 L95,-190 L190,-95 L155,-45 L110,-90 L110,190 C110,202 -110,202 -110,190 L-110,-90 L-155,-45 L-190,-95 Z"
              fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <!-- Ribbed collar -->
        <path d="M-45,-210 C-20,-182 20,-182 45,-210 C24,-196 -24,-196 -45,-210 Z" fill="none" stroke="${accent}" stroke-width="4" opacity="0.7" />
        <!-- Cable knit vertical braids -->
        <g stroke="${garmentStroke}" stroke-width="1.8" opacity="0.55" fill="none">
          <path d="M-60,-150 C-52,-130 -68,-110 -60,-90 C-52,-70 -68,-50 -60,-30 C-52,-10 -68,10 -60,30 C-52,50 -68,70 -60,90 C-52,110 -68,130 -60,155" />
          <path d="M-20,-165 C-12,-145 -28,-125 -20,-105 C-12,-85 -28,-65 -20,-45 C-12,-25 -28,-5 -20,15 C-12,35 -28,55 -20,75 C-12,95 -28,115 -20,160" />
          <path d="M20,-165 C28,-145 12,-125 20,-105 C28,-85 12,-65 20,-45 C28,-25 12,-5 20,15 C28,35 12,55 20,75 C28,95 12,115 20,160" />
          <path d="M60,-150 C68,-130 52,-110 60,-90 C68,-70 52,-50 60,-30 C68,-10 52,10 60,30 C68,50 52,70 60,90 C68,110 52,130 60,155" />
        </g>
        <!-- Ribbed hem & cuffs -->
        <rect x="-110" y="165" width="220" height="28" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="1.5" opacity="0.9" />
      </g>
    `;
  } else if (type === 'hoodie') {
    silhouette = `
      <g transform="translate(300, 420)">
        <!-- Hood -->
        <path d="M-55,-205 C-65,-265 65,-265 55,-205 C35,-180 -35,-180 -55,-205 Z" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <path d="M-38,-205 C-35,-242 35,-242 38,-205" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.5" />
        <!-- Drop-shoulder body -->
        <path d="M-55,-205 L-115,-185 L-200,-80 L-160,-30 L-118,-85 L-118,185 L118,185 L118,-85 L160,-30 L200,-80 L115,-185 L55,-205 Z"
              fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <!-- Kangaroo pocket -->
        <path d="M-72,65 L72,65 L86,145 L-86,145 Z" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="1.6" opacity="0.9" />
        <line x1="-118" y1="162" x2="118" y2="162" stroke="${garmentStroke}" stroke-width="1.5" opacity="0.6" />
      </g>
    `;
  } else if (type === 'shirt') {
    silhouette = `
      <g transform="translate(300, 410)">
        <!-- Shirt body -->
        <path d="M-42,-215 L42,-215 L105,-185 L195,-75 L155,-32 L105,-88 L105,195 C45,212 -45,212 -105,195 L-105,-88 L-155,-32 L-195,-75 L-105,-185 Z"
              fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <!-- Mandarin collar -->
        <path d="M-42,-215 C-18,-228 18,-228 42,-215 L42,-192 C18,-182 -18,-182 -42,-192 Z" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <!-- Center placket -->
        <rect x="-10" y="-190" width="20" height="360" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="1.2" opacity="0.7" />
        <!-- Pearl buttons -->
        <circle cx="0" cy="-160" r="3.5" fill="${accent}" />
        <circle cx="0" cy="-105" r="3.5" fill="${accent}" />
        <circle cx="0" cy="-50" r="3.5" fill="${accent}" />
        <circle cx="0" cy="5" r="3.5" fill="${accent}" />
        <circle cx="0" cy="60" r="3.5" fill="${accent}" />
        <circle cx="0" cy="115" r="3.5" fill="${accent}" />
      </g>
    `;
  } else if (type === 'overshirt') {
    silhouette = `
      <g transform="translate(300, 410)">
        <path d="M-45,-210 L45,-210 L112,-182 L198,-72 L156,-25 L108,-84 L108,192 L-108,192 L-108,-84 L-156,-25 L-198,-72 L-112,-182 Z"
              fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <!-- Classic spread collar -->
        <path d="M-45,-210 L0,-172 L-62,-160 Z" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="1.8" />
        <path d="M45,-210 L0,-172 L62,-160 Z" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="1.8" />
        <!-- Twin chest pockets -->
        <rect x="-82" y="-95" width="54" height="64" rx="2" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="1.5" />
        <path d="M-82,-95 L-55,-76 L-28,-95" fill="none" stroke="${garmentStroke}" stroke-width="1.5" />
        <rect x="28" y="-95" width="54" height="64" rx="2" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="1.5" />
        <path d="M28,-95 L55,-76 L82,-95" fill="none" stroke="${garmentStroke}" stroke-width="1.5" />
        <line x1="0" y1="-172" x2="0" y2="192" stroke="${garmentStroke}" stroke-width="1.5" />
        <circle cx="0" cy="-135" r="4" fill="${accent}" />
        <circle cx="0" cy="-70" r="4" fill="${accent}" />
        <circle cx="0" cy="-5" r="4" fill="${accent}" />
        <circle cx="0" cy="60" r="4" fill="${accent}" />
        <circle cx="0" cy="125" r="4" fill="${accent}" />
      </g>
    `;
  } else if (type === 'trousers') {
    silhouette = `
      <g transform="translate(300, 410)">
        <!-- Waistband -->
        <rect x="-96" y="-215" width="192" height="28" fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <!-- Legs with double pleats -->
        <path d="M-96,-187 L96,-187 L108,215 L36,215 L0,-50 L-36,215 L-108,215 Z"
              fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <!-- Crease & pleats -->
        <line x1="-58" y1="-185" x2="-68" y2="210" stroke="${garmentStroke}" stroke-width="1.4" opacity="0.5" />
        <line x1="-42" y1="-185" x2="-46" y2="-130" stroke="${garmentStroke}" stroke-width="1.4" opacity="0.6" />
        <line x1="58" y1="-185" x2="68" y2="210" stroke="${garmentStroke}" stroke-width="1.4" opacity="0.5" />
        <line x1="42" y1="-185" x2="46" y2="-130" stroke="${garmentStroke}" stroke-width="1.4" opacity="0.6" />
        <!-- Side tab brass buckle -->
        <rect x="-92" y="-206" width="18" height="10" fill="none" stroke="${accent}" stroke-width="2" />
        <rect x="74" y="-206" width="18" height="10" fill="none" stroke="${accent}" stroke-width="2" />
      </g>
    `;
  } else if (type === 'tee') {
    silhouette = `
      <g transform="translate(300, 415)">
        <path d="M-48,-195 C-22,-172 22,-172 48,-195 L112,-175 L188,-92 L145,-48 L104,-86 L104,185 L-104,185 L-104,-86 L-145,-48 L-188,-92 L-112,-175 Z"
              fill="${garmentFill}" stroke="${garmentStroke}" stroke-width="2" />
        <path d="M-48,-195 C-22,-162 22,-162 48,-195" fill="none" stroke="${garmentStroke}" stroke-width="6" opacity="0.45" />
        <line x1="-104" y1="168" x2="104" y2="168" stroke="${garmentStroke}" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.5" />
      </g>
    `;
  } else {
    // belt / accessory
    silhouette = `
      <g transform="translate(300, 405)">
        <ellipse cx="0" cy="0" rx="145" ry="110" fill="none" stroke="${garmentFill}" stroke-width="34" />
        <ellipse cx="0" cy="0" rx="145" ry="110" fill="none" stroke="${garmentStroke}" stroke-width="2" />
        <ellipse cx="0" cy="0" rx="128" ry="93" fill="none" stroke="${garmentStroke}" stroke-width="1.5" />
        <!-- Brass Buckle -->
        <rect x="-170" y="-28" width="52" height="56" rx="4" fill="none" stroke="${accent}" stroke-width="9" />
        <line x1="-145" y1="0" x2="-115" y2="0" stroke="${accent}" stroke-width="5" stroke-linecap="round" />
      </g>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs>
    <radialGradient id="studioLight" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${bg1}" />
      <stop offset="100%" stop-color="${bg2}" />
    </radialGradient>
    <pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 4 H8 M4 0 V8" stroke="#173D32" stroke-width="0.35" opacity="0.06" />
    </pattern>
    <filter id="softShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#173D32" flood-opacity="0.14" />
    </filter>
  </defs>
  <rect width="600" height="800" fill="url(#studioLight)" />
  <rect width="600" height="800" fill="url(#weave)" />
  <rect x="28" y="28" width="544" height="744" fill="none" stroke="#173D32" stroke-opacity="0.08" stroke-width="1" />
  <g filter="url(#softShadow)">
    ${silhouette}
  </g>
  <text x="300" y="736" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="4" fill="#173D32" opacity="0.45">${label.toUpperCase()}</text>
</svg>`;
}

function bannerSvg({ bgStart, bgEnd, accent, title, mode }) {
  // 16:9 atmospheric editorial backdrop (1600x900)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <defs>
    <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgStart}" />
      <stop offset="100%" stop-color="${bgEnd}" />
    </linearGradient>
    <radialGradient id="sunGlow" cx="72%" cy="38%" r="48%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
    <pattern id="linenGrid" width="16" height="16" patternUnits="userSpaceOnUse">
      <path d="M0 8 H16 M8 0 V16" stroke="#F5F0E7" stroke-width="0.4" opacity="0.06" />
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#heroGrad)" />
  <rect width="1600" height="900" fill="url(#sunGlow)" />
  <rect width="1600" height="900" fill="url(#linenGrid)" />
  <!-- Architectural draped folds & geometric tailoring lines -->
  <path d="M980,900 L1180,140 L1290,900 Z" fill="#0E2720" opacity="0.32" />
  <path d="M1140,900 L1330,210 L1470,900 Z" fill="#0B1F19" opacity="0.45" />
  <circle cx="1220" cy="250" r="145" fill="${accent}" opacity="0.16" />
  <circle cx="1220" cy="250" r="144" fill="none" stroke="${accent}" stroke-width="1" opacity="0.45" />
  <!-- Tailored atelier dress-form / coat silhouette right side -->
  <g transform="translate(1220, 480)" opacity="0.88">
    <path d="M-55,-245 L55,-245 L145,-205 L245,-45 L188,15 L130,-70 L130,360 L-130,360 L-130,-70 L-188,15 L-245,-45 L-145,-205 Z"
          fill="${mode === 'promo' ? '#173D32' : '#102B23'}" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.55" />
    <path d="M-55,-245 L0,-165 L55,-245" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.65" />
    <line x1="0" y1="-165" x2="0" y2="360" stroke="${accent}" stroke-width="1" opacity="0.35" />
  </g>
  <rect x="48" y="48" width="1504" height="804" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="1" />
  <text x="1500" y="815" text-anchor="end" font-family="Georgia, serif" font-size="14" letter-spacing="6" fill="${accent}" opacity="0.5">${title.toUpperCase()}</text>
</svg>`;
}

function categorySvg({ bg1, bg2, accent, type, label }) {
  // 4:3 category plate (800x600)
  return garmentSvg({
    bg1,
    bg2,
    garmentFill: '#173D32',
    garmentStroke: '#0E2720',
    accent,
    type,
    label,
  })
    .replace('viewBox="0 0 600 800" width="600" height="800"', 'viewBox="0 0 800 600" width="800" height="600"')
    .replace('width="600" height="800" fill="url(#studioLight)"', 'width="800" height="600" fill="url(#studioLight)"')
    .replace('width="600" height="800" fill="url(#weave)"', 'width="800" height="600" fill="url(#weave)"')
    .replace('width="544" height="744"', 'width="744" height="544"')
    .replace('translate(300, 410)', 'translate(400, 315) scale(0.75)')
    .replace('translate(300, 420)', 'translate(400, 320) scale(0.75)')
    .replace('translate(300, 415)', 'translate(400, 315) scale(0.75)')
    .replace('translate(300, 405)', 'translate(400, 310) scale(0.75)')
    .replace('x="300" y="736"', 'x="400" y="555"');
}

ensureDir(path.join(root, 'public/images/products'));
ensureDir(path.join(root, 'public/images/banners'));
ensureDir(path.join(root, 'public/images/categories'));

const productAssets = [
  { file: 'cable-knit-burgundy.svg', bg1: '#FAF7F2', bg2: '#EAE2D6', garmentFill: '#5D1E29', garmentStroke: '#3B1018', accent: '#B99A61', type: 'sweater', label: 'Giridhar Atelier · Burgundy Knit' },
  { file: 'cable-knit-forest.svg', bg1: '#FAF7F2', bg2: '#E7E4DC', garmentFill: '#173D32', garmentStroke: '#0C241D', accent: '#B99A61', type: 'sweater', label: 'Giridhar Atelier · Forest Knit' },
  { file: 'cable-knit-beige.svg', bg1: '#F7F4EE', bg2: '#E3DACB', garmentFill: '#D8CBB8', garmentStroke: '#9E8F7B', accent: '#173D32', type: 'sweater', label: 'Giridhar Atelier · Beige Knit' },
  { file: 'hoodie-black.svg', bg1: '#F8F6F1', bg2: '#E7E3DA', garmentFill: '#1D1D1D', garmentStroke: '#0B0B0B', accent: '#B99A61', type: 'hoodie', label: 'Giridhar Atelier · 420 GSM Obsidian' },
  { file: 'hoodie-forest.svg', bg1: '#F8F6F1', bg2: '#E5E3DB', garmentFill: '#173D32', garmentStroke: '#0D261F', accent: '#B99A61', type: 'hoodie', label: 'Giridhar Atelier · 420 GSM Forest' },
  { file: 'shirt-cream.svg', bg1: '#F4F0E8', bg2: '#E2DACB', garmentFill: '#F7F4EC', garmentStroke: '#B2A898', accent: '#B99A61', type: 'shirt', label: 'Giridhar Atelier · Dhaka Linen' },
  { file: 'shirt-forest.svg', bg1: '#F8F6F1', bg2: '#E6E2D8', garmentFill: '#173D32', garmentStroke: '#0D261F', accent: '#E5D5B5', type: 'shirt', label: 'Giridhar Atelier · Forest Linen' },
  { file: 'trousers-charcoal.svg', bg1: '#F8F6F1', bg2: '#E6E2D8', garmentFill: '#2C2C2C', garmentStroke: '#151515', accent: '#B99A61', type: 'trousers', label: 'Giridhar Atelier · Pleated Charcoal' },
  { file: 'trousers-sand.svg', bg1: '#F8F6F1', bg2: '#E5DDD0', garmentFill: '#C8B9A6', garmentStroke: '#8F806E', accent: '#173D32', type: 'trousers', label: 'Giridhar Atelier · Pleated Sand' },
  { file: 'tee-forest.svg', bg1: '#F8F6F1', bg2: '#E6E2D8', garmentFill: '#173D32', garmentStroke: '#0E2720', accent: '#B99A61', type: 'tee', label: 'Giridhar Atelier · 260 GSM Supima' },
  { file: 'tee-cream.svg', bg1: '#EFEAE0', bg2: '#DFD7C8', garmentFill: '#FAF8F3', garmentStroke: '#B8AFA0', accent: '#173D32', type: 'tee', label: 'Giridhar Atelier · Off-White Supima' },
  { file: 'overshirt-olive.svg', bg1: '#F8F6F1', bg2: '#E6E2D8', garmentFill: '#4A5438', garmentStroke: '#2B321F', accent: '#B99A61', type: 'overshirt', label: 'Giridhar Atelier · Vintage Canvas' },
  { file: 'shirt-navy.svg', bg1: '#F8F6F1', bg2: '#E5E2DC', garmentFill: '#1D2939', garmentStroke: '#0E1621', accent: '#F2ECE1', type: 'overshirt', label: 'Giridhar Atelier · 2-Ply Oxford' },
  { file: 'accessory-belt.svg', bg1: '#F8F6F1', bg2: '#E6DFD3', garmentFill: '#3D271E', garmentStroke: '#22140E', accent: '#B99A61', type: 'belt', label: 'Giridhar Atelier · Full-Grain Leather' },
];

for (const item of productAssets) {
  fs.writeFileSync(path.join(root, 'public/images/products', item.file), garmentSvg(item), 'utf8');
}

const bannerAssets = [
  { file: 'hero-autumn-winter.svg', bgStart: '#173D32', bgEnd: '#0D231C', accent: '#B99A61', title: 'Giridhar Fashion · Dhaka Atelier', mode: 'hero' },
  { file: 'promo-tailoring.svg', bgStart: '#242424', bgEnd: '#141414', accent: '#B99A61', title: 'Vintage & Knitwear Capsule', mode: 'promo' },
];

for (const item of bannerAssets) {
  fs.writeFileSync(path.join(root, 'public/images/banners', item.file), bannerSvg(item), 'utf8');
}

const categoryAssets = [
  { file: 'new-arrivals.svg', bg1: '#FAF8F3', bg2: '#EAE3D5', accent: '#B99A61', type: 'overshirt', label: 'New Arrivals' },
  { file: 'shirts.svg', bg1: '#FAF8F3', bg2: '#EAE3D5', accent: '#B99A61', type: 'shirt', label: 'Shirts' },
  { file: 't-shirts.svg', bg1: '#FAF8F3', bg2: '#EAE3D5', accent: '#B99A61', type: 'tee', label: 'T-Shirts' },
  { file: 'sweaters.svg', bg1: '#FAF8F3', bg2: '#EAE3D5', accent: '#B99A61', type: 'sweater', label: 'Sweaters' },
  { file: 'hoodies.svg', bg1: '#FAF8F3', bg2: '#EAE3D5', accent: '#B99A61', type: 'hoodie', label: 'Hoodies' },
  { file: 'trousers.svg', bg1: '#FAF8F3', bg2: '#EAE3D5', accent: '#B99A61', type: 'trousers', label: 'Trousers' },
  { file: 'vintage.svg', bg1: '#FAF8F3', bg2: '#EAE3D5', accent: '#B99A61', type: 'overshirt', label: 'Vintage Collection' },
  { file: 'accessories.svg', bg1: '#FAF8F3', bg2: '#EAE3D5', accent: '#B99A61', type: 'belt', label: 'Accessories' },
];

for (const item of categoryAssets) {
  fs.writeFileSync(path.join(root, 'public/images/categories', item.file), categorySvg(item), 'utf8');
}

console.log('Generated all atelier plates successfully.');
