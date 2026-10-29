/* Storyfil — storyboards et process reliés par des fils.
   Site statique sans compilation. Les storyboards restent dans le navigateur (IndexedDB) ;
   le partage passe par un lien (storyboard compressé dans l'adresse) ou par un fichier d'aperçu autonome. */
(() => {
'use strict';

/* ---------------- Réglages ---------------- */
const PUBLIC_URL = 'https://fulberitodesign.github.io/storyfil/';
const FORMAT = 1;
const GRID = 20, ZMIN = 0.1, ZMAX = 3;
const LINK_MAX = 120000;   // au-delà, les aperçus d'images sont retirés du lien de partage
const COLORS = ['#22d3ee', '#818cf8', '#c084fc', '#fb7185', '#fb923c', '#fbbf24', '#4ade80', '#94a3b8'];
const DEFCOLOR = { scene: '#22d3ee', step: '#818cf8', note: '#fbbf24', text: '', zone: '#94a3b8' };
const RATIOS = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 4 / 5, '4:3': 4 / 3 };
const DEF = { scene: { w: 280 }, step: { w: 200, h: 80 }, note: { w: 220, h: 160 }, text: { w: 360 }, zone: { w: 760, h: 460 } };
const SHAPE_SIZE = { rect: { w: 200, h: 80 }, pill: { w: 180, h: 64 }, diamond: { w: 180, h: 120 }, circle: { w: 120, h: 120 } };
const SHAPES = ['rect', 'pill', 'diamond', 'circle'];
const SIDES = ['top', 'right', 'bottom', 'left'];
const NORM = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
const OPP = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const SIZES = ['s', 'm', 'l', 'xl'];
const DEF_SIZE = { text: 'l', note: 'm', step: 'm' };
const DEF_FONT = { text: 'display', note: 'body', step: 'display' };
const FONTS = { display: 'Titre (Sora)', body: 'Texte (Plex)', serif: 'Élégante', hand: 'Manuscrite', mono: 'Machine à écrire' };
const STATUS = { todo: ['À faire', '#94a3b8'], wip: ['En cours', '#fbbf24'], shot: ['Tourné', '#818cf8'], cut: ['Monté', '#c084fc'], ok: ['Validé', '#4ade80'] };
const SHOTS = ['Très gros plan', 'Gros plan', 'Plan rapproché', 'Plan taille', 'Plan américain', 'Plan moyen', 'Plan large', "Plan d'ensemble", 'Insert (détail)', 'Plongée', 'Contre-plongée', 'Vue subjective', 'Plan drone', 'Champ / contrechamp'];
const MOVES = ['Fixe', 'Panoramique', 'Travelling avant', 'Travelling arrière', 'Travelling latéral', 'Zoom avant', 'Zoom arrière', 'Caméra épaule', 'Stabilisateur / gimbal', 'Drone', 'Ralenti', 'Accéléré'];
const TRANS = ['Cut', 'Fondu enchaîné', 'Fondu au noir', 'Glissé', 'Zoom', 'Raccord mouvement', 'Jump cut', 'Whip pan', 'Masque / volet'];
const TYPE_LABEL = { scene: 'Scène', step: 'Étape', note: 'Note', text: 'Texte', zone: 'Zone' };
const PROV = {
  tiktok: { name: 'TikTok', bg: 'linear-gradient(135deg,#25f4ee 0%,#121212 36%,#121212 64%,#fe2c55 100%)' },
  instagram: { name: 'Instagram', bg: 'linear-gradient(45deg,#f9ce34 0%,#ee2a7b 50%,#6228d7 100%)' },
  facebook: { name: 'Facebook', bg: 'linear-gradient(135deg,#1877f2,#0b4fb3)' },
  youtube: { name: 'YouTube', bg: 'linear-gradient(135deg,#ff0033,#a5001f)' },
  vimeo: { name: 'Vimeo', bg: 'linear-gradient(135deg,#17d5ff,#0a7fa3)' },
  drive: { name: 'Google Drive', bg: 'linear-gradient(135deg,#1fa463,#0f6b3f)' }
};

/* ---------------- Utilitaires ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toHtml = t => esc(t).replace(/\n/g, '<br>');
const isColor = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const str = (v, max = 4000) => typeof v === 'string' ? v.slice(0, max) : '';
const num = (v, d, a = -1e7, b = 1e7) => (v === null || v === '' || v === undefined || !Number.isFinite(+v)) ? d : clamp(+v, a, b);
const okId = v => typeof v === 'string' && /^[\w-]{1,40}$/.test(v);
const typing = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const r1 = v => Math.round(v * 10) / 10;
const narrow = () => innerWidth < 760;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const raf = fn => { let id = 0; return () => { if (!id) id = requestAnimationFrame(() => { id = 0; fn(); }); }; };
const slug = s => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'storyboard';
const fmtDur = s => { if (!s) return ''; if (s < 60) return String(r1(s)).replace('.', ',') + ' s'; const m = Math.floor(s / 60), r = Math.round(s % 60); return m + ' min' + (r ? ' ' + String(r).padStart(2, '0') : ''); };
const tc = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtDate = t => t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } }
function safeUrl(u) { if (typeof u !== 'string' || u.length > 4000) return ''; try { const x = new URL(u.trim()); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } }
const DATA_RE = /^data:(image\/(png|jpeg|gif|webp|avif|svg\+xml)|video\/[a-z0-9.+-]{2,30});base64,/;
const safeData = d => typeof d === 'string' && DATA_RE.test(d.slice(0, 60)) ? d : '';
const blobToData = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const dataToBlob = async d => (await fetch(d)).blob();

const NS = 'http://www.w3.org/2000/svg';
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
function sv(tag, attrs) { const el = document.createElementNS(NS, tag); for (const k in attrs || {}) if (attrs[k] != null) el.setAttribute(k, attrs[k]); return el; }
function icon(name) { const el = sv('svg', { class: 'ic', 'aria-hidden': 'true' }); el.append(sv('use', { href: '#i-' + name })); return el; }
function btn(ic, label, onclick, cls = 'ib') { return h('button', { class: cls, type: 'button', title: label, 'aria-label': label, onclick }, icon(ic)); }
let toastT = 0;
function toast(msg, ms = 2800) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
function download(blob, name) { const url = URL.createObjectURL(blob); const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); }

/* ---------------- Stockage hors ligne (IndexedDB) ---------------- */
const DB = {
  db: null, mem: { boards: {}, media: {}, kv: {} },
  async open() {
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open('storyfil', 1);
        r.onupgradeneeded = () => { for (const s of ['boards', 'media', 'kv']) r.result.createObjectStore(s); };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
    } catch (e) { this.db = null; }
  },
  req(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode); const r = fn(t.objectStore(store));
      t.oncomplete = () => res(r ? r.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  async get(s, k) { return this.db ? this.req(s, 'readonly', o => o.get(k)) : this.mem[s][k]; },
  async put(s, k, v) { if (!this.db) { this.mem[s][k] = v; return; } return this.req(s, 'readwrite', o => o.put(v, k)); },
  async del(s, k) { if (!this.db) { delete this.mem[s][k]; return; } return this.req(s, 'readwrite', o => o.delete(k)); },
  async keys(s) { return this.db ? this.req(s, 'readonly', o => o.getAllKeys()) : Object.keys(this.mem[s]); },
  async all(s) { return this.db ? this.req(s, 'readonly', o => o.getAll()) : Object.values(this.mem[s]); }
};

/* ---------------- Liens vidéo (TikTok, Instagram, Facebook…) ---------------- */
function parseT(v) {
  if (!v) return 0;
  if (/^\d+$/.test(v)) return +v;
  const m = String(v).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}
/* Reconnaît un lien et dit comment l'afficher. Les identifiants sont vérifiés : ce sont eux qui servent à construire les lecteurs intégrés. */
function parseLink(raw) {
  let u; try { u = new URL(String(raw).trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile|web|vm|vt)\./, '');
  const p = u.pathname; let m;
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    m = p.match(/\/(?:video|photo|embed\/v2|embed|player\/v1)\/(\d{5,25})/);
    return { kind: 'embed', provider: 'tiktok', id: m ? m[1] : '', url: u.href };
  }
  if (host === 'instagram.com' || host === 'instagr.am') {
    m = p.match(/^\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]{5,40})/);
    if (m) return { kind: 'embed', provider: 'instagram', id: m[2], sub: m[1] === 'p' ? 'p' : m[1] === 'tv' ? 'tv' : 'reel', url: u.href };
    return { kind: 'link', provider: 'instagram', url: u.href };
  }
  if (host === 'facebook.com' || host === 'fb.watch' || host === 'fb.com') {
    const vertical = /\/reels?\/|\/share\/r\//.test(p);
    if (vertical || host === 'fb.watch' || /\/videos?\/|\/watch|\/share\/v\//.test(p)) return { kind: 'embed', provider: 'facebook', sub: 'video', vertical, url: u.href };
    if (/\/posts\/|\/permalink|story_fbid|\/photo|\/share\/p\//.test(p + u.search)) return { kind: 'embed', provider: 'facebook', sub: 'post', url: u.href };
    return { kind: 'link', provider: 'facebook', url: u.href };
  }
  if (/^((music\.)?youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(host)) {
    let id = host === 'youtu.be' ? p.slice(1).split('/')[0] : u.searchParams.get('v'), short = false;
    if (!id && (m = p.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/))) { id = m[2]; short = m[1] === 'shorts'; }
    if (id && /^[\w-]{11}$/.test(id)) return { kind: 'embed', provider: 'youtube', id, short, start: parseT(u.searchParams.get('t') || u.searchParams.get('start')), url: u.href };
    return { kind: 'link', provider: 'youtube', url: u.href };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    m = p.match(/^(?:\/video)?\/(\d{5,12})(?:\/([\da-f]{6,20}))?/);
    if (m) { const hash = m[2] || u.searchParams.get('h') || ''; return { kind: 'embed', provider: 'vimeo', id: m[1], hash: /^[\da-f]{6,20}$/.test(hash) ? hash : '', url: u.href }; }
  }
  if (host === 'drive.google.com') {
    const id = (p.match(/\/file\/d\/([\w-]{10,80})/) || [])[1] || u.searchParams.get('id');
    if (id && /^[\w-]{10,80}$/.test(id)) return { kind: 'embed', provider: 'drive', id, url: u.href };
  }
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(p)) return { kind: 'video', url: u.href };
  if (/\.(jpe?g|png|gif|webp|avif|svg)$/i.test(p)) return { kind: 'image', url: u.href };
  return { kind: 'link', url: u.href };
}
function embedSrc(m, { autoplay = false, width = 400 } = {}) {
  const ap = autoplay ? 1 : 0;
  switch (m.provider) {
    case 'tiktok': return m.id ? `https://www.tiktok.com/player/v1/${m.id}?rel=0&loop=1&music_info=0&description=0&autoplay=${ap}` : '';
    case 'instagram': return `https://www.instagram.com/${m.sub || 'reel'}/${m.id}/embed/`;
    case 'facebook': return `https://www.facebook.com/plugins/${m.sub === 'post' ? 'post' : 'video'}.php?href=${encodeURIComponent(m.url)}&show_text=false&width=${Math.round(clamp(width, 220, 1200))}${ap ? '&autoplay=true' : ''}`;
    case 'youtube': return `https://www.youtube-nocookie.com/embed/${m.id}?rel=0&playsinline=1&modestbranding=1${m.start ? '&start=' + m.start : ''}${ap ? '&autoplay=1' : ''}`;
    case 'vimeo': return `https://player.vimeo.com/video/${m.id}?dnt=1&title=0&byline=0&portrait=0${m.hash ? '&h=' + m.hash : ''}${ap ? '&autoplay=1' : ''}`;
    case 'drive': return `https://drive.google.com/file/d/${m.id}/preview`;
  }
  return '';
}
/* YouTube refuse ses lecteurs dans un fichier ouvert depuis l'ordinateur : on propose alors le lien */
const canEmbed = m => !!embedSrc(m) && !(m.provider === 'youtube' && location.protocol === 'file:');
function defaultRatio(m) {
  if (m.provider === 'tiktok') return 9 / 16;
  if (m.provider === 'instagram') return m.sub === 'p' ? 4 / 5 : 9 / 16;
  if (m.provider === 'facebook') return m.sub === 'post' ? 4 / 5 : m.vertical ? 9 / 16 : 16 / 9;
  if (m.provider === 'youtube') return m.short ? 9 / 16 : 16 / 9;
  return 16 / 9;
}
/* Liens courts TikTok (vm.tiktok.com…) : l'oEmbed public de TikTok donne l'identifiant de la vidéo */
async function resolveTikTok(url) {
  try {
    const r = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url));
    if (!r.ok) return '';
    const j = await r.json();
    const id = String(j.embed_product_id || '') || ((j.html || '').match(/player\/v1\/(\d+)/) || [])[1] || ((j.html || '').match(/data-video-id="(\d+)"/) || [])[1] || '';
    return /^\d{5,25}$/.test(id) ? id : '';
  } catch { return ''; }
}
async function mediaFromLink(raw) {
  const L = parseLink(raw);
  if (!L) return null;
  if (L.provider === 'tiktok' && !L.id) L.id = await resolveTikTok(L.url);
  return L;
}

/* ---------------- Texte enrichi (gras, italique, couleurs…) ----------------
   Le texte mis en forme est gardé en HTML, nettoyé à chaque entrée : seules quelques balises de mise en forme passent. */
const RICH = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', S: 's', STRIKE: 's', DEL: 's', MARK: 'mark', BR: 'br', DIV: 'div', P: 'div', H1: 'div', H2: 'div', H3: 'div', BLOCKQUOTE: 'div', UL: 'ul', OL: 'ol', LI: 'li', SPAN: 'span', FONT: 'span', A: 'a' };
const DROP = /^(SCRIPT|STYLE|TEMPLATE|IFRAME|FRAME|OBJECT|EMBED|NOSCRIPT|SVG|MATH|TITLE|HEAD|META|LINK|BASE|TEXTAREA|SELECT|OPTION|BUTTON|INPUT|IMG|VIDEO|AUDIO|SOURCE|PICTURE|CANVAS|FORM)$/;
const CSS_COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+%?\s*)?\))$/i;
function cleanHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const tpl = document.createElement('template');
  tpl.innerHTML = html.slice(0, 40000);
  const out = document.createElement('div');
  (function walk(src, dst, depth) {
    for (const c of src.childNodes) {
      if (c.nodeType === 3) { dst.append(c.data); continue; }
      if (c.nodeType !== 1 || depth > 12) continue;
      const T = c.tagName.toUpperCase();
      if (DROP.test(T)) continue;
      const tag = RICH[T];
      if (!tag) { walk(c, dst, depth + 1); continue; }
      let el = document.createElement(tag), inner = el;
      if (tag === 'span') {
        const st = T === 'FONT' ? null : c.style;
        const col = (T === 'FONT' ? c.getAttribute('color') : st.color) || '', bg = st ? st.backgroundColor : '';
        if (CSS_COLOR.test(col.trim())) el.style.color = col.trim();
        if (CSS_COLOR.test(bg.trim())) el.style.backgroundColor = bg.trim();
        /* Les navigateurs écrivent parfois le gras ou l'italique en style : on les garde en balises */
        const wraps = [];
        if (st) {
          if (/bold|[6-9]00/.test(st.fontWeight)) wraps.push('b');
          if (st.fontStyle === 'italic') wraps.push('i');
          const deco = st.textDecorationLine || st.textDecoration || '';
          if (/underline/.test(deco)) wraps.push('u');
          if (/line-through/.test(deco)) wraps.push('s');
        }
        if (!el.getAttribute('style')) { if (!wraps.length) { walk(c, dst, depth + 1); continue; } el = document.createElement(wraps.shift()); inner = el; }
        for (const w of wraps) { const x = document.createElement(w); inner.append(x); inner = x; }
      }
      if (tag === 'a') {
        const u = safeUrl(c.getAttribute('href') || '');
        if (!u) { walk(c, dst, depth + 1); continue; }
        el.href = u; el.target = '_blank'; el.rel = 'noopener noreferrer';
      }
      if (tag !== 'br') walk(c, inner, depth + 1);
      dst.append(el);
    }
  })(tpl.content, out, 0);
  return /\S/.test(out.textContent) ? out.innerHTML : '';
}
function textOf(html) {
  if (!html) return '';
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|li|p)>/gi, '\n</$1>');
  return tpl.content.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------------- Vérification des données reçues (fichier, lien, sauvegarde) ---------------- */
function normMedia(m) {
  if (!m || typeof m !== 'object') return null;
  let o;
  const url = safeUrl(m.url);
  if (m.kind === 'embed' || m.kind === 'link') {
    const L = url && parseLink(url);
    if (!L) return null;
    o = L;
    if (L.provider === 'tiktok' && !L.id && /^\d{5,25}$/.test(String(m.id || ''))) o.id = String(m.id);
  } else if (m.kind === 'image' || m.kind === 'video') {
    o = { kind: m.kind };
    if (okId(m.local)) o.local = m.local;
    const d = safeData(m.data); if (d) o.data = d;
    if (url) o.url = url;
    if (m.missing) o.missing = true;
    if (!o.local && !o.data && !o.url && !o.missing) return null;
  } else return null;
  const p = safeData(m.poster); if (p && p.startsWith('data:image')) o.poster = p;
  const r = +m.ratio; if (Number.isFinite(r) && r > 0.1 && r < 10) o.ratio = Math.round(r * 1e4) / 1e4;
  if (m.name) o.name = str(m.name, 200);
  return o;
}
function normNode(n, seen) {
  if (!n || typeof n !== 'object' || !DEF[n.type]) return null;
  const id = okId(n.id) && !seen.has(n.id) ? n.id : uid(); seen.add(id);
  const o = { id, type: n.type, x: Math.round(num(n.x, 0)), y: Math.round(num(n.y, 0)), w: Math.round(num(n.w, DEF[n.type].w, 60, 4000)) };
  if (DEF[n.type].h) o.h = Math.round(num(n.h, DEF[n.type].h, 40, 4000));
  if (n.type === 'scene' || n.type === 'zone') o.title = str(n.title, 300);
  if (n.type !== 'zone') o.text = cleanHtml(n.text);
  if (isColor(n.color)) o.color = n.color;
  if (n.lock) o.lock = true;
  if (n.type === 'scene') {
    o.dur = r1(num(n.dur, 0, 0, 36000));
    for (const k of ['shot', 'move', 'trans']) if (n[k]) o[k] = str(n[k], 80);
    if (n.audio) o.audio = str(n.audio, 3000);
    if (STATUS[n.status]) o.status = n.status;
    if (RATIOS[n.ratio]) o.ratio = n.ratio;
    if (n.fit === 'contain') o.fit = 'contain';
    const m = normMedia(n.media); if (m) o.media = m;
  }
  if (n.type === 'step') o.shape = SHAPES.includes(n.shape) ? n.shape : 'rect';
  if (n.type === 'step' || n.type === 'note' || n.type === 'text') {
    if (SIZES.includes(n.size)) o.size = n.size;
    if (FONTS[n.font]) o.font = n.font;
    if (['left', 'center', 'right'].includes(n.align)) o.align = n.align;
  }
  return o;
}
function normEdge(e, ids, seen) {
  if (!e || !ids.has(e.from) || !ids.has(e.to) || e.from === e.to) return null;
  const id = okId(e.id) && !seen.has(e.id) ? e.id : uid(); seen.add(id);
  const side = s => SIDES.includes(s) ? s : 'auto';
  const o = { id, from: e.from, to: e.to, fs: side(e.fs), ts: side(e.ts), style: ['curve', 'straight', 'step'].includes(e.style) ? e.style : 'curve', width: num(e.width, 2, 1, 8), arrow: ['end', 'start', 'both', 'none'].includes(e.arrow) ? e.arrow : 'end', label: str(e.label, 200), dash: !!e.dash, flow: !!e.flow };
  if (isColor(e.color)) o.color = e.color;
  return o;
}
function normBoard(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.nodes)) throw new Error('format');
  const seen = new Set();
  const nodes = b.nodes.slice(0, 3000).map(n => normNode(n, seen)).filter(Boolean);
  const ids = new Set(nodes.map(n => n.id)), eseen = new Set();
  const edges = (Array.isArray(b.edges) ? b.edges : []).slice(0, 6000).map(e => normEdge(e, ids, eseen)).filter(Boolean);
  const o = { v: FORMAT, id: okId(b.id) ? b.id : uid(), title: str(b.title, 120) || 'Storyboard sans titre', created: num(b.created, Date.now()), updated: num(b.updated, Date.now()), nodes, edges };
  if (b.view && Number.isFinite(+b.view.z)) o.view = { x: num(b.view.x, 0), y: num(b.view.y, 0), z: clamp(+b.view.z, ZMIN, ZMAX) };
  return o;
}

/* ---------------- État ---------------- */
const S = {
  mode: 'edit',            // 'edit' : création · 'view' : consultation (lien ou fichier d'aperçu)
  source: '',              // 'link' | 'file' en consultation
  board: null,
  view: { x: 0, y: 0, z: 1 },
  sel: new Set(), edge: null, active: null,
  snap: lsGet('sf-snap') !== '0', wire: ['curve', 'straight', 'step'].includes(lsGet('sf-wire')) ? lsGet('sf-wire') : 'curve',
  hist: [], hi: 0,
  present: null, clip: null, editing: null, search: null, lb: null, fmtBusy: false
};
const els = new Map();     // id → élément affiché
const sizes = new Map();   // id → taille mesurée {w, h}
const urls = new Map();    // média local → adresse blob:
const igH = new Map();     // hauteur réelle des intégrations Instagram
const W = {};
const byId = id => S.board.nodes.find(n => n.id === id);
const srcOf = m => m.data || (m.local && urls.get(m.local)) || (m.kind !== 'embed' && m.kind !== 'link' && m.url) || '';
const posterOf = m => m.poster || (m.local && urls.get(m.local + '_p')) || '';
const labelOf = n => n.title || textOf(n.text).split('\n')[0].slice(0, 80) || TYPE_LABEL[n.type];
const edgesLater = raf(() => { renderEdges(); drawMinimap(); });
const RO = new ResizeObserver(entries => {
  let changed = false;
  for (const en of entries) {
    const el = en.target, id = el.dataset.id;
    if (!id || els.get(id) !== el) continue;
    const w = el.offsetWidth, hh = el.offsetHeight, s = sizes.get(id);
    if (!s || s.w !== w || s.h !== hh) { sizes.set(id, { w, h: hh }); changed = true; }
  }
  if (changed) edgesLater();
});

/* ---------------- Rendu des éléments ---------------- */
function renderAll() {
  if (!S.board) return;
  const ids = new Set(S.board.nodes.map(n => n.id));
  for (const [id, el] of els) if (!ids.has(id)) { RO.unobserve(el); el.remove(); els.delete(id); sizes.delete(id); }
  S.board.nodes.forEach((n, i) => renderNode(n, i));
  numberScenes();
  for (const n of S.board.nodes) { const el = els.get(n.id); sizes.set(n.id, { w: el.offsetWidth, h: el.offsetHeight }); }
  renderEdges();
  updateEmbeds();
  renderInspector(!W.insp.contains(document.activeElement));
  $('#empty').hidden = S.board.nodes.length > 0;
  updateDuration();
  drawMinimap();
}
function renderNode(n, i = S.board.nodes.indexOf(n)) {
  let el = els.get(n.id);
  const sig = n.type + ':' + (n.shape || '');
  if (el && el._sig !== sig) { RO.unobserve(el); el.remove(); els.delete(n.id); el = null; }
  if (!el) {
    el = buildNode(n); el._sig = sig;
    (n.type === 'zone' ? W.zones : W.nodes).append(el);
    els.set(n.id, el); RO.observe(el);
  }
  el.style.transform = `translate(${n.x}px,${n.y}px)`;
  el.style.width = n.w + 'px';
  el.style.height = n.h ? n.h + 'px' : '';
  el.style.zIndex = i + 1;
  el.style.setProperty('--c', n.color || DEFCOLOR[n.type] || '#94a3b8');
  el.classList.toggle('sel', S.sel.has(n.id));
  el.classList.toggle('active', S.active === n.id);
  el.classList.toggle('locked', !!n.lock);
  fillNode(el, n);
}
function buildNode(n) {
  const el = h('div', { class: 'node n-' + n.type + (n.shape ? ' s-' + n.shape : ''), 'data-id': n.id });
  if (n.type === 'scene') {
    el._num = h('span', { class: 'n-num' });
    el._t = h('div', { class: 'n-title', 'data-field': 'title' });
    el._st = h('span', { class: 'n-status' });
    el._d = h('span', { class: 'n-dur' });
    el._tools = h('span', { class: 'n-tools' });
    el.append(h('div', { class: 'n-head' }, el._num, el._t, el._st, el._d, el._tools));
    el._m = h('div', { class: 'n-media' });
    el._meta = h('div', { class: 'n-meta' });
    el._x = h('div', { class: 'n-notes rich', 'data-field': 'text' });
    el._a = h('div', { class: 'n-audio' });
    el.append(el._m, el._meta, el._x, el._a);
  } else if (n.type === 'zone') {
    el._t = h('div', { class: 'z-tab', 'data-field': 'title' });
    el.append(el._t);
  } else {
    if (n.shape === 'diamond') {
      const s = sv('svg', { class: 'shape', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      s.append(sv('path', { d: 'M50 1 99 50 50 99 1 50z', 'vector-effect': 'non-scaling-stroke' }));
      el.append(s);
    }
    el._x = h('div', { class: 'n-label rich', 'data-field': 'text' });
    el.append(el._x);
  }
  if (n.type !== 'zone') for (const s of SIDES) el.append(h('span', { class: 'port p-' + s, 'data-port': s, title: 'Glisser pour relier · cliquer pour créer la suite' }));
  el.append(h('span', { class: 'resize', 'data-resize': '1' }));
  return el;
}
const PH = { title: 'Titre de la scène', notes: 'Action, intention, notes…', step: 'Étape', note: 'Écrivez une note…', text: 'Votre texte', zone: 'Nom de la zone' };
function setPlain(t, v, ph) {
  if (!t || (S.editing && S.editing.el === t)) return;
  if (t._v !== v) { t.textContent = v; t._v = v; }
  t.classList.toggle('empty', !v); t.dataset.ph = ph;
}
function setRich(t, v, ph) {
  if (!t || (S.editing && S.editing.el === t)) return;
  if (t._v !== v) { t.innerHTML = v; t._v = v; }   // v vient toujours de cleanHtml
  t.classList.toggle('empty', !v); t.dataset.ph = ph;
}
function fillNode(el, n) {
  if (n.type === 'scene') {
    setPlain(el._t, n.title, PH.title);
    el._d.textContent = fmtDur(n.dur);
    const st = STATUS[n.status];
    el._st.hidden = !st;
    if (st) { el._st.textContent = st[0]; el._st.style.setProperty('--sc', st[1]); }
    const meta = [n.shot, n.move, n.trans && '→ ' + n.trans].filter(Boolean);
    el._meta.replaceChildren(...meta.map(t => h('span', { text: t })));
    el._meta.hidden = !meta.length;
    setRich(el._x, n.text, PH.notes);
    el._a.textContent = n.audio || ''; el._a.hidden = !n.audio;
    renderMedia(el, n);
  } else if (n.type === 'zone') setPlain(el._t, n.title, PH.zone);
  else {
    setRich(el._x, n.text, PH[n.type]);
    el.dataset.size = n.size || DEF_SIZE[n.type];
    el.dataset.font = n.font || DEF_FONT[n.type];
    el.dataset.align = n.align || (n.type === 'step' ? 'center' : 'left');
    if (n.type === 'text') el.style.setProperty('--tc', n.color || 'var(--fg)');
  }
}

/* ---------------- Médias dans les scènes ---------------- */
function frameRatio(n) {
  if (RATIOS[n.ratio]) return RATIOS[n.ratio];
  const m = n.media;
  if (!m) return 16 / 9;
  if (m.ratio) return m.ratio;
  if (m.kind === 'embed') return defaultRatio(m);
  return 16 / 9;
}
/* Le lecteur Instagram ajoute un en-tête et un pied autour de la vidéo */
const igExtra = w => Math.round(110 + w * 0.32);
function mediaHeight(n) {
  const m = n.media, iw = n.w - 18;
  if (m && m.kind === 'embed' && m.provider === 'instagram') {   // le cadre Instagram garde toujours sa hauteur réelle
    const k = igH.get(n.id);
    return k && Math.abs(k.w - iw) < 2 ? k.h : Math.round(iw / defaultRatio(m) + igExtra(iw));
  }
  return Math.round(iw / frameRatio(n));
}
const mediaKey = m => m ? [m.kind, m.local, m.url, m.id, m.data ? m.data.length : 0, m.poster ? 1 : 0, m.missing ? 1 : 0].join('|') : '';
function renderMedia(el, n) {
  const m = n.media, box = el._m;
  box.style.height = m && m.kind === 'link' ? '' : mediaHeight(n) + 'px';
  box.classList.toggle('contain', n.fit === 'contain');
  const key = mediaKey(m) + '|' + S.mode;
  if (el._mk === key) return;
  el._mk = key; el._frame = null;
  box.replaceChildren(); box.classList.remove('live');
  box.dataset.kind = m ? m.kind : 'empty';
  el._tools.replaceChildren();
  if (!m) {
    if (S.mode === 'edit') box.append(h('button', { class: 'm-empty', type: 'button', 'data-act': 'media' }, icon('image'), h('span', { text: 'Ajouter une image ou une vidéo' })));
    return;
  }
  if (m.kind !== 'link') el._tools.append(h('button', { class: 'nt', type: 'button', 'data-act': 'expand', title: 'Agrandir', 'aria-label': 'Agrandir' }, icon('expand')));
  if (m.url) el._tools.append(h('a', { class: 'nt', href: m.url, target: '_blank', rel: 'noopener', title: "Ouvrir l'original", 'aria-label': "Ouvrir l'original" }, icon('external')));
  box.append(...mediaParts(m));
}
const shield = () => h('div', { class: 'shield', title: 'Cliquer pour lire' }, h('span', { class: 'play' }, icon('play')));
function embedCover(m) {
  const p = PROV[m.provider] || { name: 'Vidéo', bg: '#111' };
  const c = h('div', { class: 'm-cover', style: 'background:' + p.bg }, h('span', { class: 'brand-tag', text: p.name }));
  if (!canEmbed(m)) {
    if (m.provider === 'tiktok' && !m.id) c.append(h('small', { text: "Lien court TikTok : ouvrez-le puis copiez l'adresse complète de la vidéo (…/video/…)." }));
    c.append(h('a', { class: 'btn sm light', href: m.url, target: '_blank', rel: 'noopener' }, icon('external'), h('span', { text: 'Ouvrir la vidéo' })));
  }
  return c;
}
function missingBox(m) {
  const box = h('div', { class: 'm-missing' });
  const p = posterOf(m);
  if (p) box.append(h('img', { src: p, alt: '' }));
  box.append(h('span', { text: m.kind === 'video' ? "Vidéo de l'appareil : visible dans le fichier d'aperçu" : "Image disponible dans le fichier d'aperçu" }));
  return box;
}
function mediaParts(m) {
  if (m.kind === 'image') { const src = srcOf(m); return [src ? h('img', { src, alt: '', draggable: 'false', decoding: 'async' }) : missingBox(m)]; }
  if (m.kind === 'video') {
    const src = srcOf(m);
    if (!src) return [missingBox(m)];
    return [h('video', { src, poster: posterOf(m) || null, controls: true, playsinline: true, preload: 'metadata' }), shield()];
  }
  if (m.kind === 'embed') return [embedCover(m), h('span', { class: 'm-badge', text: (PROV[m.provider] || {}).name || 'Vidéo' }), canEmbed(m) ? shield() : null].filter(Boolean);
  const p = PROV[m.provider];
  return [h('a', { class: 'm-link', href: m.url, target: '_blank', rel: 'noopener' }, icon('link'), h('span', {}, h('b', { text: p ? p.name : hostOf(m.url) }), h('small', { text: m.url })))];
}
function frameEl(m, opts) {
  const f = h('iframe', { src: embedSrc(m, opts), title: 'Vidéo ' + ((PROV[m.provider] || {}).name || ''), allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write', allowfullscreen: true, loading: 'lazy', referrerpolicy: 'strict-origin-when-cross-origin', frameborder: '0' });
  if (m.provider === 'instagram') { f.dataset.ig = '1'; if (opts && opts.noscroll) f.setAttribute('scrolling', 'no'); }
  return f;
}
/* Seuls les lecteurs visibles à l'écran sont chargés : le plan reste fluide même avec beaucoup de vidéos */
const embedsLater = debounce(() => updateEmbeds(), 140);
function updateEmbeds() {
  if (!S.board) return;
  const r = W.stage.getBoundingClientRect(), z = S.view.z;
  const x0 = -S.view.x / z, y0 = -S.view.y / z, x1 = x0 + r.width / z, y1 = y0 + r.height / z;
  const mx = (x1 - x0) * 0.5, my = (y1 - y0) * 0.5;
  for (const n of S.board.nodes) {
    const m = n.media;
    if (!m || m.kind !== 'embed' || !canEmbed(m)) continue;
    const el = els.get(n.id); if (!el) continue;
    const s = sizes.get(n.id) || { w: n.w, h: n.w };
    const vis = n.x < x1 + mx && n.x + s.w > x0 - mx && n.y < y1 + my && n.y + s.h > y0 - my && z * n.w >= 110;
    const want = !el._lbHold && (vis || S.active === n.id);
    if (want && !el._frame) {
      el._frame = frameEl(m, { width: n.w - 18, noscroll: true });
      el._m.append(el._frame); el._m.classList.add('live');
    } else if (!want && el._frame) { el._frame.remove(); el._frame = null; el._m.classList.remove('live'); }
  }
}
window.addEventListener('message', e => {
  if (e.origin !== 'https://www.instagram.com') return;
  let d = e.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
  const hh = d && d.type === 'MEASURE' && d.details && +d.details.height;
  if (!hh || hh < 100) return;
  for (const f of document.querySelectorAll('iframe[data-ig]')) {
    if (f.contentWindow !== e.source) continue;
    const node = f.closest('.node'), box = f.parentElement, height = Math.min(1600, Math.round(hh));
    if (node) { const n = byId(node.dataset.id); if (n) { igH.set(n.id, { w: n.w - 18, h: height }); box.style.height = height + 'px'; } }
    else if (box.classList.contains('lv-media')) box.style.height = height + 'px';
  }
});
function numberScenes() {
  let i = 0;
  for (const n of storyOrder()) if (n.type === 'scene') { const el = els.get(n.id); if (el) el._num.textContent = String(++i).padStart(2, '0'); }
}

/* ---------------- Fils ---------------- */
const f1 = v => Math.round(v * 10) / 10;
function rectOf(n) { const s = sizes.get(n.id) || { w: n.w, h: n.h || 120 }; return { x: n.x, y: n.y, w: s.w, h: s.h, cx: n.x + s.w / 2, cy: n.y + s.h / 2 }; }
function anchor(r, side) {
  if (side === 'top') return { x: r.cx, y: r.y };
  if (side === 'bottom') return { x: r.cx, y: r.y + r.h };
  if (side === 'left') return { x: r.x, y: r.cy };
  return { x: r.x + r.w, y: r.cy };
}
function autoSides(a, b) {
  const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (gx >= gy) return b.cx >= a.cx ? ['right', 'left'] : ['left', 'right'];
  return b.cy >= a.cy ? ['bottom', 'top'] : ['top', 'bottom'];
}
function nearestSide(r, p) {
  let best = 'right', bd = Infinity;
  for (const s of SIDES) { const q = anchor(r, s), d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = s; } }
  return best;
}
function edgeGeom(e, na, nb) {
  const a = rectOf(na), b = rectOf(nb);
  let fs = e.fs, ts = e.ts;
  if (fs === 'auto' && ts === 'auto') [fs, ts] = autoSides(a, b);
  else if (fs === 'auto') fs = nearestSide(a, anchor(b, ts));
  else if (ts === 'auto') ts = nearestSide(b, anchor(a, fs));
  return wirePath(anchor(a, fs), NORM[fs], anchor(b, ts), NORM[ts], e.style, e.arrow, e.width);
}
/* Tracé d'un fil : courbe, droit ou coudé. Le trait s'arrête sous la flèche. */
function wirePath(p0, n0, p1, n1, style, arrow, w) {
  const al = 9 + w * 1.6;
  const ae = arrow === 'end' || arrow === 'both', as = arrow === 'start' || arrow === 'both';
  let u1, u0;
  if (style === 'straight') { const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1; u1 = [dx / L, dy / L]; u0 = [-u1[0], -u1[1]]; }
  else { u1 = [-n1[0], -n1[1]]; u0 = [-n0[0], -n0[1]]; }
  const s0 = as ? { x: p0.x - u0[0] * al * 0.8, y: p0.y - u0[1] * al * 0.8 } : p0;
  const s1 = ae ? { x: p1.x - u1[0] * al * 0.8, y: p1.y - u1[1] * al * 0.8 } : p1;
  let d;
  if (style === 'straight') d = `M${f1(s0.x)} ${f1(s0.y)}L${f1(s1.x)} ${f1(s1.y)}`;
  else if (style === 'step') d = rounded(ortho(s0, n0, s1, n1), 12);
  else {
    const k = clamp(Math.hypot(p1.x - p0.x, p1.y - p0.y) * 0.42, 28, 240);
    d = `M${f1(s0.x)} ${f1(s0.y)}C${f1(s0.x + n0[0] * k)} ${f1(s0.y + n0[1] * k)} ${f1(s1.x + n1[0] * k)} ${f1(s1.y + n1[1] * k)} ${f1(s1.x)} ${f1(s1.y)}`;
  }
  return { d, p0, p1, u0, u1, mid: { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 } };
}
function ortho(a, na, b, nb) {
  const off = 22;
  const a1 = { x: a.x + na[0] * off, y: a.y + na[1] * off }, b1 = { x: b.x + nb[0] * off, y: b.y + nb[1] * off };
  const pts = [a, a1], ha = na[0] !== 0, hb = nb[0] !== 0;
  if (ha && hb) { const mx = (a1.x + b1.x) / 2; pts.push({ x: mx, y: a1.y }, { x: mx, y: b1.y }); }
  else if (!ha && !hb) { const my = (a1.y + b1.y) / 2; pts.push({ x: a1.x, y: my }, { x: b1.x, y: my }); }
  else if (ha) pts.push({ x: b1.x, y: a1.y });
  else pts.push({ x: a1.x, y: b1.y });
  pts.push(b1, b);
  return pts;
}
function rounded(pts, r) {
  const p = pts.filter((q, i) => i === 0 || Math.abs(q.x - pts[i - 1].x) > 0.5 || Math.abs(q.y - pts[i - 1].y) > 0.5);
  let d = `M${f1(p[0].x)} ${f1(p[0].y)}`;
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1], b = p[i], c = p[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y), rr = Math.min(r, l1 / 2, l2 / 2);
    const q1 = { x: b.x + (a.x - b.x) / l1 * rr, y: b.y + (a.y - b.y) / l1 * rr }, q2 = { x: b.x + (c.x - b.x) / l2 * rr, y: b.y + (c.y - b.y) / l2 * rr };
    d += `L${f1(q1.x)} ${f1(q1.y)}Q${f1(b.x)} ${f1(b.y)} ${f1(q2.x)} ${f1(q2.y)}`;
  }
  const z = p[p.length - 1];
  return d + `L${f1(z.x)} ${f1(z.y)}`;
}
function arrowD(p, u, w) {
  const L = 9 + w * 1.6, A = L * 0.55, bx = p.x - u[0] * L, by = p.y - u[1] * L;
  return `M${f1(p.x)} ${f1(p.y)}L${f1(bx - u[1] * A)} ${f1(by + u[0] * A)}L${f1(bx + u[1] * A)} ${f1(by - u[0] * A)}Z`;
}
function renderEdges() {
  if (!S.board) return;
  const map = new Map(S.board.nodes.map(n => [n.id, n]));
  const hot = S.present ? S.present.order[S.present.i].id : null;
  const frag = document.createDocumentFragment(), pending = [];
  for (const e of S.board.edges) {
    const a = map.get(e.from), b = map.get(e.to);
    if (!a || !b) continue;
    const g = edgeGeom(e, a, b), sel = S.edge === e.id, isHot = hot && (e.from === hot || e.to === hot);
    const ge = sv('g', { class: 'edge' + (sel ? ' sel' : '') + (e.flow ? ' flow' : '') + (e.dash ? ' dash' : '') + (isHot ? ' hot' : ''), 'data-edge': e.id, style: `--w:${e.width}px` + (e.color ? `;--ec:${e.color}` : '') });
    ge.append(sv('path', { class: 'e-hit', d: g.d }));
    if (sel) ge.append(sv('path', { class: 'e-glow', d: g.d }));
    const line = sv('path', { class: 'e-line', d: g.d });
    ge.append(line);
    if (e.arrow === 'end' || e.arrow === 'both') ge.append(sv('path', { class: 'e-arrow', d: arrowD(g.p1, g.u1, e.width) }));
    if (e.arrow === 'start' || e.arrow === 'both') ge.append(sv('path', { class: 'e-arrow', d: arrowD(g.p0, g.u0, e.width) }));
    frag.append(ge);
    if (e.label) pending.push([e, line, g, sel, isHot]);
  }
  W.edges.replaceChildren(frag);
  const labels = document.createDocumentFragment();
  for (const [e, line, g, sel, isHot] of pending) {
    let pt = g.mid;
    try { const L = line.getTotalLength(); if (L) pt = line.getPointAtLength(L / 2); } catch { /* reste au milieu */ }
    labels.append(h('div', { class: 'e-label' + (sel ? ' sel' : '') + (isHot ? ' hot' : ''), 'data-edge': e.id, style: `transform:translate(${f1(pt.x)}px,${f1(pt.y)}px) translate(-50%,-50%)` + (e.color ? `;--ec:${e.color}` : ''), text: e.label }));
  }
  W.labels.replaceChildren(labels);
}

/* ---------------- Caméra (déplacement, zoom) ---------------- */
const paintLater = raf(paintView);
function paintView() {
  const { x, y, z } = S.view;
  W.world.style.transform = `translate(${x}px,${y}px) scale(${z})`;
  let g = GRID * z; while (g < 14) g *= 5;
  W.stage.style.backgroundSize = `${g}px ${g}px`;
  W.stage.style.backgroundPosition = `${x}px ${y}px`;
  $('#btn-z100').textContent = Math.round(z * 100) + ' %';
  embedsLater(); viewSaveLater(); drawMinimap(); placeFmt();
}
const applyView = () => paintLater();
function toWorld(cx, cy) { const r = W.stage.getBoundingClientRect(); return { x: (cx - r.left - S.view.x) / S.view.z, y: (cy - r.top - S.view.y) / S.view.z }; }
function centerWorld() { const r = W.stage.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); }
function zoomAt(cx, cy, z) {
  z = clamp(z, ZMIN, ZMAX);
  const r = W.stage.getBoundingClientRect(), px = cx - r.left, py = cy - r.top;
  const wx = (px - S.view.x) / S.view.z, wy = (py - S.view.y) / S.view.z;
  S.view = { x: px - wx * z, y: py - wy * z, z };
  applyView();
}
function zoomBy(k) { const r = W.stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, S.view.z * k); }
function bounds(nodes) {
  if (!nodes.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) { const r = rectOf(n); x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y - (n.type === 'zone' ? 16 : 0)); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/* Cadre utile : on retire la barre du haut, les outils, les propriétés et la barre de présentation */
function viewFor(b, pad = 60, zmax = 1.2) {
  const r = W.stage.getBoundingClientRect(), small = narrow();
  const T = small ? 64 : 78, L = S.mode === 'edit' && !S.present && !small ? 70 : 12;
  const R = !W.insp.hidden && !small ? 330 : 12;
  const B = S.present ? (small ? 110 : 120) : (small && S.mode === 'edit' ? 76 : 12);
  const avW = Math.max(80, r.width - L - R - pad * 2), avH = Math.max(80, r.height - T - B - pad * 2);
  const z = clamp(Math.min(avW / Math.max(b.w, 1), avH / Math.max(b.h, 1)), ZMIN, zmax);
  return { z, x: L + pad + (avW - b.w * z) / 2 - b.x * z, y: T + pad + (avH - b.h * z) / 2 - b.y * z };
}
let animId = 0;
function go(v, animate = true) {
  cancelAnimationFrame(animId);
  if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { S.view = v; paintView(); return; }
  const a = { ...S.view }, t0 = performance.now(), D = 450;
  const step = t => {
    const k = Math.min(1, (t - t0) / D), e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
    S.view = { x: a.x + (v.x - a.x) * e, y: a.y + (v.y - a.y) * e, z: a.z + (v.z - a.z) * e };
    paintView();
    if (k < 1) animId = requestAnimationFrame(step);
  };
  animId = requestAnimationFrame(step);
}
function fit(animate = true) {
  const b = bounds(S.board.nodes);
  if (!b) { const r = W.stage.getBoundingClientRect(); go({ x: r.width / 2, y: r.height / 2, z: 1 }, animate); return; }
  go(viewFor(b), animate);
}
function focusNode(n, zmax = 1) { go(viewFor(rectOf(n), 80, Math.max(zmax, 0.4))); }

/* ---------------- Interactions au pointeur ---------------- */
let drag = null, spaceDown = false;
const pts = new Map();
function syncSel() {
  if (S.mode === 'edit' && !S.present) S.active = S.sel.size === 1 ? [...S.sel][0] : null;
  for (const [id, el] of els) { el.classList.toggle('sel', S.sel.has(id)); el.classList.toggle('active', S.active === id); }
  renderEdges(); renderInspector(true); updateEmbeds();
}
function clearSel() { if (S.editing) endEdit(true); S.sel.clear(); S.edge = null; syncSel(); }
function selectOnly(id) { S.sel = new Set([id]); S.edge = null; syncSel(); }
function selectEdge(id) { S.sel.clear(); S.edge = id; syncSel(); }
function setActive(id) {
  S.active = id;
  for (const [nid, el] of els) el.classList.toggle('active', nid === id);
  updateEmbeds();
}
function onDown(e) {
  if (e.button === 2) return;
  hideMenu();
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2) { endDrag(); startPinch(); return; }
  if (pts.size > 2 || drag) return;
  const t = e.target;
  if (t.closest('a, button, input, textarea, select, [contenteditable="true"]')) return;
  const nodeEl = t.closest('.node'), id = nodeEl ? nodeEl.dataset.id : null, n = id ? byId(id) : null;
  /* Lecteur actif : la vidéo garde la main (lecture, volume, plein écran) */
  if (n && S.active === id && t.closest('.n-media') && !t.closest('.shield')) return;
  if (e.button === 1 || spaceDown) { e.preventDefault(); startPan(e, {}); return; }
  if (S.mode === 'view' || S.present) { startPan(e, { tap: n ? id : null, clear: !n && !S.present }); return; }
  const port = t.closest('[data-port]');
  if (port && n) { e.preventDefault(); startConnect(e, n, port.dataset.port); return; }
  if (t.closest('[data-resize]') && n) { if (!n.lock) { e.preventDefault(); drag = { type: 'resize', sx: e.clientX, sy: e.clientY, n, w0: n.w, h0: n.h || 0 }; } return; }
  const edgeEl = t.closest('[data-edge]');
  if (edgeEl) { if (S.editing) endEdit(true); selectEdge(edgeEl.dataset.edge); startPan(e, {}); return; }
  if (n) {
    if (S.editing && S.editing.n !== n) endEdit(true);
    const multi = e.shiftKey || e.metaKey || e.ctrlKey;
    if (multi) { S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id); S.edge = null; syncSel(); }
    else if (!S.sel.has(id)) selectOnly(id);
    startMove(e, n, multi);
    return;
  }
  if (S.editing) endEdit(true);
  if (e.shiftKey) { drag = { type: 'marquee', sx: e.clientX, sy: e.clientY, base: new Set(S.sel) }; return; }
  startPan(e, { clear: true });
}
function startPan(e, o) { cancelAnimationFrame(animId); drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: S.view.x, vy: S.view.y, ...o }; W.stage.classList.add('panning'); }
function inside(z) {
  return S.board.nodes.filter(m => {
    if (m === z) return false;
    const r = rectOf(m);
    if (m.type === 'zone') return r.x >= z.x && r.y >= z.y && r.x + r.w <= z.x + z.w && r.y + r.h <= z.y + z.h;
    return r.cx > z.x && r.cx < z.x + z.w && r.cy > z.y && r.cy < z.y + z.h;
  });
}
function startMove(e, n, multi) {
  const nodes = new Map();
  for (const id of S.sel) { const m = byId(id); if (m && !m.lock) nodes.set(id, m); }
  for (const m of [...nodes.values()]) if (m.type === 'zone') for (const k of inside(m)) if (!k.lock) nodes.set(k.id, k);
  const orig = new Map([...nodes].map(([id, m]) => [id, { x: m.x, y: m.y }]));
  drag = { type: 'move', sx: e.clientX, sy: e.clientY, nodes, orig, lead: nodes.has(n.id) ? n.id : [...nodes.keys()][0], id: n.id, multi };
}
function startConnect(e, n, side) { drag = { type: 'connect', sx: e.clientX, sy: e.clientY, from: n, side, target: null, tside: 'auto' }; document.body.classList.add('connecting'); }
function startPinch() {
  const [a, b] = [...pts.values()];
  drag = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: { ...S.view } };
}
function onMove(e) {
  if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!drag) return;
  if (drag.type === 'pinch') {
    const [a, b] = [...pts.values()]; if (!b) return;
    const r = W.stage.getBoundingClientRect(), v0 = drag.v0;
    const z = clamp(v0.z * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0, ZMIN, ZMAX);
    const wx = (drag.m0.x - r.left - v0.x) / v0.z, wy = (drag.m0.y - r.top - v0.y) / v0.z;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    S.view = { z, x: mx - r.left - wx * z, y: my - r.top - wy * z };
    applyView(); return;
  }
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    if (drag.type !== 'pan') document.body.classList.add('dragging');
    if (drag.type === 'connect') document.body.classList.remove('dragging');
  }
  const z = S.view.z, grid = S.snap && !e.altKey;
  switch (drag.type) {
    case 'pan': S.view.x = drag.vx + dx; S.view.y = drag.vy + dy; applyView(); break;
    case 'move': {
      const o = drag.orig.get(drag.lead); if (!o) break;
      let nx = o.x + dx / z, ny = o.y + dy / z;
      if (grid) { nx = Math.round(nx / GRID) * GRID; ny = Math.round(ny / GRID) * GRID; }
      const ddx = nx - o.x, ddy = ny - o.y;
      for (const [id, p] of drag.orig) {
        const m = drag.nodes.get(id); m.x = Math.round(p.x + ddx); m.y = Math.round(p.y + ddy);
        const el = els.get(id); if (el) el.style.transform = `translate(${m.x}px,${m.y}px)`;
      }
      edgesLater(); break;
    }
    case 'resize': {
      const n = drag.n, min = n.type === 'zone' ? 200 : n.type === 'text' ? 80 : n.type === 'scene' ? 160 : 90;
      let w = drag.w0 + dx / z; if (grid) w = Math.round(w / GRID) * GRID;
      n.w = Math.round(Math.max(min, w));
      if (n.h) { let hh = drag.h0 + dy / z; if (grid) hh = Math.round(hh / GRID) * GRID; n.h = Math.round(Math.max(n.type === 'step' ? 40 : 60, hh)); if (e.shiftKey) n.h = n.w; }
      renderNode(n); edgesLater(); break;
    }
    case 'connect': {
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const tEl = hit && hit.closest('.node:not(.n-zone)');
      let tgt = tEl ? byId(tEl.dataset.id) : null;
      if (tgt === drag.from) tgt = null;
      if (drag.target !== tgt) {
        if (drag.target) els.get(drag.target.id)?.classList.remove('target');
        if (tgt) els.get(tgt.id)?.classList.add('target');
        drag.target = tgt;
      }
      const portEl = hit && hit.closest('[data-port]');
      drag.tside = tgt && portEl && tEl.contains(portEl) ? portEl.dataset.port : 'auto';
      drawTemp(drag.from, drag.side, toWorld(e.clientX, e.clientY), tgt, drag.tside);
      break;
    }
    case 'marquee': {
      const r = W.stage.getBoundingClientRect();
      const ax = Math.min(drag.sx, e.clientX), ay = Math.min(drag.sy, e.clientY), bx = Math.max(drag.sx, e.clientX), by = Math.max(drag.sy, e.clientY);
      Object.assign(W.marquee.style, { left: ax - r.left + 'px', top: ay - r.top + 'px', width: bx - ax + 'px', height: by - ay + 'px' });
      W.marquee.hidden = false;
      const a = toWorld(ax, ay), b = toWorld(bx, by), sel = new Set(drag.base);
      for (const n of S.board.nodes) {
        const q = rectOf(n);
        const hit = n.type === 'zone' ? q.x >= a.x && q.y >= a.y && q.x + q.w <= b.x && q.y + q.h <= b.y : q.x < b.x && q.x + q.w > a.x && q.y < b.y && q.y + q.h > a.y;
        if (hit) sel.add(n.id);
      }
      S.sel = sel;
      for (const [id, el] of els) el.classList.toggle('sel', sel.has(id));
      break;
    }
  }
}
function onUp(e, cancel) {
  pts.delete(e.pointerId);
  if (!drag) return;
  if (drag.type === 'pinch') { if (pts.size < 2) drag = null; return; }
  const d = drag; drag = null;
  document.body.classList.remove('dragging', 'connecting');
  W.stage.classList.remove('panning');
  switch (d.type) {
    case 'pan':
      if (!d.moved && !cancel) {
        if (d.tap) S.present ? presentGo(d.tap) : setActive(d.tap);
        else if (d.clear) S.mode === 'edit' ? clearSel() : setActive(null);
      }
      break;
    case 'move':
      if (d.moved) commit();
      else if (!d.multi && S.sel.size > 1) selectOnly(d.id);
      break;
    case 'resize': if (d.moved) commit(); break;
    case 'connect':
      W.temp.replaceChildren();
      if (d.target) els.get(d.target.id)?.classList.remove('target');
      if (cancel) break;
      if (!d.moved) { addNext(d.from, d.side); break; }
      if (d.target) { if (connect(d.from.id, d.target.id, d.side, d.tside)) commit(); }
      else quickMenu(e.clientX, e.clientY, toWorld(e.clientX, e.clientY), { from: d.from, side: d.side });
      break;
    case 'marquee': W.marquee.hidden = true; syncSel(); break;
  }
}
function endDrag() {
  if (!drag) return;
  const d = drag; drag = null;
  document.body.classList.remove('dragging', 'connecting');
  W.stage.classList.remove('panning'); W.temp.replaceChildren(); W.marquee.hidden = true;
  if ((d.type === 'move' || d.type === 'resize') && d.moved) commit();
}
function drawTemp(from, side, p, tgt, tside) {
  const a = rectOf(from), p0 = anchor(a, side);
  let p1 = p, n1 = [-NORM[side][0], -NORM[side][1]];
  if (tgt) { const r = rectOf(tgt), ts = tside !== 'auto' ? tside : nearestSide(r, p0); p1 = anchor(r, ts); n1 = NORM[ts]; }
  const g = wirePath(p0, NORM[side], p1, n1, S.wire, 'end', 2);
  W.temp.replaceChildren(sv('path', { class: 't-line', d: g.d }), sv('path', { class: 't-arrow', d: arrowD(g.p1, g.u1, 2) }));
}
function onWheel(e) {
  if (!S.board) return;
  e.preventDefault();
  const mouse = e.deltaMode === 1 || (!e.deltaX && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
  if (e.ctrlKey || e.metaKey || mouse) zoomAt(e.clientX, e.clientY, S.view.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016) * (e.deltaMode === 1 ? 30 : 1)));
  else { S.view.x -= e.deltaX; S.view.y -= e.deltaY; applyView(); }
}
function onDblClick(e) {
  if (S.mode !== 'edit' || S.present) return;
  const t = e.target, nodeEl = t.closest('.node');
  if (t.closest('a, button, input')) return;
  if (nodeEl) {
    const n = byId(nodeEl.dataset.id); if (!n) return;
    if (t.closest('.n-media')) { if (S.active === n.id && n.media && n.media.kind !== 'image') return; n.media ? openLightbox(n) : mediaChooser(n, e.clientX, e.clientY); return; }
    const f = t.closest('[data-field]');
    startEdit(n, f ? f.dataset.field : n.type === 'scene' || n.type === 'zone' ? 'title' : 'text');
    return;
  }
  const edgeEl = t.closest('[data-edge]');
  if (edgeEl) { selectEdge(edgeEl.dataset.edge); setTimeout(() => $('#insp-label')?.focus(), 30); return; }
  quickMenu(e.clientX, e.clientY, toWorld(e.clientX, e.clientY));
}
function onStageClick(e) {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const n = byId(a.closest('.node')?.dataset.id || ''); if (!n) return;
  e.stopPropagation();
  if (a.dataset.act === 'expand') openLightbox(n);
  else if (a.dataset.act === 'media' && S.mode === 'edit') { selectOnly(n.id); mediaChooser(n, e.clientX, e.clientY); }
}
function onContext(e) {
  if (S.mode !== 'edit' || S.present) return;
  if (e.target.closest('[contenteditable="true"], input, textarea')) return;
  e.preventDefault();
  const nodeEl = e.target.closest('.node'), edgeEl = e.target.closest('[data-edge]');
  if (nodeEl) {
    const n = byId(nodeEl.dataset.id); if (!n) return;
    if (!S.sel.has(n.id)) selectOnly(n.id);
    const items = [['edit', 'Écrire', () => startEdit(n, n.type === 'scene' || n.type === 'zone' ? 'title' : 'text')]];
    if (n.type === 'scene') items.push(n.media ? ['expand', 'Agrandir le média', () => openLightbox(n)] : ['image', 'Ajouter un média…', () => mediaChooser(n, e.clientX, e.clientY)]);
    items.push(['copy', 'Dupliquer', duplicateSel], ['front', 'Premier plan', () => reorder(1)], ['front', 'Arrière-plan', () => reorder(-1)],
      ['lock', n.lock ? 'Déverrouiller' : 'Verrouiller', () => { for (const id of S.sel) { const m = byId(id); if (m) m.lock = !n.lock || undefined; } commit(); }],
      ['play', 'Présenter à partir d’ici', () => startPresent(n.id)], 'sep', ['trash', 'Supprimer', deleteSel, 'danger']);
    showMenu(e.clientX, e.clientY, items);
  } else if (edgeEl) {
    const id = edgeEl.dataset.edge, ed = S.board.edges.find(x => x.id === id); if (!ed) return;
    selectEdge(id);
    showMenu(e.clientX, e.clientY, [
      ['edit', 'Écrire un libellé', () => setTimeout(() => $('#insp-label')?.focus(), 30)],
      ['curve', 'Courbe', () => { ed.style = 'curve'; commit(); }], ['straight', 'Droit', () => { ed.style = 'straight'; commit(); }], ['elbow', 'Coudé', () => { ed.style = 'step'; commit(); }],
      ['swap', 'Inverser le sens', () => { reverseEdge(ed); commit(); }], 'sep', ['trash', 'Supprimer le fil', deleteSel, 'danger']]);
  } else quickMenu(e.clientX, e.clientY, toWorld(e.clientX, e.clientY));
}

/* ---------------- Menus ---------------- */
function showMenu(x, y, items) {
  const m = W.menu; m.replaceChildren();
  for (const it of items) {
    if (!it) continue;
    if (it === 'sep') { m.append(h('hr')); continue; }
    const [ic, label, fn, cls] = it;
    m.append(h('button', { type: 'button', class: cls || null, onclick: () => { hideMenu(); fn(); } }, icon(ic), h('span', { text: label })));
  }
  m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = clamp(x, 8, innerWidth - r.width - 8) + 'px';
  m.style.top = clamp(y, 8, innerHeight - r.height - 8) + 'px';
}
function hideMenu() { if (W.menu) W.menu.hidden = true; }
function quickMenu(cx, cy, p, link) {
  const add = (type, o = {}) => () => {
    const n = makeNode(type, 0, 0, o), s = estSize(n);
    if (link) {
      const side = OPP[link.side];
      n.x = p.x - (side === 'left' ? 0 : side === 'right' ? s.w : s.w / 2);
      n.y = p.y - (side === 'top' ? 0 : side === 'bottom' ? s.h : s.h / 2);
    } else { n.x = p.x - s.w / 2; n.y = p.y - s.h / 2; }
    n.x = snapV(n.x); n.y = snapV(n.y);
    S.board.nodes.push(n);
    if (link) connect(link.from.id, n.id, link.side, OPP[link.side]);
    S.sel = new Set([n.id]); S.edge = null;
    commit();
    startEdit(n, n.type === 'scene' || n.type === 'zone' ? 'title' : 'text');
  };
  showMenu(cx, cy, [
    ['scene', 'Scène', add('scene')], ['step', 'Étape', add('step')], ['diamond', 'Décision', add('step', { shape: 'diamond' })],
    ['pill', 'Début / fin', add('step', { shape: 'pill' })], ['note', 'Note', add('note')], ['text', 'Texte', add('text')],
    ['link', 'Vidéo par lien…', () => openLinkDialog({ p, link })],
    ['upload', 'Image / vidéo de l’appareil…', () => pickFiles({ p, link })],
    !link && S.clip ? 'sep' : null, !link && S.clip ? ['copy', 'Coller ici', () => pasteNodes(S.clip, p)] : null,
    !link ? 'sep' : null, !link ? ['layout', 'Ranger tout le parcours', () => arrangeFlow()] : null, !link ? ['fit', 'Tout voir', () => fit()] : null
  ]);
}
function mediaChooser(n, x, y) {
  showMenu(x, y, [['link', 'Coller un lien vidéo (TikTok, Instagram…)', () => openLinkDialog({ target: n.id })], ['upload', "Importer depuis l'appareil", () => pickFiles({ target: n.id })]]);
}

/* ---------------- Écriture directe dans les éléments ---------------- */
let plainOnly = null;
function startEdit(n, field) {
  if (S.mode !== 'edit' || !n) return;
  if (S.editing) endEdit(true);
  const el = els.get(n.id); if (!el) return;
  const t = field === 'title' ? el._t : el._x; if (!t) return;
  const rich = t.classList.contains('rich');
  if (!S.sel.has(n.id) || S.sel.size > 1) selectOnly(n.id);
  S.editing = { n, field, el: t, rich };
  t.classList.remove('empty');
  if (rich) t.innerHTML = n[field] || ''; else t.textContent = n[field] || '';
  if (plainOnly === null) { const x = document.createElement('div'); try { x.contentEditable = 'plaintext-only'; plainOnly = x.contentEditable === 'plaintext-only'; } catch { plainOnly = false; } }
  t.contentEditable = rich || !plainOnly ? 'true' : 'plaintext-only';
  el.classList.add('editing');
  t.focus({ preventScroll: true });
  const r = document.createRange(); r.selectNodeContents(t);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  if (rich) showFmt(t);
}
function endEdit(save) {
  const ed = S.editing; if (!ed) return;
  S.editing = null;
  const { n, field, el: t, rich } = ed;
  t.contentEditable = 'false';
  t.closest('.node')?.classList.remove('editing');
  if (rich) hideFmt();
  t._v = null;
  if (save && byId(n.id)) {
    const v = rich ? cleanHtml(t.innerHTML) : t.textContent.replace(/\s+/g, ' ').trim().slice(0, 300);
    if (v !== (n[field] || '')) { n[field] = v; commit(); return; }
  }
  if (byId(n.id)) renderNode(n);
}

/* ---------------- Barre de mise en forme du texte ---------------- */
let fmtTarget = null;
const HILITE = 'rgba(251,191,36,.45)';
function buildFmt() {
  const f = W.fmt;
  const b = (cmd, label, inner, cls) => h('button', { type: 'button', 'data-cmd': cmd, title: label, 'aria-label': label, class: cls || null }, inner);
  const pop = h('div', { class: 'fmt-pop', hidden: true });
  for (const c of ['#fb7185', '#fb923c', '#fbbf24', '#4ade80', '#22d3ee', '#818cf8', '#c084fc', '#94a3b8']) pop.append(h('button', { type: 'button', class: 'sw', style: '--sw:' + c, 'data-color': c, title: c }));
  f.append(
    b('bold', 'Gras (Ctrl+B)', h('b', { text: 'B' })), b('italic', 'Italique (Ctrl+I)', h('i', { text: 'I', style: 'font-family:Georgia,serif' })),
    b('underline', 'Souligné (Ctrl+U)', h('u', { text: 'U' })), b('strikeThrough', 'Barré', h('s', { text: 'S' })),
    h('span', { class: 'fsep' }),
    b('hilite', 'Surligner', h('span', { class: 'fh', text: 'ab' })), b('color', 'Couleur du texte', h('span', { text: 'A' }), 'fc'),
    h('span', { class: 'fsep' }),
    b('insertUnorderedList', 'Liste à puces', h('span', { text: '•≡' })), b('insertOrderedList', 'Liste numérotée', h('span', { text: '1.' })),
    b('link', 'Ajouter un lien', icon('link')), b('removeFormat', 'Effacer la mise en forme', h('span', { text: 'T̸', style: 'font-weight:500' })),
    pop);
  f.addEventListener('pointerdown', e => e.preventDefault());
  f.addEventListener('mousedown', e => e.preventDefault());
  f.addEventListener('click', e => {
    const sw = e.target.closest('[data-color]');
    if (sw) { fmtCmd('color', sw.dataset.color); f.style.setProperty('--fcol', sw.dataset.color); pop.hidden = true; return; }
    const bt = e.target.closest('[data-cmd]'); if (!bt) return;
    if (bt.dataset.cmd === 'color') { pop.hidden = !pop.hidden; return; }
    fmtCmd(bt.dataset.cmd);
  });
}
function fmtCmd(cmd, val) {
  const ed = fmtTarget; if (!ed || document.activeElement !== ed) return;
  if (cmd === 'hilite' || cmd === 'color') {
    document.execCommand('styleWithCSS', false, true);
    if (cmd === 'hilite') {
      const cur = String(document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '');
      document.execCommand('hiliteColor', false, /251,\s*191,\s*36/.test(cur) ? 'transparent' : HILITE);
    } else document.execCommand('foreColor', false, val);
    document.execCommand('styleWithCSS', false, false);
  } else if (cmd === 'link') {
    const sel = getSelection(); const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    S.fmtBusy = true;
    const u = prompt('Adresse du lien (https://…)', 'https://');
    S.fmtBusy = false;
    ed.focus({ preventScroll: true });
    if (range) { sel.removeAllRanges(); sel.addRange(range); }
    const url = u && safeUrl(u.trim());
    if (!url) { if (u) toast('Adresse invalide'); return; }
    if (sel.isCollapsed) document.execCommand('insertText', false, url);
    if (!sel.isCollapsed || !range) document.execCommand('createLink', false, url);
    else { const r2 = document.createRange(); r2.setStart(range.startContainer, range.startOffset); sel.removeAllRanges(); sel.addRange(r2); }
  } else document.execCommand(cmd, false, null);
  ed.dispatchEvent(new Event('input', { bubbles: true }));
  fmtState();
}
function fmtState() {
  if (W.fmt.hidden) return;
  for (const c of ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList']) {
    const b = W.fmt.querySelector(`[data-cmd="${c}"]`);
    try { b.classList.toggle('on', document.queryCommandState(c)); } catch { /* non pris en charge */ }
  }
}
function showFmt(ed) { fmtTarget = ed; W.fmt.hidden = false; W.fmt.querySelector('.fmt-pop').hidden = true; placeFmt(); fmtState(); }
function hideFmt() { fmtTarget = null; W.fmt.hidden = true; }
function placeFmt() {
  if (!fmtTarget || W.fmt.hidden) return;
  const r = fmtTarget.getBoundingClientRect(), f = W.fmt.getBoundingClientRect();
  let top = r.top - f.height - 10;
  if (top < 72) top = Math.min(r.bottom + 10, innerHeight - f.height - 8);
  W.fmt.style.top = Math.max(8, top) + 'px';
  W.fmt.style.left = clamp(r.left + r.width / 2 - f.width / 2, 8, innerWidth - f.width - 8) + 'px';
}
document.addEventListener('selectionchange', () => { if (fmtTarget) fmtState(); });

/* ---------------- Opérations sur les éléments ---------------- */
const snapV = v => S.snap ? Math.round(v / GRID) * GRID : Math.round(v);
function makeNode(type, x, y, o = {}) {
  const base = { type, x, y };
  if (type === 'step') { const sh = SHAPES.includes(o.shape) ? o.shape : 'rect'; Object.assign(base, { shape: sh }, SHAPE_SIZE[sh]); }
  return normNode({ ...base, ...o, id: uid() }, new Set());
}
function estSize(n) {
  if (n.h) return { w: n.w, h: n.h };
  if (n.type === 'scene') return { w: n.w, h: 60 + (n.media && n.media.kind === 'link' ? 60 : mediaHeight(n)) + (n.text ? 50 : 30) };
  return { w: n.w, h: n.type === 'text' ? 60 : 80 };
}
function overlaps(r, except) {
  return S.board.nodes.some(m => {
    if (m.type === 'zone' || m === except) return false;
    const q = rectOf(m);
    return r.x < q.x + q.w + 16 && r.x + r.w + 16 > q.x && r.y < q.y + q.h + 16 && r.y + r.h + 16 > q.y;
  });
}
function placeBeside(n, from, side, gap = 80) {
  const r = rectOf(from), s = estSize(n), sameTop = n.type === 'scene' && from.type === 'scene';
  let x, y;
  if (side === 'right') { x = r.x + r.w + gap; y = sameTop ? r.y : r.cy - s.h / 2; }
  else if (side === 'left') { x = r.x - gap - s.w; y = sameTop ? r.y : r.cy - s.h / 2; }
  else if (side === 'bottom') { x = r.cx - s.w / 2; y = r.y + r.h + gap; }
  else { x = r.cx - s.w / 2; y = r.y - gap - s.h; }
  for (let k = 0; k < 14 && overlaps({ x, y, w: s.w, h: s.h }); k++) { if (side === 'left' || side === 'right') y += s.h + 40; else x += s.w + 40; }
  n.x = snapV(x); n.y = snapV(y);
}
function freeSpot(n, p) {
  const s = estSize(n); let x = p.x - s.w / 2, y = p.y - s.h / 2;
  for (let k = 0; k < 20 && overlaps({ x, y, w: s.w, h: s.h }); k++) { x += 40; y += 40; }
  n.x = snapV(x); n.y = snapV(y);
}
function connect(a, b, fs = 'auto', ts = 'auto', extra = {}) {
  if (a === b) return null;
  if (S.board.edges.some(e => e.from === a && e.to === b)) { toast('Ces éléments sont déjà reliés'); return null; }
  const src = byId(a);
  let label = '';
  if (src && src.type === 'step' && src.shape === 'diamond') label = ['Oui', 'Non'][S.board.edges.filter(e => e.from === a).length] || '';
  const e = { id: uid(), from: a, to: b, fs, ts, style: S.wire, width: 2, arrow: 'end', label, dash: false, flow: false, ...extra };
  S.board.edges.push(e);
  return e;
}
/* Clic sur un point : la suite est créée de ce côté, déjà reliée */
function addNext(from, side) {
  const type = from.type === 'text' || from.type === 'zone' ? 'scene' : from.type;
  const o = type === 'step' ? { shape: from.shape === 'diamond' || from.shape === 'pill' ? 'rect' : from.shape } : type === 'scene' ? { ratio: from.ratio, w: from.w } : type === 'note' ? { color: from.color } : {};
  const n = makeNode(type, 0, 0, o);
  placeBeside(n, from, side);
  S.board.nodes.push(n);
  connect(from.id, n.id, side, OPP[side]);
  S.sel = new Set([n.id]); S.edge = null;
  commit();
  startEdit(n, type === 'scene' ? 'title' : 'text');
}
function useTool(tool) {
  if (S.mode !== 'edit') return;
  if (S.present) stopPresent();
  if (tool === 'link') { openLinkDialog({}); return; }
  if (tool === 'file') { pickFiles({}); return; }
  if (tool === 'zone' && S.sel.size) { wrapZone(); return; }
  addTool(tool, centerWorld());
}
function addTool(tool, p) {
  const o = { decision: { shape: 'diamond', text: 'Question ?' }, start: { shape: 'pill', text: 'Début' } }[tool] || {};
  const type = tool === 'decision' || tool === 'start' ? 'step' : tool;
  if (!DEF[type]) return;
  const n = makeNode(type, 0, 0, o);
  freeSpot(n, p);
  S.board.nodes.push(n);
  if (type === 'zone') S.board.nodes.unshift(S.board.nodes.pop());
  S.sel = new Set([n.id]); S.edge = null;
  commit();
  startEdit(n, type === 'scene' || type === 'zone' ? 'title' : 'text');
}
function wrapZone() {
  const nodes = [...S.sel].map(byId).filter(Boolean);
  const b = bounds(nodes); if (!b) return;
  const z = makeNode('zone', snapV(b.x - 40), snapV(b.y - 60), { w: snapV(b.w + 80), h: snapV(b.h + 100), title: 'Section' });
  S.board.nodes.unshift(z);
  S.sel = new Set([z.id]); S.edge = null;
  commit();
  startEdit(z, 'title');
}
function deleteSel() {
  if (S.edge) { S.board.edges = S.board.edges.filter(e => e.id !== S.edge); S.edge = null; commit(); return; }
  if (!S.sel.size) return;
  const ids = S.sel;
  S.board.nodes = S.board.nodes.filter(n => !ids.has(n.id));
  S.board.edges = S.board.edges.filter(e => !ids.has(e.from) && !ids.has(e.to));
  S.sel = new Set();
  commit();
}
function clipOf(ids) {
  const nodes = S.board.nodes.filter(n => ids.has(n.id));
  return JSON.parse(JSON.stringify({ nodes, edges: S.board.edges.filter(e => ids.has(e.from) && ids.has(e.to)) }));
}
function pasteNodes(clip, p) {
  if (!clip || !Array.isArray(clip.nodes) || !clip.nodes.length) return;
  const map = new Map(), made = [];
  const b = bounds(clip.nodes.map(n => ({ ...n, id: '_' + n.id })));
  const dx = p ? p.x - (b.x + b.w / 2) : 40, dy = p ? p.y - (b.y + b.h / 2) : 40;
  for (const raw of clip.nodes) {
    const n = normNode({ ...raw, id: uid(), x: snapV((+raw.x || 0) + dx), y: snapV((+raw.y || 0) + dy) }, new Set());
    if (!n) continue;
    map.set(raw.id, n.id); made.push(n);
    if (n.type === 'zone') S.board.nodes.unshift(n); else S.board.nodes.push(n);
  }
  for (const e of clip.edges || []) if (map.has(e.from) && map.has(e.to)) S.board.edges.push({ ...e, id: uid(), from: map.get(e.from), to: map.get(e.to) });
  S.board.edges = S.board.edges.map(e => normEdge(e, new Set(S.board.nodes.map(n => n.id)), new Set())).filter(Boolean);
  S.sel = new Set(made.map(n => n.id)); S.edge = null;
  commit();
}
function duplicateSel() { if (S.sel.size) pasteNodes(clipOf(S.sel)); }
function reorder(dir) {
  const ids = S.sel; if (!ids.size) return;
  const picked = S.board.nodes.filter(n => ids.has(n.id)), rest = S.board.nodes.filter(n => !ids.has(n.id));
  S.board.nodes = dir > 0 ? [...rest, ...picked] : [...picked, ...rest];
  commit();
}
function reverseEdge(e) { [e.from, e.to] = [e.to, e.from]; [e.fs, e.ts] = [e.ts, e.fs]; }
const reading = (a, b) => Math.abs(a.y - b.y) < 60 ? a.x - b.x : a.y - b.y;
/* Ordre du parcours : on suit les fils depuis les points de départ, sinon l'ordre de lecture */
function storyOrder(withAll) {
  const nodes = S.board.nodes.filter(n => n.type !== 'zone' && (withAll || n.type !== 'text'));
  const ids = new Set(nodes.map(n => n.id)), byid = new Map(nodes.map(n => [n.id, n]));
  const out = new Map(), indeg = new Map(nodes.map(n => [n.id, 0]));
  for (const e of S.board.edges) if (ids.has(e.from) && ids.has(e.to)) { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(byid.get(e.to)); indeg.set(e.to, indeg.get(e.to) + 1); }
  const sorted = [...nodes].sort(reading), seen = new Set(), res = [];
  const stack = [];
  const visit = start => {
    stack.push(start);
    while (stack.length) {
      const n = stack.pop();
      if (seen.has(n.id)) continue;
      seen.add(n.id); res.push(n);
      const next = (out.get(n.id) || []).slice().sort(reading);
      for (let i = next.length - 1; i >= 0; i--) if (!seen.has(next[i].id)) stack.push(next[i]);
    }
  };
  for (const n of sorted) if (!indeg.get(n.id)) visit(n);
  for (const n of sorted) visit(n);
  return res;
}
function alignSel(how) {
  const nodes = [...S.sel].map(byId).filter(n => n && !n.lock); if (nodes.length < 2) return;
  const b = bounds(nodes);
  for (const n of nodes) {
    const r = rectOf(n);
    if (how === 'left') n.x = b.x; else if (how === 'right') n.x = Math.round(b.x + b.w - r.w); else if (how === 'center') n.x = Math.round(b.x + b.w / 2 - r.w / 2);
    else if (how === 'top') n.y = b.y; else if (how === 'bottom') n.y = Math.round(b.y + b.h - r.h); else if (how === 'middle') n.y = Math.round(b.y + b.h / 2 - r.h / 2);
  }
  commit();
}
function distributeSel(axis) {
  const nodes = [...S.sel].map(byId).filter(n => n && !n.lock); if (nodes.length < 3) { toast('Sélectionnez au moins 3 éléments'); return; }
  const H = axis === 'h', key = H ? 'x' : 'y', dim = H ? 'w' : 'h';
  nodes.sort((a, b) => a[key] - b[key]);
  const rs = nodes.map(rectOf), first = rs[0], last = rs[rs.length - 1];
  const total = rs.reduce((s, r) => s + r[dim], 0), gap = (last[key] + last[dim] - first[key] - total) / (nodes.length - 1);
  let pos = first[key];
  nodes.forEach((n, i) => { n[key] = Math.round(pos); pos += rs[i][dim] + gap; });
  commit();
}
function arrangeRow() {
  const nodes = [...S.sel].map(byId).filter(n => n && !n.lock && n.type !== 'zone').sort(reading); if (nodes.length < 2) return;
  const b = bounds(nodes); let x = b.x;
  for (const n of nodes) { n.x = snapV(x); n.y = b.y; x += rectOf(n).w + 60; }
  commit(); fit();
}
function arrangeGrid() {
  const nodes = [...S.sel].map(byId).filter(n => n && !n.lock && n.type !== 'zone').sort(reading); if (nodes.length < 2) return;
  const b = bounds(nodes), cols = Math.ceil(Math.sqrt(nodes.length)), cw = Math.max(...nodes.map(n => rectOf(n).w)) + 60;
  let y = b.y;
  for (let i = 0; i < nodes.length; i += cols) {
    const row = nodes.slice(i, i + cols); let rh = 0;
    row.forEach((n, j) => { n.x = snapV(b.x + j * cw); n.y = snapV(y); rh = Math.max(rh, rectOf(n).h); });
    y += rh + 60;
  }
  commit(); fit();
}
/* Rangement automatique du parcours en colonnes, de gauche à droite */
function arrangeFlow(ids) {
  const set = new Set(ids || S.board.nodes.map(n => n.id));
  const nodes = S.board.nodes.filter(n => set.has(n.id) && n.type !== 'zone' && n.type !== 'text' && !n.lock);
  if (nodes.length < 2) { toast('Rien à ranger'); return; }
  const keep = new Set(nodes.map(n => n.id)), b = bounds(nodes);
  const indeg = new Map(nodes.map(n => [n.id, 0])), out = new Map();
  const edges = S.board.edges.filter(e => keep.has(e.from) && keep.has(e.to));
  for (const e of edges) { indeg.set(e.to, indeg.get(e.to) + 1); if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(e.to); }
  const left = new Set(keep), depth = new Map(nodes.map(n => [n.id, 0])), topo = [];
  while (left.size) {
    let ready = [...left].filter(id => !indeg.get(id)).map(byId).sort(reading);
    if (!ready.length) ready = [[...left].map(byId).sort(reading)[0]];   // boucle : on la coupe
    for (const n of ready) {
      left.delete(n.id); topo.push(n);
      for (const t of out.get(n.id) || []) if (left.has(t)) { indeg.set(t, indeg.get(t) - 1); depth.set(t, Math.max(depth.get(t), depth.get(n.id) + 1)); }
    }
  }
  const cols = [];
  for (const n of topo) (cols[depth.get(n.id)] ||= []).push(n);
  const heights = cols.map(c => c ? c.reduce((s, n) => s + rectOf(n).h, 0) + (c.length - 1) * 60 : 0), maxH = Math.max(...heights);
  let x = b.x;
  cols.forEach((col, i) => {
    if (!col) return;
    let y = b.y + (maxH - heights[i]) / 2, w = 0;
    for (const n of col) { const r = rectOf(n); n.x = snapV(x); n.y = snapV(y); y += r.h + 60; w = Math.max(w, r.w); }
    x += w + 110;
  });
  commit(); fit();
}
function chainSel() {
  const nodes = [...S.sel].map(byId).filter(n => n && n.type !== 'zone').sort(reading); if (nodes.length < 2) return;
  let k = 0;
  for (let i = 1; i < nodes.length; i++) if (!S.board.edges.some(e => e.from === nodes[i - 1].id && e.to === nodes[i].id)) { const a = rectOf(nodes[i - 1]), b = rectOf(nodes[i]); const [fs, ts] = autoSides(a, b); S.board.edges.push({ id: uid(), from: nodes[i - 1].id, to: nodes[i].id, fs, ts, style: S.wire, width: 2, arrow: 'end', label: '', dash: false, flow: false }); k++; }
  commit(); toast(k ? `${k} fil${k > 1 ? 's' : ''} ajouté${k > 1 ? 's' : ''}` : 'Déjà reliés');
}

/* ---------------- Panneau des propriétés ---------------- */
let inspKey = '';
const fieldBox = (label, ...ctl) => h('div', { class: 'f' }, h('span', { class: 'f-l', text: label }), ...ctl);
function bindInput(n, key, attrs = {}, parse = v => v) {
  const tag = attrs.tag || 'input'; delete attrs.tag;
  const el = h(tag, { ...attrs, oninput: e => { n[key] = parse(e.target.value); if (n[key] === '' || n[key] === 0) delete n[key]; renderNode(n); edgesLater(); if (key === 'dur') updateDuration(); }, onchange: () => commit() });
  el.value = n[key] ?? '';
  return el;
}
function seg(options, cur, onpick) {
  const row = h('div', { class: 'seg' });
  for (const [v, label, ic] of options) {
    const b = h('button', { type: 'button', class: v === cur ? 'on' : null, title: label, 'aria-label': label, onclick: () => { for (const x of row.children) x.classList.toggle('on', x === b); onpick(v); } }, ic ? icon(ic) : label);
    row.append(b);
  }
  return row;
}
function swatches(cur, onpick, withNone) {
  const row = h('div', { class: 'swatches' });
  for (const c of withNone ? ['', ...COLORS] : COLORS) {
    const b = h('button', { type: 'button', class: 'sw' + (c ? '' : ' none') + ((cur || '') === c ? ' on' : ''), style: c ? '--sw:' + c : null, title: c || 'Par défaut', 'aria-label': c || 'Par défaut', onclick: () => { for (const x of row.children) x.classList.toggle('on', x === b); onpick(c); } });
    row.append(b);
  }
  return row;
}
function richEditor(n, key, ph) {
  const ed = h('div', { class: 'rich rich-input' + (n[key] ? '' : ' empty'), contenteditable: 'true', 'data-ph': ph, role: 'textbox', 'aria-multiline': 'true' });
  ed.innerHTML = n[key] || '';
  ed.addEventListener('input', () => { n[key] = cleanHtml(ed.innerHTML); ed.classList.toggle('empty', !n[key]); renderNode(n); edgesLater(); placeFmt(); });
  ed.addEventListener('focus', () => showFmt(ed));
  ed.addEventListener('blur', () => { if (S.fmtBusy) return; hideFmt(); commit(); });
  return ed;
}
const setAll = (nodes, fn) => { for (const n of nodes) fn(n); commit(); };
function headerFor(title, ic, n) {
  const acts = [btn('copy', 'Dupliquer (Ctrl+D)', duplicateSel), btn('lock', n && n.lock ? 'Déverrouiller' : 'Verrouiller (empêche de déplacer)', () => { const v = !(n && n.lock); for (const id of S.sel) { const m = byId(id); if (m) { if (v) m.lock = true; else delete m.lock; } } commit(); renderInspector(true); }), btn('trash', 'Supprimer (Suppr)', deleteSel)];
  if (n && n.lock) acts[1].classList.add('on');
  return h('div', { class: 'in-head' }, h('h3', {}, icon(ic), h('span', { text: title })), ...acts);
}
function renderInspector(force) {
  const box = W.insp;
  const key = S.mode !== 'edit' || S.present ? '' : S.edge ? 'e:' + S.edge : [...S.sel].join(',');
  if (!key) { box.hidden = true; inspKey = ''; document.body.classList.remove('insp-open'); return; }
  if (key === inspKey && !force) return;
  if (key === inspKey && box.contains(document.activeElement) && typing(document.activeElement)) return;
  inspKey = key;
  const st = box.scrollTop;
  box.replaceChildren(...(S.edge ? edgePanel() : S.sel.size > 1 ? multiPanel() : nodePanel(byId([...S.sel][0]))));
  box.hidden = !box.children.length;
  box.scrollTop = st;
  document.body.classList.toggle('insp-open', !box.hidden);
}
function nodePanel(n) {
  if (!n) return [];
  const out = [];
  const num = n.type === 'scene' ? (els.get(n.id)?._num.textContent || '') : '';
  const kind = n.type === 'step' ? { diamond: 'Décision', pill: 'Début / fin', circle: 'Étape', rect: 'Étape' }[n.shape] : TYPE_LABEL[n.type];
  out.push(headerFor(kind + (num ? ' ' + num : ''), { scene: 'scene', step: n.shape === 'diamond' ? 'diamond' : n.shape === 'pill' ? 'pill' : 'step', note: 'note', text: 'text', zone: 'zone' }[n.type], n));
  if (n.type === 'scene' || n.type === 'zone') out.push(fieldBox('Titre', bindInput(n, 'title', { maxlength: 300, placeholder: n.type === 'zone' ? 'Nom de la zone' : 'Titre de la scène' })));
  if (n.type === 'scene') {
    out.push(fieldBox('Média', ...mediaPanel(n)));
    out.push(h('div', { class: 'row' },
      fieldBox('Durée (s)', bindInput(n, 'dur', { type: 'number', min: 0, step: 0.5, placeholder: '0', inputmode: 'decimal' }, v => r1(num(v.replace(',', '.'), 0, 0, 36000)))),
      fieldBox('Statut', (() => { const s = h('select', { onchange: e => { if (e.target.value) n.status = e.target.value; else delete n.status; commit(); } }, h('option', { value: '', text: '—' }), ...Object.entries(STATUS).map(([k, v]) => h('option', { value: k, text: v[0] }))); s.value = n.status || ''; return s; })())));
    out.push(h('div', { class: 'row' }, fieldBox('Plan', bindInput(n, 'shot', { list: 'dl-shot', placeholder: 'Gros plan…', maxlength: 80 })), fieldBox('Mouvement', bindInput(n, 'move', { list: 'dl-move', placeholder: 'Fixe…', maxlength: 80 }))));
    out.push(fieldBox('Transition vers la suite', bindInput(n, 'trans', { list: 'dl-trans', placeholder: 'Cut, fondu…', maxlength: 80 })));
    out.push(fieldBox('Notes (texte mis en forme)', richEditor(n, 'text', 'Action, intention, détails…')));
    out.push(fieldBox('Son, voix off, dialogue', bindInput(n, 'audio', { tag: 'textarea', rows: 2, maxlength: 3000, placeholder: '« Réplique… », musique, bruitage…' })));
  }
  if (n.type === 'step' || n.type === 'note' || n.type === 'text') {
    out.push(fieldBox('Texte (sélectionnez pour mettre en forme)', richEditor(n, 'text', 'Écrivez ici…')));
    if (n.type === 'step') out.push(fieldBox('Forme', seg([['rect', 'Rectangle', 'step'], ['pill', 'Début / fin', 'pill'], ['diamond', 'Décision', 'diamond'], ['circle', 'Cercle', 'circle']], n.shape, v => { const old = SHAPE_SIZE[n.shape]; n.shape = v; if (old && n.w === old.w && n.h === old.h) Object.assign(n, SHAPE_SIZE[v]); commit(); })));
    out.push(fieldBox('Taille du texte', seg(SIZES.map(s => [s, s.toUpperCase()]), n.size || DEF_SIZE[n.type], v => { n.size = v; commit(); })));
    const font = h('select', { onchange: e => { n.font = e.target.value; commit(); } }, ...Object.entries(FONTS).map(([k, v]) => h('option', { value: k, text: v })));
    font.value = n.font || DEF_FONT[n.type];
    out.push(h('div', { class: 'row' }, fieldBox('Police', font), fieldBox('Alignement', seg([['left', 'À gauche', 'al-left'], ['center', 'Centré', 'al-center'], ['right', 'À droite', 'al-right']], n.align || (n.type === 'step' ? 'center' : 'left'), v => { n.align = v; commit(); }))));
  }
  out.push(fieldBox(n.type === 'text' ? 'Couleur du texte' : 'Couleur', swatches(n.color, c => { if (c) n.color = c; else delete n.color; commit(); }, n.type === 'text')));
  if (n.type === 'zone') out.push(h('p', { class: 'hint', text: 'Déplacez la zone par son étiquette : tout ce qu’elle contient suit.' }));
  if (n.type !== 'zone' && n.type !== 'text') out.push(h('div', { class: 'acts' }, h('button', { class: 'btn sm', type: 'button', onclick: () => startPresent(n.id) }, icon('play'), h('span', { text: 'Présenter d’ici' }))));
  return out;
}
function mediaPanel(n) {
  const m = n.media, out = [];
  if (!m) {
    out.push(h('div', { class: 'acts' },
      h('button', { class: 'btn sm', type: 'button', onclick: () => openLinkDialog({ target: n.id }) }, icon('link'), h('span', { text: 'Lien vidéo' })),
      h('button', { class: 'btn sm', type: 'button', onclick: () => pickFiles({ target: n.id }) }, icon('upload'), h('span', { text: 'Importer' }))));
    out.push(h('p', { class: 'hint', text: 'TikTok, Instagram, Facebook, YouTube, Vimeo, Drive… ou une image / vidéo de l’appareil.' }));
  } else {
    const p = PROV[m.provider];
    const what = m.kind === 'embed' ? 'Vidéo ' + (p ? p.name : '') : m.kind === 'link' ? 'Lien ' + (p ? p.name : hostOf(m.url)) : (m.kind === 'image' ? 'Image' : 'Vidéo') + (m.name ? ' · ' + m.name : m.url ? ' · ' + hostOf(m.url) : '');
    out.push(h('div', { class: 'media-info' }, icon(m.kind === 'image' ? 'image' : m.kind === 'link' ? 'link' : 'play'), h('span', { text: what })));
    out.push(h('div', { class: 'acts' },
      m.kind !== 'link' ? h('button', { class: 'btn sm', type: 'button', onclick: () => openLightbox(n) }, icon('expand'), h('span', { text: 'Agrandir' })) : null,
      h('button', { class: 'btn sm', type: 'button', onclick: e => mediaChooser(n, e.clientX, e.clientY) }, icon('swap'), h('span', { text: 'Remplacer' })),
      h('button', { class: 'btn sm', type: 'button', onclick: () => { delete n.media; igH.delete(n.id); commit(); renderInspector(true); } }, icon('trash'), h('span', { text: 'Retirer' }))));
  }
  if (!m || (m.kind !== 'link' && m.provider !== 'instagram')) {
    out.push(h('span', { class: 'f-l', text: 'Format de l’image', style: 'margin-top:4px' }));
    out.push(seg([['auto', 'Auto'], ['16:9', '16:9'], ['9:16', '9:16'], ['1:1', '1:1'], ['4:5', '4:5']], n.ratio || 'auto', v => { if (v === 'auto') delete n.ratio; else n.ratio = v; commit(); }));
    if (m && (m.kind === 'image' || m.kind === 'video')) out.push(seg([['cover', 'Remplir le cadre'], ['contain', 'Image entière']], n.fit || 'cover', v => { if (v === 'contain') n.fit = v; else delete n.fit; commit(); }));
  }
  return out;
}
function multiPanel() {
  const nodes = [...S.sel].map(byId).filter(Boolean);
  const T = (ic, label, fn) => btn(ic, label, fn);
  return [
    headerFor(nodes.length + ' éléments', 'gridl', null),
    fieldBox('Couleur', swatches('', c => setAll(nodes, n => { if (c) n.color = c; else delete n.color; }), true)),
    fieldBox('Aligner', h('div', { class: 'tools-grid' }, T('al-left', 'Aligner à gauche', () => alignSel('left')), T('al-center', 'Centrer horizontalement', () => alignSel('center')), T('al-right', 'Aligner à droite', () => alignSel('right')), T('dist-h', 'Répartir horizontalement', () => distributeSel('h')),
      T('al-top', 'Aligner en haut', () => alignSel('top')), T('al-middle', 'Centrer verticalement', () => alignSel('middle')), T('al-bottom', 'Aligner en bas', () => alignSel('bottom')), T('dist-v', 'Répartir verticalement', () => distributeSel('v')))),
    fieldBox('Ranger', h('div', { class: 'acts' },
      h('button', { class: 'btn sm', type: 'button', onclick: arrangeRow }, icon('row'), h('span', { text: 'En ligne' })),
      h('button', { class: 'btn sm', type: 'button', onclick: arrangeGrid }, icon('gridl'), h('span', { text: 'En grille' })),
      h('button', { class: 'btn sm', type: 'button', onclick: () => arrangeFlow([...S.sel]) }, icon('layout'), h('span', { text: 'Suivre les fils' })))),
    fieldBox('Relier', h('div', { class: 'acts' },
      h('button', { class: 'btn sm', type: 'button', onclick: chainSel }, icon('chain'), h('span', { text: 'Relier dans l’ordre' })),
      h('button', { class: 'btn sm', type: 'button', onclick: wrapZone }, icon('zone'), h('span', { text: 'Entourer d’une zone' }))))
  ];
}
function edgePanel() {
  const e = S.board.edges.find(x => x.id === S.edge); if (!e) return [];
  const label = h('input', { id: 'insp-label', maxlength: 200, placeholder: 'Oui, Non, Si clic… (facultatif)', oninput: ev => { e.label = ev.target.value; renderEdges(); }, onchange: () => commit() });
  label.value = e.label || '';
  const a = byId(e.from), b = byId(e.to);
  return [
    h('div', { class: 'in-head' }, h('h3', {}, icon('curve'), h('span', { text: 'Fil' })), btn('swap', 'Inverser le sens', () => { reverseEdge(e); commit(); }), btn('trash', 'Supprimer le fil', deleteSel)),
    h('p', { class: 'hint', text: (a ? labelOf(a) : '?') + '  →  ' + (b ? labelOf(b) : '?') }),
    fieldBox('Libellé', label),
    fieldBox('Tracé', seg([['curve', 'Courbe', 'curve'], ['straight', 'Droit', 'straight'], ['step', 'Coudé', 'elbow']], e.style, v => { e.style = v; commit(); })),
    fieldBox('Flèche', seg([['end', 'Vers la fin', null], ['start', 'Vers le début', null], ['both', 'Dans les deux sens', null], ['none', 'Sans flèche', null]].map(([v, l]) => [v, l === 'Vers la fin' ? '→' : l === 'Vers le début' ? '←' : l === 'Dans les deux sens' ? '↔' : '—']), e.arrow, v => { e.arrow = v; commit(); })),
    fieldBox('Trait', seg([['solid', 'Plein'], ['dash', 'Pointillé']], e.dash ? 'dash' : 'solid', v => { e.dash = v === 'dash'; commit(); })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: e.flow, onchange: ev => { e.flow = ev.target.checked; commit(); } }), h('span', { text: 'Fil animé (montre le sens du parcours)' })),
    fieldBox('Épaisseur', h('input', { type: 'range', min: 1, max: 6, step: 0.5, value: e.width, oninput: ev => { e.width = +ev.target.value; renderEdges(); }, onchange: () => commit() })),
    fieldBox('Couleur', swatches(e.color, c => { if (c) e.color = c; else delete e.color; commit(); }, true))
  ];
}

/* ---------------- Import des images et vidéos ---------------- */
async function imageInfo(blob) {
  const url = URL.createObjectURL(blob);
  try { const img = new Image(); img.src = url; await img.decode(); return { img, w: img.naturalWidth, h: img.naturalHeight }; }
  catch { return null; }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
async function canvasBlob(img, max, q) {
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, c.width, c.height);
  let b = await new Promise(r => c.toBlob(r, 'image/webp', q));
  if (!b || b.type !== 'image/webp') { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); b = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); }
  return b;
}
function videoInfo(blob) {
  return new Promise(res => {
    const v = document.createElement('video'), url = URL.createObjectURL(blob);
    let done = false;
    const fin = r => { if (done) return; done = true; clearTimeout(to); v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url); res(r); };
    const to = setTimeout(() => fin(null), 10000);
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadedmetadata = () => { const t = Math.min(1, (v.duration || 2) * 0.1); v.currentTime = Number.isFinite(t) ? t : 0; };
    v.onseeked = async () => {
      const w = v.videoWidth, hh = v.videoHeight;
      if (!w) return fin(null);
      try {
        const s = Math.min(1, 640 / w), c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(hh * s);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        const poster = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.78));
        fin({ w, h: hh, dur: v.duration, poster });
      } catch { fin({ w, h: hh, dur: v.duration }); }
    };
    v.onerror = () => fin(null);
    v.src = url;
  });
}
async function importFile(file) {
  const isVid = /^video\//.test(file.type) || (!file.type && /\.(mp4|mov|m4v|webm)$/i.test(file.name));
  const kind = /^image\//.test(file.type) ? 'image' : isVid ? 'video' : null;
  if (!kind) return null;
  const m = { kind, local: 'm' + uid(), name: file.name.slice(0, 200) };
  let blob = file;
  if (kind === 'image') {
    const info = await imageInfo(file);
    if (!info) return null;
    m.ratio = info.w / info.h;
    if (file.size > 3e6 && !/gif|svg/.test(file.type)) blob = await canvasBlob(info.img, 2400, 0.86) || file;
  } else {
    const info = await videoInfo(file);
    if (info) { m.ratio = info.w / info.h; if (info.dur && Number.isFinite(info.dur)) m._dur = r1(info.dur); if (info.poster) { await DB.put('media', m.local + '_p', info.poster); urls.set(m.local + '_p', URL.createObjectURL(info.poster)); } }
    if (!file.type) blob = new Blob([file], { type: 'video/mp4' });
  }
  await DB.put('media', m.local, blob);
  urls.set(m.local, URL.createObjectURL(blob));
  return m;
}
let fileCtx = {};
function pickFiles(ctx) { fileCtx = ctx || {}; const i = $('#file-media'); i.value = ''; i.click(); }
async function addFiles(files, ctx = {}) {
  const list = [...files].filter(f => /^(image|video)\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name)).slice(0, 40);
  if (!list.length) { toast('Formats acceptés : images et vidéos'); return; }
  toast(list.length > 1 ? `Import de ${list.length} fichiers…` : 'Import en cours…', 30000);
  const medias = [];
  for (const f of list) { try { const m = await importFile(f); if (m) medias.push(m); } catch (e) { console.warn(e); } }
  if (!medias.length) { toast("Aucun fichier n'a pu être importé (format non lu par ce navigateur ?)"); return; }
  toast(medias.length > 1 ? `${medias.length} médias ajoutés` : 'Média ajouté');
  applyMedia(medias, ctx);
}
function sceneFor(m) {
  const r = m.ratio || (m.kind === 'embed' ? defaultRatio(m) : 16 / 9), p = PROV[m.provider];
  const title = m.name ? m.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80) : p ? (m.kind === 'link' ? 'Lien ' : 'Vidéo ') + p.name : m.kind === 'image' ? 'Image' : m.kind === 'link' ? hostOf(m.url) : 'Vidéo';
  return makeNode('scene', 0, 0, { w: r < 0.8 ? 240 : r > 1.2 ? 320 : 280, media: m, title, dur: m._dur || 0 });
}
function applyMedia(medias, ctx = {}) {
  const t = ctx.target && byId(ctx.target);
  if (t) {
    t.media = normMedia(medias[0]);
    if (medias[0]._dur && !t.dur) t.dur = medias[0]._dur;
    igH.delete(t.id);
    if (medias.length > 1) { const rest = medias.slice(1).map(sceneFor); let prev = t; for (const n of rest) { placeBeside(n, prev, 'right'); S.board.nodes.push(n); connect(prev.id, n.id, 'right', 'left'); prev = n; } }
    commit(); renderInspector(true);
    return;
  }
  const made = medias.map(sceneFor);
  if (ctx.link) {
    placeBeside(made[0], ctx.link.from, ctx.link.side, 40);
    if (ctx.p) { const s = estSize(made[0]), side = OPP[ctx.link.side]; made[0].x = snapV(ctx.p.x - (side === 'left' ? 0 : side === 'right' ? s.w : s.w / 2)); made[0].y = snapV(ctx.p.y - (side === 'top' ? 0 : side === 'bottom' ? s.h : s.h / 2)); }
  } else {
    const p = ctx.p || centerWorld(), total = made.reduce((s, n) => s + n.w + 80, -80);
    let x = p.x - total / 2;
    for (const n of made) { n.x = snapV(x); n.y = snapV(p.y - estSize(n).h / 2); x += n.w + 80; }
    /* Si la place est prise, la rangée descend jusqu'à un endroit libre */
    for (let k = 0; k < 30 && made.some(n => overlaps({ x: n.x, y: n.y, ...estSize(n) })); k++) for (const n of made) n.y += 60;
  }
  for (const n of made) S.board.nodes.push(n);
  if (ctx.link) connect(ctx.link.from.id, made[0].id, ctx.link.side, OPP[ctx.link.side]);
  for (let i = 1; i < made.length; i++) connect(made[i - 1].id, made[i].id, 'right', 'left');
  S.sel = new Set(made.map(n => n.id)); S.edge = null;
  commit();
  if (made.length > 1) fit();
}

/* ---------------- Ajout par lien ---------------- */
let linkCtx = {};
function openLinkDialog(ctx, preset = '') {
  linkCtx = ctx || {};
  const d = $('#dlg-link'); $('#link-input').value = preset; detectLink();
  $('#link-ok').disabled = false; $('#link-ok').textContent = 'Ajouter';
  d.showModal(); $('#link-input').focus();
}
function detectLink() {
  const v = $('#link-input').value.trim(), box = $('#link-detect');
  box.replaceChildren();
  if (!v) return;
  const L = parseLink(v);
  if (!L) { box.append(h('span', { class: 'bad', text: "Ce n'est pas une adresse web valide (elle doit commencer par https://)." })); return; }
  const p = PROV[L.provider];
  if (p) box.append(h('span', { class: 'pv', style: 'background:' + p.bg, text: p.name }));
  let msg;
  if (L.kind === 'embed') msg = L.provider === 'tiktok' && !L.id ? 'Lien court TikTok : la vidéo va être recherchée.' : L.provider === 'facebook' && L.sub === 'post' ? 'Publication Facebook : elle sera affichée telle quelle.' : 'Vidéo reconnue : elle sera lisible directement dans le storyboard.';
  else if (L.kind === 'image') msg = 'Image en ligne.';
  else if (L.kind === 'video') msg = 'Fichier vidéo en ligne.';
  else msg = L.provider === 'instagram' ? 'Lien Instagram : seuls les reels et les publications (/reel/…, /p/…) s’affichent. Sinon une carte cliquable sera créée.' : 'Lien simple : une carte cliquable sera créée.';
  box.append(h('span', { text: msg }));
}
async function submitLink(e) {
  e.preventDefault();
  const v = $('#link-input').value.trim(); if (!v) return;
  const ok = $('#link-ok'); ok.disabled = true; ok.textContent = 'Recherche…';
  const m = await mediaFromLink(v);
  ok.disabled = false; ok.textContent = 'Ajouter';
  if (!m) { detectLink(); return; }
  $('#dlg-link').close();
  if (m.provider === 'tiktok' && !m.id) toast("Lien court TikTok non résolu : ouvrez-le et copiez l'adresse complète de la vidéo.", 5000);
  applyMedia([m], linkCtx);
}

/* ---------------- Historique et enregistrement ---------------- */
const snapshot = () => JSON.stringify([S.board.title, S.board.nodes, S.board.edges]);
function commit() {
  if (!S.board) return;
  const s = snapshot();
  if (s !== S.hist[S.hi]) {
    S.hist.length = S.hi + 1; S.hist.push(s);
    if (S.hist.length > 150) S.hist.shift();
    S.hi = S.hist.length - 1;
    saveLater();
  }
  renderAll(); updateUndo();
}
function restore(i) {
  if (S.editing) endEdit(false);
  const [title, nodes, edges] = JSON.parse(S.hist[i]);
  S.hi = i; S.board.title = title; S.board.nodes = nodes; S.board.edges = edges;
  $('#title').value = title;
  S.sel = new Set([...S.sel].filter(id => nodes.some(n => n.id === id)));
  if (S.edge && !edges.some(e => e.id === S.edge)) S.edge = null;
  for (const el of els.values()) el._mk = null;
  renderAll(); renderInspector(true); updateUndo(); saveLater();
}
const undo = () => { if (S.hi > 0) restore(S.hi - 1); };
const redo = () => { if (S.hi < S.hist.length - 1) restore(S.hi + 1); };
function updateUndo() { $('#btn-undo').disabled = S.hi <= 0; $('#btn-redo').disabled = S.hi >= S.hist.length - 1; }
async function saveNow(viewOnly) {
  if (S.mode !== 'edit' || !S.board) return;
  if (!viewOnly) S.board.updated = Date.now();
  S.board.view = { ...S.view };
  try { await DB.put('boards', S.board.id, S.board); }
  catch (e) { toast("Enregistrement impossible : l'espace du navigateur est peut-être plein.", 5000); }
}
const saveLater = debounce(() => saveNow(false), 500);
const viewSaveLater = debounce(() => saveNow(true), 1500);
function updateDuration() {
  const total = S.board.nodes.reduce((s, n) => s + (n.type === 'scene' ? n.dur || 0 : 0), 0), chip = $('#dur-chip');
  chip.hidden = !total;
  if (total) chip.replaceChildren(icon('clock'), h('span', { text: tc(total) }));
}

/* ---------------- Mes storyboards ---------------- */
async function loadMedia(b) {
  for (const n of b.nodes) {
    const m = n.media; if (!m || !m.local || urls.has(m.local)) continue;
    const blob = await DB.get('media', m.local); if (blob) urls.set(m.local, URL.createObjectURL(blob));
    const p = await DB.get('media', m.local + '_p'); if (p) urls.set(m.local + '_p', URL.createObjectURL(p));
  }
}
async function openBoard(raw, fresh) {
  if (S.board && S.mode === 'edit') await saveNow(false);
  if (S.present) stopPresent();
  if (S.editing) endEdit(true);
  const b = normBoard(raw);
  await loadMedia(b);
  for (const el of els.values()) { RO.unobserve(el); el.remove(); }
  els.clear(); sizes.clear(); igH.clear();
  S.board = b; S.sel = new Set(); S.edge = null; S.active = null;
  S.hist = [snapshot()]; S.hi = 0; updateUndo();
  $('#title').value = b.title;
  document.title = b.title + ' — Storyfil';
  renderAll();
  if (b.view && !fresh) { S.view = { ...b.view }; paintView(); } else fit(false);
  await DB.put('boards', b.id, b); await DB.put('kv', 'last', b.id);
}
/* Les fichiers des médias supprimés partout sont effacés au démarrage */
async function gcMedia() {
  try {
    const used = new Set();
    for (const b of await DB.all('boards')) for (const n of b.nodes || []) if (n.media && n.media.local) { used.add(n.media.local); used.add(n.media.local + '_p'); }
    for (const k of await DB.keys('media')) if (!used.has(k)) await DB.del('media', k);
  } catch { /* sans gravité */ }
}
async function openDrawer() { await renderBoards(); $('#drawer').classList.add('open'); $('#drawer-scrim').hidden = false; }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-scrim').hidden = true; }
async function renderBoards() {
  await saveNow(true);
  const list = (await DB.all('boards')).sort((a, b) => (b.updated || 0) - (a.updated || 0)), box = $('#dr-list');
  box.replaceChildren();
  for (const b of list) {
    const cur = b.id === S.board.id, scenes = (b.nodes || []).filter(n => n.type === 'scene').length;
    box.append(h('div', { class: 'bd' + (cur ? ' cur' : '') },
      h('button', { class: 'bd-open', type: 'button', onclick: () => { closeDrawer(); if (!cur) openBoard(b); } }, h('b', { text: b.title || 'Sans titre' }), h('small', { text: `${scenes} scène${scenes > 1 ? 's' : ''} · ${(b.nodes || []).length} éléments · ${fmtDate(b.updated)}` })),
      btn('copy', 'Dupliquer', () => duplicateBoard(b)), btn('trash', 'Supprimer', () => deleteBoard(b))));
  }
}
async function duplicateBoard(b) {
  const c = normBoard({ ...JSON.parse(JSON.stringify(b)), id: uid(), title: (b.title || 'Storyboard') + ' (copie)', created: Date.now(), updated: Date.now() });
  await DB.put('boards', c.id, c); renderBoards(); toast('Copie créée');
}
function confirmBox(msg, ok = 'Supprimer') {
  const d = $('#dlg-confirm'); $('#confirm-msg').textContent = msg; $('#confirm-yes').textContent = ok;
  d.returnValue = ''; d.showModal();
  return new Promise(res => d.addEventListener('close', () => res(d.returnValue === 'yes'), { once: true }));
}
async function deleteBoard(b) {
  if (!await confirmBox(`Supprimer « ${b.title || 'Sans titre'} » ? Cette action est définitive.`)) return;
  await DB.del('boards', b.id);
  if (b.id === S.board.id) {
    const rest = (await DB.all('boards')).sort((x, y) => (y.updated || 0) - (x.updated || 0));
    S.board = null;
    await openBoard(rest[0] || makeBoard('blank', 'Nouveau storyboard'));
  }
  renderBoards();
}
function makeBoard(tpl, title) {
  const b = { id: uid(), title: title || { story: 'Storyboard vidéo', process: 'Process', social: 'Parcours réseaux sociaux' }[tpl] || 'Nouveau storyboard', created: Date.now(), updated: Date.now(), nodes: [], edges: [] };
  const N = (type, x, y, o) => { const n = makeNode(type, x, y, o); if (type === 'zone') b.nodes.unshift(n); else b.nodes.push(n); return n; };
  const E = (a, c, o = {}) => b.edges.push({ id: uid(), from: a.id, to: c.id, fs: o.fs || 'auto', ts: o.ts || 'auto', style: o.style || 'curve', width: 2, arrow: 'end', label: o.label || '', dash: !!o.dash, flow: !!o.flow, color: o.color });
  if (tpl === 'story') {
    N('text', 0, -150, { text: '<b>Storyboard</b> — ma vidéo', size: 'xl', w: 900 });
    N('text', 0, -76, { text: 'Une scène par plan, reliées dans l’ordre. Ajoutez une image, une vidéo de l’appareil ou un lien TikTok / Instagram / Facebook dans chaque cadre.', size: 's', font: 'body', w: 900 });
    const rows = [['Accroche', 3, 'Gros plan', 'Fixe', 'Une phrase choc ou une image forte <b>dans les 3 premières secondes</b>.'], ['Le problème', 5, 'Plan rapproché', 'Caméra épaule', 'Montrer la situation que vit la personne visée.'], ['La solution', 8, 'Plan moyen', 'Travelling avant', 'Le produit ou le service <i>en action</i>.'], ['La preuve', 6, 'Insert (détail)', 'Fixe', 'Résultat, avis client, avant / après.'], ['Appel à l’action', 3, 'Plan rapproché', 'Zoom avant', '<b>Lien en bio</b>, code promo, abonnement…']];
    let prev;
    rows.forEach(([title, dur, shot, move, text], i) => {
      const s = N('scene', i * 340, 0, { title, dur, shot, move, text, trans: i < 4 ? 'Cut' : '', status: i === 0 ? 'wip' : 'todo' });
      if (prev) E(prev, s, { fs: 'right', ts: 'left', flow: i === 1 }); prev = s;
    });
    N('note', 0, 420, { text: '<b>Musique</b> : rythme rapide, montée sur l’appel à l’action.<br>Sous-titres <u>obligatoires</u> (lecture sans le son).', w: 320, h: 140, font: 'hand', size: 'm' });
  } else if (tpl === 'process') {
    N('text', 0, -110, { text: '<b>Process</b> de production', size: 'l', w: 700 });
    const a = N('step', 0, 48, { shape: 'pill', text: 'Début' });
    const brief = N('step', 260, 40, { text: 'Brief du client' });
    const ok = N('step', 540, 20, { shape: 'diamond', text: 'Validé ?' });
    const shoot = N('step', 800, 40, { text: 'Tournage' });
    const cut = N('step', 1080, 40, { text: 'Montage' });
    const end = N('step', 1360, 48, { shape: 'pill', text: 'Livraison', color: '#4ade80' });
    const fix = N('step', 530, 260, { text: 'Ajustements', color: '#fb923c' });
    E(a, brief, { fs: 'right', ts: 'left' }); E(brief, ok, { fs: 'right', ts: 'left' }); E(ok, shoot, { fs: 'right', ts: 'left', label: 'Oui', flow: true });
    E(shoot, cut, { fs: 'right', ts: 'left' }); E(cut, end, { fs: 'right', ts: 'left' });
    E(ok, fix, { fs: 'bottom', ts: 'top', label: 'Non', color: '#fb923c' });
    E(fix, brief, { fs: 'left', ts: 'bottom', style: 'step', dash: true, label: 'Nouvelle version' });
  } else if (tpl === 'social') {
    N('text', -40, -170, { text: '<b>Parcours</b> réseaux sociaux', size: 'l', w: 800 });
    N('zone', -40, -70, { title: 'Contenus', w: 900, h: 590, color: '#c084fc' });
    const vids = [['Vidéo TikTok', 'tiktok'], ['Reel Instagram', 'instagram'], ['Vidéo Facebook', 'facebook']].map(([title], i) => N('scene', i * 290, 0, { title, ratio: '9:16', w: 240, text: i === 0 ? 'Collez le lien de la vidéo : elle se lit directement ici.' : '' }));
    const lp = N('step', 310, 660, { text: 'Page de vente' });
    const buy = N('step', 640, 668, { shape: 'pill', text: 'Achat', color: '#4ade80' });
    vids.forEach(v => E(v, lp, { fs: 'bottom', ts: 'top', flow: true }));
    E(lp, buy, { fs: 'right', ts: 'left', label: 'Clic' });
  }
  return normBoard(b);
}
async function importProject(file) {
  try {
    const txt = await file.text(), j = JSON.parse(txt);
    const b = await localizeBoard(j.board || j);
    b.id = uid(); b.updated = Date.now();
    await DB.put('boards', b.id, b);
    closeDrawer();
    await openBoard(b);
    toast('Storyboard ouvert');
  } catch (e) { console.warn(e); toast("Ce fichier n'est pas un projet Storyfil valide."); }
}
/* Médias intégrés (data:) → fichiers locaux du navigateur */
async function localizeBoard(raw) {
  const b = normBoard(raw);
  for (const n of b.nodes) {
    const m = n.media; if (!m) continue;
    if (m.data) { const id = 'm' + uid(); await DB.put('media', id, await dataToBlob(m.data)); if (m.poster) await DB.put('media', id + '_p', await dataToBlob(m.poster)); m.local = id; delete m.data; delete m.poster; delete m.missing; }
    else if (m.poster && m.local) delete m.poster;
  }
  return b;
}

/* ---------------- Partage ---------------- */
const b64u = {
  enc(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
};
async function readAll(stream, cap) {
  const rd = stream.getReader(), parts = []; let size = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    size += value.length;
    if (size > cap) { rd.cancel(); throw new Error('trop volumineux'); }
    parts.push(value);
  }
  return new Uint8Array(await new Blob(parts).arrayBuffer());
}
async function encodeShare(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj, (k, v) => v === '' || v === false || v === null ? undefined : v));
  if (window.CompressionStream) return 'z' + b64u.enc(await readAll(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw')), 1e8));
  return 'j' + b64u.enc(raw);
}
async function decodeShare(s) {
  const bytes = b64u.dec(s.slice(1));
  const raw = s[0] === 'z' ? await readAll(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')), 4e7) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}
const shareBase = () => /^https?:$/.test(location.protocol) ? location.origin + location.pathname : PUBLIC_URL;
async function shareBoard(thumbs) {
  const b = JSON.parse(JSON.stringify({ v: FORMAT, title: S.board.title, nodes: S.board.nodes, edges: S.board.edges }));
  let local = 0, imgs = 0;
  for (const n of b.nodes) {
    const m = n.media; if (!m || !m.local) continue;
    if (thumbs) {
      if (m.kind === 'image') { const blob = await DB.get('media', m.local), info = blob && await imageInfo(blob); if (info) { m.data = await blobToData(await canvasBlob(info.img, 360, 0.6)); imgs++; } else m.missing = true; }
      else { const p = await DB.get('media', m.local + '_p'), info = p && await imageInfo(p); if (info) m.poster = await blobToData(await canvasBlob(info.img, 320, 0.6)); m.missing = true; local++; }
    } else { m.missing = true; if (m.kind === 'video') local++; else imgs++; }
    delete m.local;
  }
  return { b, local, imgs };
}
async function openShare() {
  if (S.editing) endEdit(true);
  await saveNow(false);
  const d = $('#dlg-share'); d.showModal();
  const inp = $('#share-url'), info = $('#share-info');
  inp.value = 'Préparation du lien…'; info.textContent = '';
  try {
    let { b, local, imgs } = await shareBoard(true), url = shareBase() + '#v=' + await encodeShare(b), dropped = false;
    if (url.length > LINK_MAX) { ({ b, local, imgs } = await shareBoard(false)); url = shareBase() + '#v=' + await encodeShare(b); dropped = true; }
    inp.value = url;
    $('#share-open').href = url;
    $('#share-wa').href = 'https://wa.me/?text=' + encodeURIComponent(S.board.title + ' : ' + url);
    $('#share-wa').hidden = url.length > 60000;
    $('#share-mail').href = 'mailto:?subject=' + encodeURIComponent(S.board.title) + '&body=' + encodeURIComponent('Voici le storyboard : ' + url);
    $('#share-mail').hidden = url.length > 1800;
    $('#share-native').hidden = !navigator.share;
    const parts = [h('span', { text: `Lien de ${Math.round(url.length / 1000)} k caractères. ` })];
    if (imgs && !dropped) parts.push(h('span', { text: `Images importées incluses en aperçu réduit. ` }));
    if (dropped && imgs) parts.push(h('span', { class: 'warn', text: `Les ${imgs} image(s) importée(s) ne tiennent pas dans le lien. ` }));
    if (local) parts.push(h('span', { class: 'warn', text: `${local} vidéo(s) de l'appareil ne passent pas dans un lien : envoyez le fichier d'aperçu ci-dessous, ou mettez la vidéo en ligne (TikTok, YouTube, Drive…) et ajoutez-la par lien. ` }));
    if (!/^https?:$/.test(location.protocol)) parts.push(h('span', { text: 'Le lien ouvre la version en ligne de l’outil.' }));
    info.replaceChildren(...parts);
  } catch (e) { console.warn(e); inp.value = ''; info.textContent = 'Le lien n’a pas pu être créé. Utilisez le fichier d’aperçu.'; }
}
async function embedBoard() {
  const b = JSON.parse(JSON.stringify({ v: FORMAT, id: S.board.id, title: S.board.title, created: S.board.created, updated: Date.now(), nodes: S.board.nodes, edges: S.board.edges }));
  for (const n of b.nodes) {
    const m = n.media; if (!m || !m.local) continue;
    const blob = await DB.get('media', m.local), p = await DB.get('media', m.local + '_p');
    if (blob) m.data = await blobToData(blob); else m.missing = true;
    if (p) m.poster = await blobToData(p);
    delete m.local;
  }
  return b;
}
async function exportHtml() {
  const bt = $('#share-html'); bt.disabled = true;
  toast('Préparation du fichier d’aperçu…', 20000);
  try {
    const base = location.href.split('#')[0].split('?')[0];
    const get = async p => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(p); return r.text(); };
    const [page, css, js] = await Promise.all([get('index.html'), get('storyboard.css'), get('storyboard.js')]);
    const data = JSON.stringify(await embedBoard()).replace(/</g, '\\u003c');
    const html = page
      .replace(/<link rel="stylesheet" href="storyboard\.css[^"]*">/, () => '<style>' + css + '</style>')
      .replace(/<script src="storyboard\.js[^"]*"><\/script>/, () => '<script id="sf-data" type="application/json">' + data + '<\/script>\n<script>' + js + '<\/script>');
    if (!html.includes('id="sf-data"')) throw new Error('modèle');
    download(new Blob([html], { type: 'text/html' }), slug(S.board.title) + '-apercu.html');
    toast('Fichier d’aperçu téléchargé');
  } catch (e) { console.warn(e); toast("Le fichier d'aperçu n'a pas pu être créé : ouvrez l'outil depuis son adresse en ligne.", 5000); }
  finally { bt.disabled = false; }
}
async function exportProject() {
  if (S.editing) endEdit(true);
  const b = await embedBoard();
  download(new Blob([JSON.stringify({ app: 'storyfil', format: FORMAT, board: b })], { type: 'application/json' }), slug(b.title) + '.storyfil.json');
}
async function copyToMine() {
  const bt = $('#btn-copy'); bt.disabled = true;
  try {
    await DB.open();
    const b = await localizeBoard(S.board);
    b.id = uid(); b.title = S.board.title + ' (copie)'; b.updated = Date.now(); delete b.view;
    await DB.put('boards', b.id, b); await DB.put('kv', 'last', b.id);
    location.replace(location.pathname);
  } catch (e) { bt.disabled = false; toast('La copie a échoué.'); }
}

/* ---------------- Présentation ---------------- */
function startPresent(fromId) {
  if (S.editing) endEdit(true);
  hideMenu(); closeList();
  const order = storyOrder();
  if (!order.length) { toast('Ajoutez des scènes ou des étapes pour présenter'); return; }
  let i = order.findIndex(n => n.id === (fromId || (S.sel.size === 1 ? [...S.sel][0] : '')));
  S.present = { order, i: Math.max(0, i), trail: [] };
  S.sel = new Set(); S.edge = null;
  document.body.classList.add('presenting'); $('#hud').hidden = false;
  renderInspector(); syncSel();
  showStep();
}
function nextOf(n) {
  const outs = S.board.edges.filter(e => e.from === n.id && byId(e.to));
  if (outs.length === 1) return outs[0].to;
  const o = S.present.order, i = S.present.i;
  return i < o.length - 1 ? o[i + 1].id : null;
}
function showStep() {
  const { order, i } = S.present, n = order[i];
  for (const [id, el] of els) el.classList.toggle('current', id === n.id);
  setActive(n.id); renderEdges();
  go(viewFor(rectOf(n), narrow() ? 16 : 40, 1.6));
  $('#hud-count').textContent = `${i + 1} / ${order.length}`;
  $('#hud-title').textContent = labelOf(n);
  $('#hud-prev').disabled = !S.present.trail.length && i === 0;
  $('#hud-next').disabled = !nextOf(n);
  const box = $('#hud-choices'); box.replaceChildren();
  const outs = S.board.edges.filter(e => e.from === n.id).map(e => [e, byId(e.to)]).filter(x => x[1]);
  if (outs.length > 1) for (const [e, t] of outs) box.append(h('button', { class: 'chip', type: 'button', onclick: () => presentGo(t.id) }, (e.label ? e.label + ' → ' : '→ ') + labelOf(t)));
}
function presentGo(id) {
  const i = S.present.order.findIndex(n => n.id === id);
  if (i < 0 || i === S.present.i) return;
  S.present.trail.push(S.present.i); S.present.i = i; showStep();
}
function presentStep(d) {
  if (!S.present) return;
  if (d > 0) { const id = nextOf(S.present.order[S.present.i]); if (id) presentGo(id); }
  else if (S.present.trail.length) { S.present.i = S.present.trail.pop(); showStep(); }
  else if (S.present.i > 0) { S.present.i--; showStep(); }
}
function stopPresent() {
  if (!S.present) return;
  S.present = null;
  document.body.classList.remove('presenting'); $('#hud').hidden = true;
  for (const el of els.values()) el.classList.remove('current');
  S.active = null; renderAll(); setActive(null);
}

/* ---------------- Vue liste, timecodes, tableau CSV ---------------- */
function timeline() {
  const order = storyOrder(), tcs = new Map(); let t = 0;
  for (const n of order) if (n.type === 'scene' && n.dur) { tcs.set(n.id, [t, t + n.dur]); t += n.dur; }
  return { order, tcs, total: t };
}
function listMedia(n) {
  const m = n.media; if (!m || m.kind === 'link') return null;
  const box = h('div', { class: 'lv-media' }), r = frameRatio(n);
  const wide = r >= 1, w = wide ? 300 : Math.min(300, 260);
  box.style.aspectRatio = m.kind === 'embed' && m.provider === 'instagram' ? `${w} / ${Math.round(w / defaultRatio(m) + igExtra(w))}` : String(r);
  if (m.kind === 'embed') { box.append(embedCover(m)); if (canEmbed(m)) { const f = frameEl(m, { width: w }); f.style.position = 'absolute'; f.style.inset = '0'; box.append(f); } }
  else if (m.kind === 'video') { const src = srcOf(m); box.append(src ? h('video', { src, poster: posterOf(m) || null, controls: true, playsinline: true, preload: 'metadata', style: 'position:absolute;inset:0' }) : missingBox(m)); }
  else { const src = srcOf(m); box.append(src ? h('img', { src, alt: '', loading: 'lazy', style: 'position:absolute;inset:0;object-fit:' + (n.fit === 'contain' ? 'contain' : 'cover') }) : missingBox(m)); }
  if (m.url) box.append(h('div', { class: 'print-only', text: ((PROV[m.provider] || {}).name || 'Média') + ' : ' + m.url }));
  return box;
}
function openList() {
  if (S.editing) endEdit(true);
  if (S.present) stopPresent();
  const { order, tcs, total } = timeline(), box = $('#lv-items');
  box.replaceChildren();
  const scenes = order.filter(n => n.type === 'scene'), done = scenes.filter(n => n.status === 'ok').length;
  $('#lv-title').textContent = S.board.title;
  $('#lv-sub').textContent = [`${scenes.length} scène${scenes.length > 1 ? 's' : ''}`, order.length - scenes.length ? `${order.length - scenes.length} autre(s) élément(s)` : '', total ? 'durée ' + tc(total) : '', done ? `${done} validée${done > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  let k = 0;
  for (const n of order) {
    const media = n.type === 'scene' ? listMedia(n) : null;
    const kind = n.type === 'scene' ? 'Scène ' + String(++k).padStart(2, '0') : n.type === 'step' ? (n.shape === 'diamond' ? 'Décision' : 'Étape') : TYPE_LABEL[n.type];
    const top = h('div', { class: 'lv-top' }, h('span', { class: 'lv-kind', text: kind }));
    if (tcs.has(n.id)) { const [a, b] = tcs.get(n.id); top.append(h('span', { class: 'lv-tc', text: `${tc(a)} → ${tc(b)} · ${fmtDur(n.dur)}` })); }
    if (STATUS[n.status]) top.append(h('span', { class: 'n-status', style: '--sc:' + STATUS[n.status][1], text: STATUS[n.status][0] }));
    const body = h('div', { class: 'lv-body' }, top);
    if (n.title) body.append(h('h2', { class: 'lv-title', text: n.title }));
    const meta = [['Plan', n.shot], ['Mouvement', n.move], ['Transition', n.trans]].filter(x => x[1]);
    if (meta.length) body.append(h('div', { class: 'lv-meta' }, ...meta.map(([l, v]) => h('span', {}, h('b', { text: l + ' : ' }), v))));
    if (n.text) { const t = h('div', { class: 'lv-text rich' }); t.innerHTML = n.text; body.append(t); }   // texte déjà nettoyé
    if (n.audio) body.append(h('div', { class: 'lv-audio', text: n.audio }));
    if (n.media && n.media.kind === 'link') body.append(h('a', { class: 'chip', href: n.media.url, target: '_blank', rel: 'noopener', text: '↗ ' + hostOf(n.media.url) }));
    const outs = S.board.edges.filter(e => e.from === n.id).map(e => [e, byId(e.to)]).filter(x => x[1] && x[1].type !== 'zone' && x[1].type !== 'text');
    if (outs.length) body.append(h('div', { class: 'lv-next' }, h('span', { text: 'Suite :' }), ...outs.map(([e, t]) => h('a', { class: 'chip', href: '#lv-' + t.id, onclick: ev => { ev.preventDefault(); $('#lv-' + t.id)?.scrollIntoView({ behavior: 'smooth' }); } }, (e.label ? e.label + ' → ' : '') + labelOf(t)))));
    box.append(h('article', { class: 'lv-item' + (media ? '' : ' nomedia'), id: 'lv-' + n.id, style: '--c:' + (n.color || DEFCOLOR[n.type] || '#94a3b8') }, media, body));
  }
  if (!order.length) box.append(h('p', { class: 'hint', text: 'Aucune scène pour le moment.' }));
  $('#listview').hidden = false; $('#listview').scrollTop = 0;
}
function closeList() { const l = $('#listview'); if (l.hidden) return; l.hidden = true; $('#lv-items').replaceChildren(); }
function exportCsv() {
  const { order, tcs } = timeline();
  const q = v => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = [['N°', 'Type', 'Titre', 'Début', 'Fin', 'Durée (s)', 'Plan', 'Mouvement', 'Transition', 'Statut', 'Notes', 'Son / dialogue', 'Média']];
  let k = 0;
  for (const n of order) {
    const t = tcs.get(n.id), m = n.media;
    rows.push([n.type === 'scene' ? ++k : '', n.type === 'step' && n.shape === 'diamond' ? 'Décision' : TYPE_LABEL[n.type], n.title || textOf(n.text).split('\n')[0], t ? tc(t[0]) : '', t ? tc(t[1]) : '', n.dur ? String(n.dur).replace('.', ',') : '', n.shot || '', n.move || '', n.trans || '', STATUS[n.status] ? STATUS[n.status][0] : '', n.title ? textOf(n.text) : '', n.audio || '', m ? m.url || m.name || (m.kind === 'image' ? 'image importée' : 'vidéo importée') : '']);
  }
  download(new Blob(['﻿' + rows.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), slug(S.board.title) + '-liste-de-tournage.csv');
}

/* ---------------- Lecteur agrandi ---------------- */
function openLightbox(n) {
  const m = n.media; if (!m) return;
  if (m.kind === 'link') { window.open(m.url, '_blank', 'noopener'); return; }
  closeLightbox();
  const el = els.get(n.id);
  if (el) { el.querySelector('video')?.pause(); if (el._frame) { el._frame.remove(); el._frame = null; el._m.classList.remove('live'); } el._lbHold = true; }
  const box = $('#lb-media'), r = m.kind === 'image' && m.ratio && !RATIOS[n.ratio] ? m.ratio : frameRatio(n);
  const maxW = Math.min(innerWidth - 32, 1400), maxH = innerHeight - 110;
  let w, hh;
  if (m.kind === 'embed' && m.provider === 'instagram') { w = Math.min(maxW, 460); hh = Math.min(maxH, Math.round(w / defaultRatio(m) + igExtra(w))); }
  else { w = Math.min(maxW, maxH * r); hh = w / r; }
  box.style.width = Math.round(w) + 'px'; box.style.height = Math.round(hh) + 'px';
  if (m.kind === 'embed') box.append(canEmbed(m) ? frameEl(m, { autoplay: true, width: w }) : embedCover(m));
  else if (m.kind === 'video') { const src = srcOf(m); box.append(src ? h('video', { src, poster: posterOf(m) || null, controls: true, autoplay: true, playsinline: true }) : missingBox(m)); }
  else { const src = srcOf(m); box.append(src ? h('img', { src, alt: '' }) : missingBox(m)); }
  $('#lb-title').textContent = labelOf(n);
  const a = $('#lb-open'); a.hidden = !m.url; if (m.url) a.href = m.url;
  $('#lightbox').hidden = false; S.lb = n.id;
}
function closeLightbox() {
  if (!S.lb) return;
  $('#lb-media').replaceChildren(); $('#lightbox').hidden = true;
  const el = els.get(S.lb); if (el) el._lbHold = false;
  S.lb = null; updateEmbeds();
}

/* ---------------- Recherche ---------------- */
function nodeText(n) { return fold([n.title, textOf(n.text), n.audio, n.shot, n.move, n.trans, n.media && n.media.name].filter(Boolean).join(' ')); }
function openSearch() { $('#search').hidden = false; const i = $('#search-input'); i.focus(); i.select(); runSearch(); }
function closeSearch() { $('#search').hidden = true; S.search = null; for (const el of els.values()) el.classList.remove('hit'); }
function runSearch() {
  for (const el of els.values()) el.classList.remove('hit');
  const q = fold($('#search-input').value.trim());
  if (!q) { S.search = null; $('#search-count').textContent = ''; return; }
  const list = storyOrder(true).concat(S.board.nodes.filter(n => n.type === 'zone')).filter(n => nodeText(n).includes(q));
  S.search = { list, i: 0 };
  for (const n of list) els.get(n.id)?.classList.add('hit');
  $('#search-count').textContent = list.length ? `1 / ${list.length}` : 'aucun résultat';
  if (list.length) focusNode(list[0], S.view.z);
}
function searchStep(d) {
  const s = S.search; if (!s || !s.list.length) return;
  s.i = (s.i + d + s.list.length) % s.list.length;
  $('#search-count').textContent = `${s.i + 1} / ${s.list.length}`;
  focusNode(s.list[s.i], S.view.z);
}

/* ---------------- Mini-carte ---------------- */
let mmShow = lsGet('sf-map') !== '0', mmGeo = null;
const drawMinimap = raf(() => {
  const c = W.map;
  if (!c || !S.board) return;
  const on = mmShow && !narrow() && S.board.nodes.length > 0 && !S.present;
  c.hidden = !on; $('#btn-map').classList.toggle('on', mmShow);
  if (!on) return;
  const dpr = devicePixelRatio || 1, cw = 220, ch = 140;
  if (c.width !== cw * dpr) { c.width = cw * dpr; c.height = ch * dpr; }
  const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch);
  const r = W.stage.getBoundingClientRect(), z = S.view.z;
  const vw = { x: -S.view.x / z, y: -S.view.y / z, w: r.width / z, h: r.height / z };
  const b = bounds(S.board.nodes);
  const x0 = Math.min(b.x, vw.x), y0 = Math.min(b.y, vw.y), x1 = Math.max(b.x + b.w, vw.x + vw.w), y1 = Math.max(b.y + b.h, vw.y + vw.h);
  const pad = 8, k = Math.min((cw - pad * 2) / (x1 - x0), (ch - pad * 2) / (y1 - y0));
  const ox = pad + ((cw - pad * 2) - (x1 - x0) * k) / 2 - x0 * k, oy = pad + ((ch - pad * 2) - (y1 - y0) * k) / 2 - y0 * k;
  mmGeo = { k, ox, oy };
  for (const n of S.board.nodes) {
    const q = rectOf(n);
    ctx.globalAlpha = n.type === 'zone' ? 0.18 : 0.85;
    ctx.fillStyle = n.color || DEFCOLOR[n.type] || '#94a3b8';
    ctx.fillRect(ox + q.x * k, oy + q.y * k, Math.max(2, q.w * k), Math.max(2, q.h * k));
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#22d3ee';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ox + vw.x * k, oy + vw.y * k, vw.w * k, vw.h * k);
});
function minimapGo(e) {
  if (!mmGeo) return;
  const r = W.map.getBoundingClientRect(), wx = (e.clientX - r.left - mmGeo.ox) / mmGeo.k, wy = (e.clientY - r.top - mmGeo.oy) / mmGeo.k;
  const s = W.stage.getBoundingClientRect();
  S.view.x = s.width / 2 - wx * S.view.z; S.view.y = s.height / 2 - wy * S.view.z;
  applyView();
}

/* ---------------- Clavier ---------------- */
const nudgeCommit = debounce(() => commit(), 400);
function onKey(e) {
  const k = e.key, mod = e.ctrlKey || e.metaKey, low = k.length === 1 ? k.toLowerCase() : k;
  if (S.editing && e.target === S.editing.el) {
    if (k === 'Escape' || (k === 'Enter' && (!S.editing.rich || mod))) { e.preventDefault(); e.target.blur(); }
    return;
  }
  if (mod && low === 'f' && $('#listview').hidden && !document.querySelector('dialog[open]')) { e.preventDefault(); openSearch(); return; }
  if (e.target.id === 'search-input') {
    if (k === 'Enter') { e.preventDefault(); searchStep(e.shiftKey ? -1 : 1); } else if (k === 'Escape') closeSearch();
    return;
  }
  if (typing(e.target) || document.querySelector('dialog[open]')) return;
  if (!$('#lightbox').hidden) { if (k === 'Escape') closeLightbox(); return; }
  if (!$('#listview').hidden) { if (k === 'Escape') closeList(); return; }
  if ($('#drawer').classList.contains('open')) { if (k === 'Escape') closeDrawer(); return; }
  if (!W.menu.hidden && k === 'Escape') { hideMenu(); return; }
  if (S.present) {
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); presentStep(1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); presentStep(-1); }
    else if (k === 'Escape') stopPresent();
    return;
  }
  if (k === ' ' && !mod) { e.preventDefault(); spaceDown = true; document.body.classList.add('space'); return; }
  if (!mod && (k === '+' || k === '=')) { zoomBy(1.25); return; }
  if (!mod && (k === '-' || k === '_')) { zoomBy(0.8); return; }
  if (!mod && k === '0') { const r = W.stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1); return; }
  if (!mod && low === 'f') { fit(); return; }
  if (S.mode !== 'edit') return;
  if (mod && low === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && low === 'y') { e.preventDefault(); redo(); }
  else if (mod && low === 'd') { e.preventDefault(); duplicateSel(); }
  else if (mod && low === 'a') { e.preventDefault(); S.sel = new Set(S.board.nodes.map(n => n.id)); S.edge = null; syncSel(); }
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); deleteSel(); }
  else if (k === 'Escape') { if (!$('#search').hidden) closeSearch(); else clearSel(); }
  else if (k.startsWith('Arrow') && S.sel.size) {
    e.preventDefault();
    const st = e.shiftKey ? GRID : 1, dx = k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, dy = k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0;
    for (const id of S.sel) { const n = byId(id); if (n && !n.lock) { n.x += dx; n.y += dy; renderNode(n); } }
    edgesLater(); nudgeCommit();
  } else if (k === 'Enter' && S.sel.size === 1) { e.preventDefault(); const n = byId([...S.sel][0]); startEdit(n, n.type === 'scene' || n.type === 'zone' ? 'title' : 'text'); }
  else if (!mod && !e.altKey) {
    const tool = { s: 'scene', l: 'link', i: 'file', e: 'step', d: 'decision', n: 'note', t: 'text', z: 'zone' }[low];
    if (tool) { e.preventDefault(); useTool(tool); }
  }
}

/* ---------------- Presse-papiers et glisser-déposer ---------------- */
function onCopy(e, cut) {
  if (S.mode !== 'edit' || typing(document.activeElement) || !S.sel.size) return;
  S.clip = clipOf(S.sel);
  e.clipboardData.setData('text/plain', 'storyfil:' + JSON.stringify(S.clip));
  e.preventDefault();
  if (cut) deleteSel(); else toast('Copié');
}
async function onPaste(e) {
  const ae = document.activeElement;
  if (ae && ae.isContentEditable) {   // dans un texte : on colle du texte simple
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    return;
  }
  if (S.mode !== 'edit' || typing(ae) || document.querySelector('dialog[open]')) return;
  const files = [...e.clipboardData.files], text = (e.clipboardData.getData('text/plain') || '').trim();
  e.preventDefault();
  const p = centerWorld();
  if (text.startsWith('storyfil:')) { try { pasteNodes(JSON.parse(text.slice(9))); } catch { /* contenu illisible */ } return; }
  if (files.length) { addFiles(files, { p }); return; }
  if (/^https?:\/\/\S+$/i.test(text)) {
    const t = S.sel.size === 1 && byId([...S.sel][0]);
    const m = await mediaFromLink(text);
    if (!m) return;
    applyMedia([m], t && t.type === 'scene' && !t.media ? { target: t.id } : { p });
    toast(PROV[m.provider] ? (m.kind === 'embed' ? 'Vidéo ' : 'Lien ') + PROV[m.provider].name + ' ajouté' : 'Lien ajouté');
    return;
  }
  if (text) { const n = makeNode('note', 0, 0, { text: toHtml(text.slice(0, 5000)) }); freeSpot(n, p); S.board.nodes.push(n); S.sel = new Set([n.id]); S.edge = null; commit(); }
}
let dropDepth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
function bindDrop() {
  window.addEventListener('dragenter', e => { if (S.mode !== 'edit' || !hasFiles(e)) return; dropDepth++; $('#dropzone').hidden = false; });
  window.addEventListener('dragleave', e => { if (S.mode !== 'edit' || !hasFiles(e)) return; dropDepth = Math.max(0, dropDepth - 1); if (!dropDepth) $('#dropzone').hidden = true; });
  window.addEventListener('dragover', e => { if (S.mode === 'edit') e.preventDefault(); });
  window.addEventListener('drop', async e => {
    if (S.mode !== 'edit') return;
    e.preventDefault(); dropDepth = 0; $('#dropzone').hidden = true;
    const p = toWorld(e.clientX, e.clientY), files = [...e.dataTransfer.files];
    const nodeEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.n-scene'), t = nodeEl && byId(nodeEl.dataset.id);
    if (files.length) { addFiles(files, t && !t.media ? { target: t.id } : { p }); return; }
    const u = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').split('\n')[0].trim();
    if (safeUrl(u)) { const m = await mediaFromLink(u); if (m) applyMedia([m], t && !t.media ? { target: t.id } : { p }); }
  });
}
/* Outils : clic = ajout au centre, glisser = ajout à l'endroit du dépôt */
function bindTools() {
  for (const b of $$('.tool[data-tool]')) {
    b.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const tool = b.dataset.tool, sx = e.clientX, sy = e.clientY;
      let ghost = null;
      const move = ev => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8 && tool !== 'link' && tool !== 'file') { ghost = h('div', { class: 'ghost-tool' }, b.querySelector('svg').cloneNode(true)); document.body.append(ghost); }
        if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; }
      };
      const up = ev => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        if (ghost) {
          ghost.remove();
          const over = document.elementFromPoint(ev.clientX, ev.clientY);
          if (over && W.stage.contains(over)) { if (tool === 'zone' && S.sel.size) wrapZone(); else addTool(tool, toWorld(ev.clientX, ev.clientY)); }
        } else useTool(tool);
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
  }
  const wireBtn = $('#btn-wire');
  const wireUi = () => { const L = { curve: 'courbe', straight: 'droit', step: 'coudé' }[S.wire]; wireBtn.dataset.tip = 'Style des nouveaux fils : ' + L; wireBtn.querySelector('use').setAttribute('href', '#i-' + { curve: 'curve', straight: 'straight', step: 'elbow' }[S.wire]); };
  wireBtn.addEventListener('click', () => { S.wire = { curve: 'straight', straight: 'step', step: 'curve' }[S.wire]; lsSet('sf-wire', S.wire); wireUi(); toast('Nouveaux fils : ' + wireBtn.dataset.tip.split(': ')[1]); });
  wireUi();
}

/* ---------------- Thème et astuce ---------------- */
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  $('#dr-theme-lbl').textContent = 'Thème : ' + ({ light: 'clair', dark: 'sombre' }[t] || 'automatique');
  drawMinimap();
}
function showTip() {
  if (lsGet('sf-tip') === '1' || narrow()) return;
  $('#tip').hidden = false;
  $('#tip-close').onclick = () => { $('#tip').hidden = true; lsSet('sf-tip', '1'); };
}

/* ---------------- Branchements ---------------- */
function bindUI() {
  W.stage = $('#stage'); W.world = $('#world'); W.zones = $('#zones'); W.edges = $('#edges'); W.labels = $('#labels'); W.nodes = $('#nodes');
  W.temp = $('#temp'); W.marquee = $('#marquee'); W.insp = $('#inspector'); W.menu = $('#menu'); W.fmt = $('#fmt'); W.map = $('#minimap');
  const st = W.stage;
  st.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', e => onUp(e, false));
  window.addEventListener('pointercancel', e => onUp(e, true));
  st.addEventListener('wheel', onWheel, { passive: false });
  st.addEventListener('dblclick', onDblClick);
  st.addEventListener('click', onStageClick);
  st.addEventListener('contextmenu', onContext);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', e => { if (e.key === ' ') { spaceDown = false; document.body.classList.remove('space'); } });
  window.addEventListener('blur', () => { spaceDown = false; document.body.classList.remove('space'); });
  window.addEventListener('resize', debounce(() => { applyView(); drawMinimap(); placeFmt(); }, 100));
  document.addEventListener('pointerdown', e => { if (!W.menu.hidden && !W.menu.contains(e.target)) hideMenu(); }, true);
  document.addEventListener('focusout', e => { if (S.editing && e.target === S.editing.el && !S.fmtBusy) endEdit(true); });
  document.addEventListener('copy', e => onCopy(e, false));
  document.addEventListener('cut', e => onCopy(e, true));
  document.addEventListener('paste', onPaste);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(true); });
  window.addEventListener('pagehide', () => saveNow(true));
  buildFmt();
  for (const [id, list] of [['dl-shot', SHOTS], ['dl-move', MOVES], ['dl-trans', TRANS]]) document.body.append(h('datalist', { id }, ...list.map(v => h('option', { value: v }))));

  $('#btn-undo').onclick = undo; $('#btn-redo').onclick = redo;
  $('#btn-present').onclick = () => S.present ? stopPresent() : startPresent();
  $('#btn-list').onclick = openList;
  $('#btn-share').onclick = openShare;
  $('#btn-copy').onclick = copyToMine;
  $('#btn-zin').onclick = () => zoomBy(1.25); $('#btn-zout').onclick = () => zoomBy(0.8);
  $('#btn-z100').onclick = () => { const r = W.stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1); };
  $('#btn-fit').onclick = () => fit();
  $('#btn-snap').classList.toggle('on', S.snap);
  $('#btn-snap').onclick = () => { S.snap = !S.snap; lsSet('sf-snap', S.snap ? '1' : '0'); $('#btn-snap').classList.toggle('on', S.snap); toast(S.snap ? 'Magnétisme activé' : 'Magnétisme désactivé'); };
  $('#btn-search').onclick = () => $('#search').hidden ? openSearch() : closeSearch();
  $('#btn-map').onclick = () => { mmShow = !mmShow; lsSet('sf-map', mmShow ? '1' : '0'); drawMinimap(); };
  W.map.addEventListener('pointerdown', e => { e.preventDefault(); minimapGo(e); const mv = ev => minimapGo(ev), up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); });
  $('#search-input').addEventListener('input', debounce(runSearch, 120));
  $('#search-next').onclick = () => searchStep(1); $('#search-prev').onclick = () => searchStep(-1); $('#search-close').onclick = closeSearch;
  $('#hud-prev').onclick = () => presentStep(-1); $('#hud-next').onclick = () => presentStep(1); $('#hud-close').onclick = stopPresent;
  $('#lv-close').onclick = closeList; $('#lv-print').onclick = () => window.print(); $('#lv-csv').onclick = exportCsv;
  $('#lb-close').onclick = closeLightbox;
  $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });

  const title = $('#title');
  title.addEventListener('input', () => { S.board.title = title.value.slice(0, 120); document.title = (S.board.title || 'Storyfil') + ' — Storyfil'; });
  title.addEventListener('change', () => { if (!title.value.trim()) { title.value = S.board.title = 'Storyboard sans titre'; } commit(); });
  title.addEventListener('keydown', e => { if (e.key === 'Enter') title.blur(); });

  $('#btn-drawer').onclick = openDrawer; $('#dr-close').onclick = closeDrawer; $('#drawer-scrim').onclick = closeDrawer;
  $('#dr-new').onclick = () => { $('#new-title').value = ''; $('#dlg-new').showModal(); };
  $('#dr-import').onclick = () => { const i = $('#file-project'); i.value = ''; i.click(); };
  $('#file-project').onchange = e => { const f = e.target.files[0]; if (f) importProject(f); };
  $('#dr-export').onclick = exportProject;
  $('#dr-theme').onclick = () => { const cur = lsGet('sf-theme') || 'auto', next = { auto: 'dark', dark: 'light', light: 'auto' }[cur] || 'auto'; lsSet('sf-theme', next); applyTheme(next); };
  $('#new-form').addEventListener('submit', async e => {
    e.preventDefault();
    const tpl = new FormData(e.target).get('tpl') || 'blank';
    $('#dlg-new').close(); closeDrawer();
    await openBoard(makeBoard(tpl, $('#new-title').value.trim().slice(0, 120)), true);
  });
  $('#file-media').onchange = e => { if (e.target.files.length) addFiles(e.target.files, fileCtx); };
  $('#link-input').addEventListener('input', detectLink);
  $('#link-form').addEventListener('submit', submitLink);
  $('#share-copy').onclick = async () => { const i = $('#share-url'); try { await navigator.clipboard.writeText(i.value); } catch { i.select(); document.execCommand('copy'); } toast('Lien copié : collez-le dans un message'); };
  $('#share-native').onclick = () => navigator.share({ title: S.board.title, text: 'Storyboard : ' + S.board.title, url: $('#share-url').value }).catch(() => {});
  $('#share-html').onclick = exportHtml;
  $('#share-json').onclick = exportProject;
  for (const b of $$('[data-close]')) b.addEventListener('click', () => b.closest('dialog').close());
  for (const d of $$('dialog')) d.addEventListener('click', e => { if (e.target === d) d.close(); });
  bindTools(); bindDrop();
  applyTheme(lsGet('sf-theme') || 'auto');
}

/* ---------------- Démarrage ---------------- */
function broken(msg) {
  document.body.append(h('div', { class: 'broken' }, h('div', {}, h('h1', { text: 'Storyboard illisible' }), h('p', { text: msg }), h('a', { class: 'btn primary', href: PUBLIC_URL, text: 'Ouvrir Storyfil' }))));
}
async function boot() {
  bindUI();
  const embedded = document.getElementById('sf-data');
  if (embedded || location.hash.startsWith('#v=')) {
    S.mode = 'view'; S.source = embedded ? 'file' : 'link';
    document.body.classList.replace('edit', 'view');
    try { S.board = normBoard(embedded ? JSON.parse(embedded.textContent) : await decodeShare(location.hash.slice(3))); }
    catch (e) { console.warn(e); broken('Le lien est incomplet ou abîmé. Demandez à la personne de vous le renvoyer.'); return; }
    $('#vtitle').textContent = S.board.title;
    document.title = S.board.title + ' — Storyfil';
    $('#btn-copy').hidden = !/^https?:$/.test(location.protocol);
    renderAll(); fit(false);
    window.addEventListener('hashchange', () => { if (location.hash.startsWith('#v=')) location.reload(); });
    return;
  }
  await DB.open();
  if (!DB.db) toast('Stockage du navigateur indisponible (navigation privée ?) : pensez à sauvegarder en .json.', 6000);
  await gcMedia();
  const last = await DB.get('kv', 'last');
  let b = last && await DB.get('boards', last);
  if (!b) b = (await DB.all('boards')).sort((x, y) => (y.updated || 0) - (x.updated || 0))[0];
  if (!b) b = makeBoard('story', 'Mon premier storyboard');
  try { await openBoard(b); }
  catch (e) { console.warn(e); await openBoard(makeBoard('blank', 'Nouveau storyboard')); }
  showTip();
}
boot();
})();
