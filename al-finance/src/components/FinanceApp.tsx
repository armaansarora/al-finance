"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   A&L FINANCE v2
   Monthly themes · Past month archive · Trends · Categories · Insights
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Helpers ──────────────────────────────────────────────────────────────
const mkey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const mkParts = (mk: string) => { const [y, m] = mk.split("-").map(Number); return { y, m }; };
const mkName = (mk: string) => { const { y, m } = mkParts(mk); return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); };
const mkShort = (mk: string) => { const { y, m } = mkParts(mk); return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short" }); };
const prevMk = (mk: string) => { const { y, m } = mkParts(mk); const d = new Date(y, m - 2); return mkey(d); };
const nextMk = (mk: string) => { const { y, m } = mkParts(mk); const d = new Date(y, m); return mkey(d); };
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
const today = () => new Date().toISOString().slice(0, 10);
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const money = (n: number) => { const a = Math.abs(n), s = a >= 1000 ? a.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : a.toFixed(a % 1 === 0 ? 0 : 2); return n < 0 ? `-$${s}` : `$${s}`; };
const shortDate = (s: string) => parse(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const pct = (v: number, t: number) => t > 0 ? Math.min(Math.max(v / t, 0), 1) : 0;

// ── Types ────────────────────────────────────────────────────────────────
interface Checkin { id: string; person: string; date: string; amount: number; note: string; category: string; }
interface CushionEntry { id: string; person: string; date: string; amount: number; type: string; note: string; }
interface DateNightEntry { id: string; person: string; date: string; amount: number; type: string; note: string; }
interface Settings { allowance: number; savings: number; dnWeekly: number; weekMode: number; paceOk: number; paceTight: number; }

// ── API ──────────────────────────────────────────────────────────────────
async function api(action: string, table: string, data: any = {}) {
  const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, table, data }) });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// ── Base Colors ──────────────────────────────────────────────────────────
const T = {
  armaan: "#2563EB", armaanSoft: "#EFF6FF", armaanBold: "#1D4ED8",
  layla: "#7C3AED", laylaSoft: "#F5F3FF", laylaMid: "#DDD6FE", laylaBold: "#6D28D9",
  shared: "#E11D48", sharedSoft: "#FFF1F2", sharedMid: "#FECDD3",
  ok: "#059669", okSoft: "#ECFDF5", okBorder: "#6EE7B7",
  warn: "#D97706", warnSoft: "#FFFBEB", warnBorder: "#FDE68A",
  bad: "#DC2626", badSoft: "#FEF2F2", badBorder: "#FECACA",
  bg: "#F9FAFB", card: "#FFFFFF", border: "#E5E7EB", borderSoft: "#F3F4F6",
  text: "#111827", text2: "#374151", text3: "#6B7280", text4: "#9CA3AF", text5: "#D1D5DB",
};

const PERSON: Record<string, { name: string; color: string; soft: string; bold: string; initial: string }> = {
  armaan: { name: "Armaan", color: T.armaan, soft: T.armaanSoft, bold: T.armaanBold, initial: "A" },
  layla: { name: "Layla", color: T.layla, soft: T.laylaSoft, bold: T.laylaBold, initial: "L" },
};

// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY THEMES
// To edit: just change emoji, greeting, accent, soft, or gradient for any month.
// ═══════════════════════════════════════════════════════════════════════════
interface MonthTheme {
  emoji: string;          // Decorative emoji shown in header & cards
  greeting: string;       // Fun greeting shown at top of overview
  accent: string;         // Primary theme accent color
  soft: string;           // Light background tint
  gradient: string;       // CSS gradient for the top banner
  flavor: string;         // Short vibe text
}

const THEMES: Record<number, MonthTheme> = {
  1:  { emoji: "❄️",  greeting: "New year, fresh budget",         accent: "#3B82F6", soft: "#EFF6FF", gradient: "linear-gradient(135deg, #DBEAFE, #E0E7FF)", flavor: "Winter" },
  2:  { emoji: "💕",  greeting: "Love is in the budget",          accent: "#EC4899", soft: "#FDF2F8", gradient: "linear-gradient(135deg, #FCE7F3, #FDE8E8)", flavor: "Valentine's" },
  3:  { emoji: "🍀",  greeting: "Lucky spending ahead",           accent: "#10B981", soft: "#ECFDF5", gradient: "linear-gradient(135deg, #D1FAE5, #ECFDF5)", flavor: "Spring" },
  4:  { emoji: "🌸",  greeting: "Spring into savings",            accent: "#A855F7", soft: "#FAF5FF", gradient: "linear-gradient(135deg, #F3E8FF, #FDF2F8)", flavor: "Blossom" },
  5:  { emoji: "🌺",  greeting: "May flowers, May savings",       accent: "#F472B6", soft: "#FDF2F8", gradient: "linear-gradient(135deg, #FCE7F3, #FFF1F2)", flavor: "Bloom" },
  6:  { emoji: "☀️",  greeting: "Summer vibes, smart spending",   accent: "#F59E0B", soft: "#FFFBEB", gradient: "linear-gradient(135deg, #FEF3C7, #FFFBEB)", flavor: "Summer" },
  7:  { emoji: "🎆",  greeting: "Fireworks & finances",           accent: "#EF4444", soft: "#FEF2F2", gradient: "linear-gradient(135deg, #FEE2E2, #EFF6FF)", flavor: "Celebration" },
  8:  { emoji: "🏖️", greeting: "Ride the wave, watch the wallet", accent: "#06B6D4", soft: "#ECFEFF", gradient: "linear-gradient(135deg, #CFFAFE, #E0F2FE)", flavor: "Beach" },
  9:  { emoji: "🍂",  greeting: "Fall into good habits",          accent: "#D97706", soft: "#FFFBEB", gradient: "linear-gradient(135deg, #FEF3C7, #FFEDD5)", flavor: "Autumn" },
  10: { emoji: "🎃",  greeting: "No scary spending",              accent: "#F97316", soft: "#FFF7ED", gradient: "linear-gradient(135deg, #FFEDD5, #FEF3C7)", flavor: "Spooky" },
  11: { emoji: "🦃",  greeting: "Grateful for every dollar",      accent: "#B45309", soft: "#FFFBEB", gradient: "linear-gradient(135deg, #FDE68A40, #FFEDD540)", flavor: "Thankful" },
  12: { emoji: "🎄",  greeting: "Jingle bells, budget well",      accent: "#DC2626", soft: "#FEF2F2", gradient: "linear-gradient(135deg, #FEE2E2, #DCFCE7)", flavor: "Holiday" },
};

const getTheme = (mk: string): MonthTheme => THEMES[mkParts(mk).m] || THEMES[1];

// ── Categories ───────────────────────────────────────────────────────────
const CATS = [
  { key: "food", label: "Food & Groceries", icon: "🛒", color: "#059669" },
  { key: "dining", label: "Dining Out", icon: "🍽️", color: "#D97706" },
  { key: "shopping", label: "Shopping", icon: "🛍️", color: "#7C3AED" },
  { key: "bills", label: "Bills & Subs", icon: "📱", color: "#2563EB" },
  { key: "transport", label: "Transport", icon: "🚗", color: "#6366F1" },
  { key: "health", label: "Health & Beauty", icon: "💊", color: "#EC4899" },
  { key: "fun", label: "Entertainment", icon: "🎮", color: "#F59E0B" },
  { key: "gifts", label: "Gifts", icon: "🎁", color: "#E11D48" },
  { key: "other", label: "Other", icon: "📦", color: "#6B7280" },
];
const catMap = Object.fromEntries(CATS.map(c => [c.key, c]));
const getCat = (k: string) => catMap[k] || catMap["other"];

// ══════════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ══════════════════════════════════════════════════════════════════════════
function BudgetRing({ spent, budget, color, size = 148 }: { spent: number; budget: number; color: string; size?: number }) {
  const sw = 7, r = (size - sw * 2) / 2, circ = 2 * Math.PI * r;
  const ratio = budget > 0 ? Math.min(spent / budget, 1.2) : 0;
  const offset = circ - Math.min(ratio, 1) * circ;
  const remaining = budget - spent;
  const ringColor = ratio > 1 ? T.bad : ratio > 0.85 ? T.warn : color;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.borderSoft} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke 0.5s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="font-serif" style={{ fontSize: "2rem", color: remaining >= 0 ? T.text : T.bad, lineHeight: 1 }}>{money(remaining)}</div>
        <div style={{ fontSize: "0.55rem", fontWeight: 500, color: T.text4, marginTop: 5, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>remaining</div>
      </div>
    </div>
  );
}

function Bar({ value, max, color, h = 6, bg }: { value: number; max: number; color: string; h?: number; bg?: string }) {
  return <div style={{ height: h, background: bg || T.borderSoft, borderRadius: h, overflow: "hidden", width: "100%" }}><div style={{ height: "100%", width: `${pct(value, max) * 100}%`, background: color, borderRadius: h, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} /></div>;
}

function WeekBars({ checkins, color }: { checkins: Checkin[]; color: string }) {
  const weeks = [0, 0, 0, 0, 0];
  checkins.forEach(c => { const w = Math.min(Math.floor((parse(c.date).getDate() - 1) / 7), 4); weeks[w] += c.amount; });
  const mx = Math.max(...weeks, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 44 }}>
      {["W1", "W2", "W3", "W4", "W5"].map((label, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", maxWidth: 32, borderRadius: "4px 4px 2px 2px", height: weeks[i] > 0 ? `${Math.max(10, (weeks[i] / mx) * 36)}px` : "3px", background: weeks[i] > 0 ? color : T.borderSoft, opacity: weeks[i] > 0 ? 0.35 + (0.65 * weeks[i] / mx) : 0.3, transition: "height 0.6s" }} />
          <span className="font-mono" style={{ fontSize: "0.5rem", fontWeight: 500, color: T.text4 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function PaceBadge({ status }: { status: string }) {
  const m: Record<string, { l: string; c: string; bg: string; b: string }> = { ok: { l: "On Track", c: T.ok, bg: T.okSoft, b: T.okBorder }, tight: { l: "Tight", c: T.warn, bg: T.warnSoft, b: T.warnBorder }, over: { l: "Over Budget", c: T.bad, bg: T.badSoft, b: T.badBorder } };
  const s = m[status] || m.ok;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 100, fontSize: "0.6rem", fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.b}` }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: s.c }} />{s.l}</span>;
}

function useToast() {
  const [t, setT] = useState<{ msg: string; v: string } | null>(null);
  const timer = useRef<any>(null);
  const show = useCallback((msg: string, v = "success") => { setT({ msg, v }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 3000); }, []);
  const Toaster = () => t ? (
    <div className="animate-toast" style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: t.v === "error" ? T.bad : t.v === "info" ? T.armaan : T.ok, color: "#fff", padding: "11px 24px 11px 18px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" as const }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800 }}>{t.v === "error" ? "✕" : "✓"}</span>{t.msg}
    </div>
  ) : null;
  return { show, Toaster };
}

function Modal({ open, onClose, title, accent, children }: { open: boolean; onClose: () => void; title: string; accent?: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.45)", backdropFilter: "blur(6px)" }} />
      <div className="animate-modal" onClick={(e: any) => e.stopPropagation()} style={{ position: "relative", background: T.card, borderRadius: 20, maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.15)" }}>
        {accent && <div style={{ height: 3, borderRadius: "20px 20px 0 0", background: accent }} />}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: T.text }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: T.borderSoft, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.text3 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: T.text3, marginBottom: 6 }}>{label}</label>{children}</div>;
}

function Input({ value, onChange, type = "number", placeholder, accent, autoFocus }: any) {
  return <input type={type} value={value} placeholder={placeholder} autoFocus={autoFocus} onChange={(e: any) => onChange(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${accent ? `${accent}50` : T.border}`, background: accent ? `${accent}06` : T.borderSoft, fontFamily: type === "text" || type === "date" ? "'Sora', sans-serif" : "'DM Mono', monospace", fontSize: type === "text" ? "0.88rem" : "1rem", fontWeight: 500, color: T.text, outline: "none", boxSizing: "border-box" as const }} />;
}

function PersonPicker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options?: string[] }) {
  const opts = options || ["armaan", "layla"];
  return (
    <Field label="Person"><div style={{ display: "flex", gap: 6 }}>
      {opts.map(p => { const c = p === "both" ? T.shared : PERSON[p]?.color || T.text3; const a = value === p; return <button key={p} onClick={() => onChange(p)} style={{ flex: 1, padding: "11px 8px", borderRadius: 12, border: `1.5px solid ${a ? c : T.border}`, background: a ? `${c}10` : "transparent", fontSize: "0.82rem", fontWeight: a ? 700 : 500, color: a ? c : T.text3, cursor: "pointer", textTransform: "capitalize" as const }}>{p === "both" ? "Both" : PERSON[p]?.name || p}</button>; })}
    </div></Field>
  );
}

function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Category"><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
      {CATS.map(c => { const a = value === c.key; return <button key={c.key} onClick={() => onChange(c.key)} style={{ padding: "8px 4px", borderRadius: 10, border: `1.5px solid ${a ? c.color : T.border}`, background: a ? `${c.color}10` : "transparent", fontSize: "0.6rem", fontWeight: a ? 700 : 500, color: a ? c.color : T.text3, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, justifyContent: "center" }}><span style={{ fontSize: "0.7rem" }}>{c.icon}</span>{c.label.split(" & ")[0].split(" ")[0]}</button>; })}
    </div></Field>
  );
}

function Btn({ label, color, onClick, disabled, wide, variant = "solid" }: any) {
  const sol = variant === "solid";
  return <button onClick={onClick} disabled={disabled} style={{ padding: "12px 24px", borderRadius: 12, cursor: disabled ? "default" : "pointer", fontSize: "0.82rem", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: wide ? "100%" : "auto", background: sol ? color : "transparent", border: `1.5px solid ${sol ? color : variant === "danger" ? `${T.bad}40` : `${color}40`}`, color: sol ? "#fff" : variant === "danger" ? T.bad : color, opacity: disabled ? 0.35 : 1, transition: "opacity 0.15s" }}>{label}</button>;
}

function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const p: any = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "grid": return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "list": return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
    case "shield": return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case "heart": return <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.18V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1.08H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.82a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 0 1 4 0v.09c.09.67.54 1.24 1.18 1.42a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06c-.46.46-.68 1.13-.42 1.76.18.44.62.79 1.1.88H21a2 2 0 0 1 0 4h-.09c-.67.09-1.24.54-1.42 1.18z" /></svg>;
    default: return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function FinanceApp() {
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [cushion, setCushion] = useState<CushionEntry[]>([]);
  const [datenight, setDatenight] = useState<DateNightEntry[]>([]);
  const [config, setConfig] = useState<Settings>({ allowance: 2000, savings: 200, dnWeekly: 50, weekMode: 4, paceOk: 0.05, paceTight: 0.12 });
  const [laylaRec, setLaylaRec] = useState<Record<string, number>>({});
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(mkey());
  const { show: toast, Toaster } = useToast();

  const curMK = mkey();
  const isCur = viewMonth === curMK;
  const { y: vY, m: vM } = mkParts(viewMonth);
  const vTotalDays = daysIn(vY, vM);
  const vDayNum = isCur ? new Date().getDate() : vTotalDays;
  const vDaysLeft = isCur ? vTotalDays - vDayNum + 1 : 0;
  const theme = getTheme(viewMonth);
  const nextTheme = getTheme(nextMk(viewMonth));

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/data");
      if (res.status === 401) { window.location.reload(); return; }
      const data = await res.json();
      setCheckins(data.checkins || []); setCushion(data.cushion || []);
      setDatenight(data.datenight || []); if (data.settings) setConfig(data.settings);
      setLaylaRec(data.laylaReceived || {});
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const h = () => { if (document.visibilityState === "visible") fetchData(); }; document.addEventListener("visibilitychange", h); return () => document.removeEventListener("visibilitychange", h); }, [fetchData]);

  // ── Budget ─────────────────────────────────────────────────────────
  const wks = config.weekMode || 4;
  const deductions = config.savings + config.dnWeekly * wks;
  const budget = config.allowance - deductions;

  // ── Person calc for any month ──────────────────────────────────────
  const calcPerson = useCallback((person: string, mk: string) => {
    const entries = checkins.filter(c => c.person === person && c.date.startsWith(mk));
    const spent = entries.reduce((s, c) => s + c.amount, 0);
    const remaining = budget - spent;
    const { y, m } = mkParts(mk);
    const td = daysIn(y, m); const cur = mk === curMK;
    const dn = cur ? new Date().getDate() : td;
    const dl = cur ? td - dn + 1 : 0;
    const perDay = dl > 0 ? remaining / dl : remaining / td;
    const perWeek = perDay * 7;
    const expected = budget * (dn / td);
    const ratio = budget > 0 ? (spent - expected) / budget : 0;
    let pace = "ok";
    if (ratio > config.paceTight) pace = "over"; else if (ratio > config.paceOk) pace = "tight";
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const last = sorted[0] || null;
    const daysSince = last ? Math.floor((Date.now() - parse(last.date).getTime()) / 86400000) : null;
    const byCat: Record<string, number> = {};
    entries.forEach(c => { const k = c.category || "other"; byCat[k] = (byCat[k] || 0) + c.amount; });
    return { entries, spent, remaining, perDay, perWeek, pace, last, daysSince, byCat };
  }, [checkins, curMK, budget, config]);

  const arm = useMemo(() => calcPerson("armaan", viewMonth), [calcPerson, viewMonth]);
  const lay = useMemo(() => calcPerson("layla", viewMonth), [calcPerson, viewMonth]);

  const laylaRecAmt = laylaRec[viewMonth] || 0;
  const laylaStillExp = Math.max(0, config.allowance - laylaRecAmt);
  const cushBal = useCallback((p: string) => cushion.filter(c => c.person === p).reduce((s, c) => c.type === "add" ? s + c.amount : s - c.amount, 0), [cushion]);
  const armCush = useMemo(() => cushBal("armaan"), [cushBal]);
  const layCush = useMemo(() => cushBal("layla"), [cushBal]);
  const dnBal = useMemo(() => datenight.reduce((s, e) => e.type === "contrib" ? s + e.amount : s - e.amount, 0), [datenight]);

  const hSpent = arm.spent + lay.spent, hBudget = budget * 2, hRem = arm.remaining + lay.remaining;
  const mProg = vDayNum / vTotalDays;
  const hRatio = hBudget > 0 && mProg > 0 ? hSpent / (hBudget * mProg) : 0;
  const hStatus = hRatio > 1.12 ? "over" : hRatio > 1.05 ? "tight" : "ok";

  // ── Monthly trend data (last 6 months) ─────────────────────────────
  const trendData = useMemo(() => {
    const months: string[] = [];
    let mk = viewMonth;
    for (let i = 0; i < 6; i++) { months.unshift(mk); mk = prevMk(mk); }
    return months.map(m => {
      const entries = checkins.filter(c => c.date.startsWith(m));
      const total = entries.reduce((s, c) => s + c.amount, 0);
      const armT = entries.filter(c => c.person === "armaan").reduce((s, c) => s + c.amount, 0);
      const layT = entries.filter(c => c.person === "layla").reduce((s, c) => s + c.amount, 0);
      return { mk: m, total, armaan: armT, layla: layT, count: entries.length };
    });
  }, [checkins, viewMonth]);

  // ── Past months with data ──────────────────────────────────────────
  const pastMonths = useMemo(() => {
    const months = new Set(checkins.map(c => c.date.slice(0, 7)));
    return [...months].filter(m => m < curMK).sort().reverse();
  }, [checkins, curMK]);

  // ── Insights ───────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const out: { text: string; type: string; icon: string }[] = [];
    const allCur = checkins.filter(c => c.date.startsWith(viewMonth));
    if (allCur.length === 0) return [{ text: "No check-ins yet. Start logging to see insights!", type: "info", icon: "💡" }];
    if (isCur && vDayNum > 3) {
      const daily = hSpent / vDayNum;
      const proj = daily * vTotalDays;
      const rem = hBudget - proj;
      out.push(rem > 0
        ? { text: `At this pace, you'll finish with ${money(rem)} left`, type: "good", icon: "📈" }
        : { text: `At this pace, you'll be ${money(Math.abs(rem))} over by month end`, type: "bad", icon: "📉" });
    }
    const combined: Record<string, number> = {};
    allCur.forEach(c => { const k = c.category || "other"; combined[k] = (combined[k] || 0) + c.amount; });
    const topCat = Object.entries(combined).sort((a, b) => b[1] - a[1])[0];
    if (topCat) { const cat = getCat(topCat[0]); out.push({ text: `Top category: ${cat.icon} ${cat.label} — ${money(topCat[1])} (${Math.round((topCat[1] / hSpent) * 100)}%)`, type: "info", icon: "🏷️" }); }
    if (arm.spent > 0 && lay.spent > 0) { const d = arm.spent - lay.spent; out.push(Math.abs(d) > budget * 0.1 ? { text: `${d > 0 ? "Armaan" : "Layla"} spent ${money(Math.abs(d))} more`, type: "info", icon: "⚖️" } : { text: "Spending is balanced between you both", type: "good", icon: "⚖️" }); }
    if (isCur) { const uDays = new Set(allCur.map(c => c.date)).size; if (uDays / vDayNum > 0.5) out.push({ text: `Great tracking! ${uDays} check-in days this month`, type: "good", icon: "🔥" }); }
    return out.slice(0, 4);
  }, [checkins, viewMonth, isCur, hSpent, hBudget, vDayNum, vTotalDays, arm, lay, budget]);

  // ── Actions ────────────────────────────────────────────────────────
  const openModal = (name: string, data: any = {}) => { setForm(data); setModal(name); };
  const closeModal = () => { setModal(null); setForm({}); setEditId(null); };
  const upd = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));
  const act = async (action: string, table: string, data: any, msg: string, variant = "success") => { try { await api(action, table, data); toast(msg, variant); await fetchData(); } catch { toast("Something went wrong", "error"); } };

  const addCheckin = () => { const a = Number(form.amount); if (!a || a <= 0) return; act("create", "checkin", { person: form.person, date: form.date || today(), amount: a, note: form.note || "", category: form.category || "other" }, `${money(a)} logged`); closeModal(); };
  const saveCheckin = () => { if (!editId || !form.amount) return; act("update", "checkin", { id: editId, amount: Number(form.amount), date: form.date, note: form.note ?? "", category: form.category || "other" }, "Updated"); closeModal(); };
  const deleteCheckin = (cid: string) => act("delete", "checkin", { id: cid }, "Removed", "info");
  const addCushionEntry = () => { const a = Number(form.amount); if (!a || a <= 0) return; act("create", "cushion", { person: form.person, date: today(), amount: a, type: form.type, note: form.note || "" }, form.type === "add" ? `${money(a)} deposited` : `${money(a)} withdrawn`); closeModal(); };
  const addDNContrib = () => { const a = Number(form.amount); if (!a || a <= 0 || !form.person) return; if (form.person === "both") { Promise.all([api("create", "datenight", { person: "armaan", date: today(), amount: a, type: "contrib", note: form.note || "" }), api("create", "datenight", { person: "layla", date: today(), amount: a, type: "contrib", note: form.note || "" })]).then(() => { toast("Contributed"); fetchData(); }); } else { act("create", "datenight", { person: form.person, date: today(), amount: a, type: "contrib", note: form.note || "" }, "Contributed"); } closeModal(); };
  const addDNSpend = () => { const a = Number(form.amount); if (!a || a <= 0) return; act("create", "datenight", { person: "both", date: today(), amount: a, type: "spend", note: form.note || "" }, "Date night logged! 💕"); closeModal(); };
  const updateLaylaRec = () => { act("update", "laylaReceived", { monthKey: viewMonth, amount: Number(form.amount) || 0 }, "Updated"); closeModal(); };
  const logout = async () => { await fetch("/api/auth", { method: "DELETE" }); window.location.reload(); };

  const TABS = [{ key: "overview", label: "Overview", icon: "grid" }, { key: "log", label: "Log", icon: "list" }, { key: "cushion", label: "Cushion", icon: "shield" }, { key: "datenight", label: "Date Night", icon: "heart" }, { key: "settings", label: "Settings", icon: "settings" }];
  const hs = { ok: { label: "Healthy", color: T.ok, bg: T.okSoft }, tight: { label: "Watch It", color: T.warn, bg: T.warnSoft }, over: { label: "Over Pace", color: T.bad, bg: T.badSoft } }[hStatus] || { label: "Healthy", color: T.ok, bg: T.okSoft };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center animate-fade" style={{ background: T.bg }}>
      <div className="text-center"><div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-extrabold text-sm" style={{ background: `linear-gradient(135deg, ${T.armaan}, ${T.layla})` }}>A&L</div><div className="text-sm font-medium" style={{ color: T.text4 }}>Loading...</div></div>
    </div>
  );

  // ── Month Picker ───────────────────────────────────────────────────
  const MonthNav = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
      <button onClick={() => setViewMonth(prevMk(viewMonth))} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.text3, fontSize: "1.1rem" }}>‹</button>
      <div style={{ textAlign: "center", minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: "1.2rem" }}>{theme.emoji}</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: T.text }}>{mkName(viewMonth)}</span>
        </div>
        {!isCur && <button onClick={() => setViewMonth(curMK)} style={{ fontSize: "0.62rem", fontWeight: 600, color: theme.accent, background: `${theme.accent}10`, border: "none", borderRadius: 100, padding: "3px 14px", cursor: "pointer", marginTop: 5 }}>Back to {mkShort(curMK)}</button>}
      </div>
      <button onClick={() => setViewMonth(nextMk(viewMonth))} disabled={viewMonth >= curMK} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, cursor: viewMonth >= curMK ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: viewMonth >= curMK ? T.text5 : T.text3, opacity: viewMonth >= curMK ? 0.4 : 1, fontSize: "1.1rem" }}>›</button>
    </div>
  );

  // ── Person Card ────────────────────────────────────────────────────
  const PersonCard = ({ person, data }: { person: string; data: any }) => {
    const p = PERSON[person];
    const { spent, remaining, perDay, perWeek, pace, entries, last, daysSince } = data;
    const nudge = isCur && daysSince !== null && daysSince >= 3;
    return (
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all" style={{ flex: 1, minWidth: 300 }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${p.color}, ${theme.accent}80)` }} />
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: p.soft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", color: p.color }}>{p.initial}</div>
            <div><div style={{ fontWeight: 700, fontSize: "1rem", color: T.text }}>{p.name}</div><div style={{ fontSize: "0.62rem", fontWeight: 500, color: T.text4 }}>{theme.emoji} {mkName(viewMonth)}</div></div>
          </div>
          <PaceBadge status={pace} />
        </div>
        <div style={{ padding: "16px 24px 8px" }}><BudgetRing spent={spent} budget={budget} color={p.color} /></div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "4px 24px 14px" }}>
          {[{ l: "/ day", v: perDay }, { l: "/ week", v: perWeek }].map((x, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px 12px", background: T.bg, borderRadius: 12 }}>
              <div className="font-serif" style={{ fontSize: "1.15rem", color: x.v >= 0 ? T.text : T.bad }}>{money(x.v)}</div>
              <div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4, marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>
        {entries.length > 0 && <div style={{ padding: "0 24px 12px" }}><div style={{ fontSize: "0.6rem", fontWeight: 600, color: T.text4, marginBottom: 6 }}>Spending by Week</div><WeekBars checkins={entries} color={p.color} /></div>}
        <div style={{ margin: "0 24px", padding: "14px 0", borderTop: `1px solid ${T.borderSoft}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[{ l: "Allowance", v: money(config.allowance), c: T.text2 }, { l: "Deductions", v: `-${money(deductions)}`, c: T.text4 }, { l: "Spent", v: money(spent), c: spent > budget ? T.bad : T.text }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>{s.l}</div><div className="font-mono" style={{ fontSize: "0.85rem", fontWeight: 600, color: s.c, marginTop: 2 }}>{s.v}</div></div>
          ))}
        </div>
        {nudge && <div style={{ margin: "6px 24px 0", padding: "10px 14px", background: T.warnSoft, borderRadius: 12, border: `1px solid ${T.warnBorder}`, fontSize: "0.72rem", fontWeight: 600, color: T.warn }}>⏰ {daysSince} days since last check-in</div>}
        <div style={{ padding: "16px 24px 22px" }}>
          <button onClick={() => openModal("checkin", { person, date: isCur ? today() : `${viewMonth}-15`, amount: "", note: "", category: "other" })} style={{ width: "100%", padding: "13px", background: p.color, border: "none", borderRadius: 14, cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 14px ${p.color}30` }}>+ Check In</button>
          {last && !nudge && <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.6rem", color: T.text4 }}>Last: {shortDate(last.date)} {daysSince === 0 ? "(today)" : `(${daysSince}d ago)`}</div>}
        </div>
      </div>
    );
  };

  // ── Category Breakdown ─────────────────────────────────────────────
  const CatBreakdown = ({ byCat, color, name }: { byCat: Record<string, number>; color: string; name: string }) => {
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    if (total === 0) return null;
    return (
      <div><div style={{ fontSize: "0.65rem", fontWeight: 700, color, marginBottom: 8 }}>{name}</div>
        {sorted.map(([k, v]) => { const cat = getCat(k); return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "0.75rem", width: 20, textAlign: "center" }}>{cat.icon}</span>
            <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: "0.62rem", fontWeight: 600, color: T.text2 }}>{cat.label}</span><span className="font-mono" style={{ fontSize: "0.62rem", fontWeight: 600, color: T.text }}>{money(v)}</span></div><Bar value={v} max={total} color={cat.color} h={5} /></div>
          </div>
        ); })}
      </div>
    );
  };

  // ── Dad Card ───────────────────────────────────────────────────────
  const DadCard = () => {
    const recPct = pct(laylaRecAmt, config.allowance); const done = laylaStillExp === 0;
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div style={{ height: 3, background: `linear-gradient(90deg, ${T.layla}, ${theme.accent}80)` }} />
        <div style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: T.laylaSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>💜</div><div><div style={{ fontWeight: 700, fontSize: "0.9rem", color: T.text }}>Layla&apos;s Allowance from Dad</div><div style={{ fontSize: "0.62rem", fontWeight: 500, color: T.text4 }}>{mkName(viewMonth)}</div></div></div>
            <button onClick={() => openModal("laylaRec", { amount: laylaRecAmt })} style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${T.layla}40`, background: `${T.layla}08`, fontSize: "0.72rem", fontWeight: 700, color: T.layla, cursor: "pointer" }}>Update</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ padding: "18px 20px", background: T.laylaSoft, borderRadius: 14 }}><div style={{ fontSize: "0.62rem", fontWeight: 600, color: T.layla, marginBottom: 6 }}>Received</div><div className="font-serif" style={{ fontSize: "1.8rem", color: T.laylaBold, lineHeight: 1 }}>{money(laylaRecAmt)}</div></div>
            <div style={{ padding: "18px 20px", background: done ? T.okSoft : T.warnSoft, borderRadius: 14 }}><div style={{ fontSize: "0.62rem", fontWeight: 600, color: done ? T.ok : T.warn, marginBottom: 6 }}>{done ? "Complete!" : "Expected"}</div><div className="font-serif" style={{ fontSize: "1.8rem", color: done ? T.ok : T.warn, lineHeight: 1 }}>{done ? "✓" : money(laylaStillExp)}</div></div>
          </div>
          <Bar value={laylaRecAmt} max={config.allowance} color={T.layla} h={10} bg={`${T.laylaMid}50`} />
          <div style={{ fontSize: "0.6rem", color: T.text4, marginTop: 8 }}>{money(laylaRecAmt)} of {money(config.allowance)}</div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // TAB: LOG
  // ══════════════════════════════════════════════════════════════════
  const LogView = () => {
    const [filter, setFilter] = useState("all"); const [catF, setCatF] = useState(""); const [search, setSearch] = useState("");
    const filtered = checkins.filter(c => c.date.startsWith(viewMonth)).filter(c => filter === "all" || c.person === filter).filter(c => !catF || c.category === catF).filter(c => !search || c.note?.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
    const total = filtered.reduce((s, c) => s + c.amount, 0);
    return (
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <MonthNav />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div><h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: T.text }}>{filtered.length} entries</h2><div style={{ fontSize: "0.68rem", color: T.text4 }}>{money(total)} total</div></div>
          <div style={{ display: "flex", gap: 4 }}>{[{ k: "all", l: "All", c: T.text2 }, { k: "armaan", l: "A", c: T.armaan }, { k: "layla", l: "L", c: T.layla }].map(f => (<button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: "6px 12px", borderRadius: 100, border: `1.5px solid ${filter === f.k ? f.c : T.border}`, background: filter === f.k ? `${f.c}10` : "transparent", fontSize: "0.7rem", fontWeight: filter === f.k ? 700 : 500, color: filter === f.k ? f.c : T.text4, cursor: "pointer" }}>{f.l}</button>))}</div>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search notes..." style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.borderSoft, fontSize: "0.82rem", fontWeight: 500, color: T.text, outline: "none", marginBottom: 12, boxSizing: "border-box" as const }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={() => setCatF("")} style={{ padding: "5px 10px", borderRadius: 100, border: `1px solid ${!catF ? theme.accent : T.border}`, background: !catF ? `${theme.accent}10` : "transparent", fontSize: "0.6rem", fontWeight: !catF ? 700 : 500, color: !catF ? theme.accent : T.text4, cursor: "pointer" }}>All</button>
          {CATS.map(c => (<button key={c.key} onClick={() => setCatF(catF === c.key ? "" : c.key)} style={{ padding: "5px 10px", borderRadius: 100, border: `1px solid ${catF === c.key ? c.color : T.border}`, background: catF === c.key ? `${c.color}10` : "transparent", fontSize: "0.6rem", fontWeight: catF === c.key ? 700 : 500, color: catF === c.key ? c.color : T.text4, cursor: "pointer" }}>{c.icon}</button>))}
        </div>
        {filtered.length === 0 ? <div className="bg-white rounded-2xl border border-gray-200 text-center py-16"><div className="text-4xl mb-3">📝</div><div style={{ fontWeight: 700, color: T.text2 }}>{search || catF ? "No matches" : "No entries yet"}</div></div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(c => { const pc = PERSON[c.person]; const cat = getCat(c.category); return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 flex items-center gap-3 px-4 py-3.5 hover:shadow-sm" style={{ transition: "box-shadow 0.15s" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: pc?.soft || T.borderSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.78rem", color: pc?.color || T.text3, flexShrink: 0 }}>{c.person[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span className="font-mono" style={{ fontSize: "0.9rem", fontWeight: 600 }}>{money(c.amount)}</span><span style={{ fontSize: "0.5rem", fontWeight: 600, color: cat.color, background: `${cat.color}12`, padding: "2px 6px", borderRadius: 100 }}>{cat.icon} {cat.label.split(" ")[0]}</span></div>
                  {c.note && <div style={{ fontSize: "0.7rem", color: T.text3, marginTop: 2 }}>{c.note}</div>}
                  <div style={{ fontSize: "0.58rem", color: T.text4, marginTop: 2, textTransform: "capitalize" as const }}>{c.person} · {shortDate(c.date)}</div>
                </div>
                <button onClick={() => { setEditId(c.id); openModal("editCI", { ...c }); }} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: T.text4, fontSize: "0.9rem" }}>✎</button>
                <button onClick={() => deleteCheckin(c.id)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: T.text4, fontSize: "0.8rem" }}>🗑</button>
              </div>
            ); })}
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // TAB: CUSHION
  // ══════════════════════════════════════════════════════════════════
  const CushionView = () => (
    <div style={{ maxWidth: 660, margin: "0 auto" }}>
      <h2 style={{ fontWeight: 800, fontSize: "1.15rem", color: T.text, marginBottom: 24 }}>Cushion Reserve</h2>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {[{ n: "Armaan", b: armCush, p: "armaan", c: T.armaan, s: T.armaanSoft }, { n: "Layla", b: layCush, p: "layla", c: T.layla, s: T.laylaSoft }].map(x => (
          <div key={x.n} className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 relative overflow-hidden">
            <div style={{ height: 3, background: x.c, position: "absolute", top: 0, left: 0, right: 0 }} />
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: T.text, marginBottom: 8 }}>{x.n}</div>
            <div className="font-serif" style={{ fontSize: "2.2rem", color: x.c, marginBottom: 20 }}>{money(x.b)}</div>
            <div className="flex gap-2"><Btn label="Deposit" color={T.ok} variant="outline" onClick={() => openModal("cushion", { person: x.p, type: "add" })} /><Btn label="Withdraw" color={T.bad} variant="danger" onClick={() => openModal("cushion", { person: x.p, type: "withdraw" })} /></div>
          </div>
        ))}
      </div>
      {cushion.length > 0 && <><div style={{ fontWeight: 700, fontSize: "0.82rem", color: T.text2, marginBottom: 14 }}>History</div><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{cushion.map(c => { const isAdd = c.type === "add"; return (<div key={c.id} className="bg-white rounded-xl border border-gray-100 flex items-center gap-3 px-4 py-3"><div style={{ width: 8, height: 8, borderRadius: "50%", background: isAdd ? T.ok : T.bad, flexShrink: 0 }} /><div style={{ flex: 1 }}><span style={{ fontSize: "0.78rem", fontWeight: 600 }}>{PERSON[c.person]?.name} <span style={{ color: isAdd ? T.ok : T.bad }}>{isAdd ? "+" : "−"}{money(c.amount)}</span></span><div style={{ fontSize: "0.6rem", color: T.text4 }}>{shortDate(c.date)}{c.note ? ` — ${c.note}` : ""}</div></div></div>); })}</div></>}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // TAB: DATE NIGHT
  // ══════════════════════════════════════════════════════════════════
  const DateNightView = () => {
    const armC = datenight.filter(e => e.type === "contrib" && e.person === "armaan").reduce((s, e) => s + e.amount, 0);
    const layC = datenight.filter(e => e.type === "contrib" && e.person === "layla").reduce((s, e) => s + e.amount, 0);
    const spends = datenight.filter(e => e.type === "spend");
    const contribs = datenight.filter(e => e.type === "contrib");
    return (
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div className="bg-white rounded-2xl border border-gray-200 p-7 text-center mb-7 relative overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${T.shared}, ${T.shared}88)`, position: "absolute", top: 0, left: 0, right: 0 }} />
          <div className="text-3xl mb-2">💕</div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: T.text3, marginBottom: 10 }}>Date Night Fund</div>
          <div className="font-serif" style={{ fontSize: "3rem", color: T.shared, lineHeight: 1 }}>{money(dnBal)}</div>
          <div className="flex justify-center gap-8 mt-6 mb-7">
            {[{ n: "Armaan", v: armC, c: T.armaan }, { n: "Layla", v: layC, c: T.layla }].map((x, i) => (<Fragment key={x.n}>{i > 0 && <div style={{ width: 1, background: T.borderSoft, alignSelf: "stretch" }} />}<div><div style={{ fontSize: "0.6rem", fontWeight: 600, color: T.text4 }}>{x.n}</div><div className="font-mono" style={{ fontSize: "1rem", fontWeight: 600, color: x.c, marginTop: 3 }}>{money(x.v)}</div></div></Fragment>))}
          </div>
          <div className="flex gap-2.5 justify-center"><Btn label="Contribute" color={T.ok} variant="outline" onClick={() => openModal("dnContrib", { person: "both", amount: "", note: "" })} /><Btn label="Log a Date" color={T.shared} onClick={() => openModal("dnSpend", { amount: "", note: "" })} /></div>
        </div>
        {spends.length > 0 && <><div style={{ fontWeight: 700, fontSize: "0.82rem", color: T.text2, marginBottom: 14 }}>Past Dates</div><div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>{[...spends].reverse().map(e => (<div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: T.sharedSoft, borderRadius: 14, border: `1px solid ${T.sharedMid}50` }}><span className="text-xl">🍷</span><div style={{ flex: 1 }}><div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{money(e.amount)}{e.note ? <span style={{ fontWeight: 400, color: T.text3 }}> — {e.note}</span> : ""}</div><div style={{ fontSize: "0.6rem", color: T.text4 }}>{shortDate(e.date)}</div></div></div>))}</div></>}
        {contribs.length > 0 && <><div style={{ fontWeight: 700, fontSize: "0.82rem", color: T.text2, marginBottom: 14 }}>Contributions</div><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{[...contribs].reverse().map(e => (<div key={e.id} className="bg-white rounded-xl border border-gray-100 flex items-center gap-3 px-4 py-2.5"><div style={{ width: 8, height: 8, borderRadius: "50%", background: T.ok }} /><div style={{ flex: 1 }}><span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{PERSON[e.person]?.name} <span style={{ color: T.ok }}>+{money(e.amount)}</span></span><div style={{ fontSize: "0.55rem", color: T.text4 }}>{shortDate(e.date)}{e.note ? ` — ${e.note}` : ""}</div></div></div>))}</div></>}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // TAB: SETTINGS
  // ══════════════════════════════════════════════════════════════════
  const SettingsView = () => {
    const [local, setLocal] = useState({ ...config }); const dirty = JSON.stringify(local) !== JSON.stringify(config);
    const set = (k: string, v: string) => setLocal((p: any) => ({ ...p, [k]: Number(v) }));
    return (
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.15rem", color: T.text, marginBottom: 24 }}>Settings</h2>
        <div className="grid gap-5">
          <Field label="Monthly Allowance ($)"><Input value={local.allowance} onChange={(v: string) => set("allowance", v)} /></Field>
          <Field label="Savings Deduction ($/month)"><Input value={local.savings} onChange={(v: string) => set("savings", v)} /></Field>
          <Field label="Date Night ($/week each)"><Input value={local.dnWeekly} onChange={(v: string) => set("dnWeekly", v)} /></Field>
          <Field label="Weeks per Month"><div className="flex gap-2">{[4, 5].map(w => (<button key={w} onClick={() => setLocal((p: any) => ({ ...p, weekMode: w }))} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1.5px solid ${local.weekMode === w ? T.armaan : T.border}`, background: local.weekMode === w ? `${T.armaan}10` : "transparent", fontSize: "0.85rem", fontWeight: local.weekMode === w ? 700 : 500, color: local.weekMode === w ? T.armaan : T.text4, cursor: "pointer" }}>{w} wks</button>))}</div></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="On Track %"><Input value={(local.paceOk * 100).toFixed(0)} onChange={(v: string) => set("paceOk", String(Number(v) / 100))} /></Field><Field label="Tight %"><Input value={(local.paceTight * 100).toFixed(0)} onChange={(v: string) => set("paceTight", String(Number(v) / 100))} /></Field></div>
          {dirty && <Btn label="Save Changes" color={T.armaan} wide onClick={async () => { await api("update", "settings", local); setConfig(local); toast("Saved"); }} />}
          <div style={{ height: 1, background: T.border }} />
          <Btn label="Reset to Demo Data" color={T.bad} variant="danger" wide onClick={async () => { if (!confirm("Reset all data?")) return; await api("reset", "all", {}); toast("Reset"); fetchData(); }} />
          <Btn label="Log Out" color={T.text3} variant="outline" wide onClick={logout} />
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; }
        body { font-family: 'Sora', system-ui, sans-serif; }
        .font-serif { font-family: 'Instrument Serif', Georgia, serif; }
        .font-mono { font-family: 'DM Mono', monospace; }
        input:focus { border-color: ${theme.accent} !important; box-shadow: 0 0 0 3px ${theme.accent}18 !important; outline: none; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type="number"] { -moz-appearance: textfield; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }
        @keyframes tabEnter { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .animate-tab { animation: tabEnter 0.25s ease; }
        .animate-modal { animation: slideUp 0.35s cubic-bezier(0.2, 1, 0.3, 1); }
        .animate-toast { animation: toastIn 0.3s ease; }
        .animate-fade { animation: fadeIn 0.5s ease; }
        @media (max-width: 740px) { .desk-nav { display: none !important; } }
        @media (min-width: 741px) { .mob-nav { display: none !important; } }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: `${T.bg}EE`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs" style={{ background: `linear-gradient(135deg, ${T.armaan}, ${T.layla})` }}>A&L</div>
            <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>Finance</span>
            <span style={{ fontSize: "0.8rem", marginLeft: 2 }}>{theme.emoji}</span>
          </div>
          <nav className="desk-nav" style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => (<button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t.key ? `${theme.accent}10` : "transparent", fontSize: "0.75rem", fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? theme.accent : T.text4 }}>{t.label}</button>))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-6 pb-28">
        {/* ════════ OVERVIEW ════════ */}
        {tab === "overview" && (
          <div className="animate-tab" key={`ov-${viewMonth}`}>

            {/* Theme Banner */}
            <div style={{ padding: "18px 22px", borderRadius: 16, background: theme.gradient, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{theme.emoji}</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: T.text }}>{theme.greeting}</div>
                <div style={{ fontSize: "0.65rem", fontWeight: 500, color: T.text3, marginTop: 2 }}>{theme.flavor} · {mkName(viewMonth)}</div>
              </div>
              {isCur && <div style={{ textAlign: "right" }}><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Day {vDayNum} of {vTotalDays}</div><div style={{ width: 100, marginTop: 6 }}><Bar value={vDayNum} max={vTotalDays} color={theme.accent} h={5} /></div></div>}
            </div>

            <MonthNav />

            {!isCur && <div style={{ padding: "10px 16px", background: `${theme.accent}08`, borderRadius: 12, border: `1px solid ${theme.accent}20`, marginBottom: 16, fontSize: "0.72rem", fontWeight: 600, color: theme.accent }}>📅 Viewing {mkName(viewMonth)} — totals are final</div>}

            {/* Household strip */}
            <div className="bg-white rounded-2xl border border-gray-200 flex items-center gap-4 flex-wrap p-4 px-5 mb-5">
              <div className="flex-1" style={{ minWidth: 160 }}><div style={{ fontSize: "0.6rem", fontWeight: 600, color: T.text4, marginBottom: 4 }}>Household Remaining</div><div className="font-serif" style={{ fontSize: "1.65rem", color: hRem >= 0 ? T.text : T.bad }}>{money(hRem)}</div></div>
              <div className="flex gap-4 items-center flex-wrap">
                <div><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Budget</div><div className="font-mono" style={{ fontSize: "0.88rem", fontWeight: 500 }}>{money(hBudget)}</div></div>
                <div><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Spent</div><div className="font-mono" style={{ fontSize: "0.88rem", fontWeight: 500 }}>{money(hSpent)}</div></div>
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: hs.color, background: hs.bg, padding: "4px 12px", borderRadius: 100 }}>{hs.label}</span>
              </div>
            </div>

            {/* Person Cards */}
            <div className="flex flex-col sm:flex-row gap-5 mb-5"><PersonCard person="armaan" data={arm} /><PersonCard person="layla" data={lay} /></div>

            {/* Dad Card */}
            <div className="mb-5"><DadCard /></div>

            {/* Category Breakdown */}
            {(arm.spent > 0 || lay.spent > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: T.text, marginBottom: 16 }}>Where the Money Goes {theme.emoji}</div>
                <div className="flex flex-col sm:flex-row gap-8">
                  {arm.spent > 0 && <div style={{ flex: 1 }}><CatBreakdown byCat={arm.byCat} color={T.armaan} name="Armaan" /></div>}
                  {lay.spent > 0 && <div style={{ flex: 1 }}><CatBreakdown byCat={lay.byCat} color={T.layla} name="Layla" /></div>}
                </div>
              </div>
            )}

            {/* Monthly Trends (last 6 months bar chart) */}
            {trendData.some(d => d.total > 0) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: T.text, marginBottom: 4 }}>Monthly Trends</div>
                <div style={{ fontSize: "0.6rem", color: T.text4, marginBottom: 16 }}>Household spending over the last 6 months</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                  {(() => { const mx = Math.max(...trendData.map(d => d.total), 1); return trendData.map(d => {
                    const active = d.mk === viewMonth;
                    const h = d.total > 0 ? Math.max(12, (d.total / mx) * 100) : 4;
                    return (
                      <div key={d.mk} onClick={() => { if (d.mk <= curMK && d.total > 0) setViewMonth(d.mk); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: d.mk <= curMK && d.total > 0 ? "pointer" : "default" }}>
                        <div className="font-mono" style={{ fontSize: "0.5rem", fontWeight: 600, color: T.text3 }}>{d.total > 0 ? money(d.total) : ""}</div>
                        <div style={{ width: "100%", maxWidth: 48, display: "flex", flexDirection: "column", gap: 1 }}>
                          <div style={{ height: d.armaan > 0 ? Math.max(3, (d.armaan / mx) * 100) : 0, background: T.armaan, borderRadius: "4px 4px 0 0", opacity: active ? 1 : 0.6, transition: "height 0.6s" }} />
                          <div style={{ height: d.layla > 0 ? Math.max(3, (d.layla / mx) * 100) : 0, background: T.layla, borderRadius: "0 0 4px 4px", opacity: active ? 1 : 0.6, transition: "height 0.6s" }} />
                          {d.total === 0 && <div style={{ height: 4, background: T.borderSoft, borderRadius: 4 }} />}
                        </div>
                        <div style={{ fontSize: "0.55rem", fontWeight: active ? 700 : 500, color: active ? theme.accent : T.text4 }}>{mkShort(d.mk)}</div>
                      </div>
                    );
                  }); })()}
                </div>
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
                  {[{ l: "Armaan", c: T.armaan }, { l: "Layla", c: T.layla }].map(x => (<div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.55rem", fontWeight: 600, color: T.text3 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />{x.l}</div>))}
                </div>
              </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: T.text, marginBottom: 14 }}>💡 Insights</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {insights.map((ins, i) => {
                    const c = { good: { bg: T.okSoft, b: T.okBorder, t: T.ok }, warn: { bg: T.warnSoft, b: T.warnBorder, t: T.warn }, bad: { bg: T.badSoft, b: T.badBorder, t: T.bad }, info: { bg: T.borderSoft, b: T.border, t: T.text2 } }[ins.type] || { bg: T.borderSoft, b: T.border, t: T.text2 };
                    return <div key={i} style={{ padding: "10px 14px", background: c.bg, borderRadius: 12, border: `1px solid ${c.b}`, display: "flex", alignItems: "center", gap: 10, fontSize: "0.72rem", fontWeight: 600, color: c.t }}><span style={{ fontSize: "1rem" }}>{ins.icon}</span>{ins.text}</div>;
                  })}
                </div>
              </div>
            )}

            {/* Next Month Preview */}
            {isCur && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5" style={{ background: nextTheme.gradient }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: "1.3rem" }}>{nextTheme.emoji}</span>
                  <div><div style={{ fontSize: "0.82rem", fontWeight: 700, color: T.text }}>Coming Up: {mkName(nextMk(viewMonth))}</div><div style={{ fontSize: "0.62rem", color: T.text3 }}>{nextTheme.flavor} · {nextTheme.greeting}</div></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 14 }}>
                  <div style={{ background: "rgba(255,255,255,0.7)", padding: "12px 14px", borderRadius: 12 }}><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Budget Each</div><div className="font-serif" style={{ fontSize: "1.15rem", color: T.text, marginTop: 4 }}>{money(budget)}</div></div>
                  <div style={{ background: "rgba(255,255,255,0.7)", padding: "12px 14px", borderRadius: 12 }}><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Savings</div><div className="font-serif" style={{ fontSize: "1.15rem", color: T.ok, marginTop: 4 }}>{money(config.savings)}</div></div>
                  <div style={{ background: "rgba(255,255,255,0.7)", padding: "12px 14px", borderRadius: 12 }}><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Date Night</div><div className="font-serif" style={{ fontSize: "1.15rem", color: T.shared, marginTop: 4 }}>{money(config.dnWeekly * wks)}</div></div>
                </div>
              </div>
            )}

            {/* Past Months Archive */}
            {pastMonths.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: T.text, marginBottom: 14 }}>📁 Past Months</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                  {pastMonths.map(mk => {
                    const th = getTheme(mk);
                    const entries = checkins.filter(c => c.date.startsWith(mk));
                    const total = entries.reduce((s, c) => s + c.amount, 0);
                    const ov = total > hBudget;
                    return (
                      <button key={mk} onClick={() => setViewMonth(mk)} style={{ padding: "14px 12px", borderRadius: 14, border: `1px solid ${T.border}`, background: th.gradient, cursor: "pointer", textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ fontSize: "0.9rem" }}>{th.emoji}</span><span style={{ fontSize: "0.7rem", fontWeight: 700, color: T.text }}>{mkShort(mk)}</span></div>
                        <div className="font-mono" style={{ fontSize: "0.78rem", fontWeight: 600, color: ov ? T.bad : T.text }}>{money(total)}</div>
                        <div style={{ fontSize: "0.5rem", color: T.text4, marginTop: 2 }}>{entries.length} check-ins · {ov ? "Over" : "Under"} budget</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div onClick={() => setTab("cushion")} className="flex-1 bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-all" style={{ minWidth: 260 }}>
                <div className="flex items-center gap-2 mb-4"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ok} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg><span style={{ fontWeight: 700, fontSize: "0.8rem" }}>Cushion</span><span className="ml-auto" style={{ fontSize: "0.6rem", color: T.text4 }}>→</span></div>
                <div className="flex gap-6"><div><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Armaan</div><div className="font-serif" style={{ fontSize: "1.2rem", color: T.armaan }}>{money(armCush)}</div></div><div><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Layla</div><div className="font-serif" style={{ fontSize: "1.2rem", color: T.layla }}>{money(layCush)}</div></div></div>
              </div>
              <div onClick={() => setTab("datenight")} className="flex-1 bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-all" style={{ minWidth: 260 }}>
                <div className="flex items-center gap-2 mb-4"><span className="text-base">💕</span><span style={{ fontWeight: 700, fontSize: "0.8rem" }}>Date Night</span><span className="ml-auto" style={{ fontSize: "0.6rem", color: T.text4 }}>→</span></div>
                <div className="font-serif" style={{ fontSize: "1.2rem", color: T.shared }}>{money(dnBal)}</div>
                <div style={{ fontSize: "0.6rem", color: T.text4, marginTop: 4 }}>{datenight.filter(e => e.type === "spend").length} dates logged</div>
              </div>
            </div>
          </div>
        )}

        {tab === "log" && <div className="animate-tab" key="log"><LogView /></div>}
        {tab === "cushion" && <div className="animate-tab" key="cu"><CushionView /></div>}
        {tab === "datenight" && <div className="animate-tab" key="dn"><DateNightView /></div>}
        {tab === "settings" && <div className="animate-tab" key="st"><SettingsView /></div>}
      </main>

      {/* Mobile nav */}
      <nav className="mob-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: `${T.bg}F5`, backdropFilter: "blur(16px)", borderTop: `1px solid ${T.border}`, padding: "6px 0 env(safe-area-inset-bottom, 8px)", display: "flex", justifyContent: "space-around" }}>
        {TABS.map(t => (<button key={t.key} onClick={() => setTab(t.key)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === t.key ? theme.accent : T.text4, minWidth: 48 }}><span style={{ opacity: tab === t.key ? 1 : 0.4 }}><NavIcon name={t.icon} size={20} /></span><span style={{ fontSize: "0.5rem", fontWeight: tab === t.key ? 700 : 500 }}>{t.label.split(" ")[0]}</span></button>))}
      </nav>

      {/* ════════ MODALS ════════ */}
      <Modal open={modal === "checkin"} onClose={closeModal} title="Check In" accent={PERSON[form.person]?.color}>
        <div className="grid gap-4">
          <PersonPicker value={form.person} onChange={v => upd("person", v)} />
          <Field label="Amount Spent"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} placeholder="0" accent={PERSON[form.person]?.color} autoFocus /></Field>
          <CategoryPicker value={form.category || "other"} onChange={v => upd("category", v)} />
          <Field label="Date"><Input type="date" value={form.date || today()} onChange={(v: string) => upd("date", v)} /></Field>
          <Field label="Note (optional)"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} placeholder="What was it for?" /></Field>
          <Btn label="Log Check-in" color={PERSON[form.person]?.color || T.armaan} wide onClick={addCheckin} disabled={!form.amount || Number(form.amount) <= 0} />
        </div>
      </Modal>

      <Modal open={modal === "editCI"} onClose={closeModal} title="Edit Entry" accent={PERSON[form.person]?.color}>
        <div className="grid gap-4">
          <Field label="Amount"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} accent={T.armaan} autoFocus /></Field>
          <CategoryPicker value={form.category || "other"} onChange={v => upd("category", v)} />
          <Field label="Date"><Input type="date" value={form.date || ""} onChange={(v: string) => upd("date", v)} /></Field>
          <Field label="Note"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} /></Field>
          <Btn label="Save" color={T.armaan} wide onClick={saveCheckin} />
        </div>
      </Modal>

      <Modal open={modal === "laylaRec"} onClose={closeModal} title="Update Received from Dad" accent={T.layla}>
        <div className="grid gap-4"><Field label={`Amount received for ${mkName(viewMonth)}`}><Input value={form.amount ?? ""} onChange={(v: string) => upd("amount", v)} accent={T.layla} autoFocus /></Field><Btn label="Update" color={T.layla} wide onClick={updateLaylaRec} /></div>
      </Modal>

      <Modal open={modal === "cushion"} onClose={closeModal} title={`Cushion ${form.type === "add" ? "Deposit" : "Withdrawal"}`} accent={form.type === "add" ? T.ok : T.bad}>
        <div className="grid gap-4"><PersonPicker value={form.person} onChange={v => upd("person", v)} /><Field label="Amount"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} placeholder="0" accent={form.type === "add" ? T.ok : T.bad} autoFocus /></Field><Field label="Note (optional)"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} placeholder="Reason" /></Field><Btn label={form.type === "add" ? "Deposit" : "Withdraw"} color={form.type === "add" ? T.ok : T.bad} wide onClick={addCushionEntry} disabled={!form.amount || Number(form.amount) <= 0} /></div>
      </Modal>

      <Modal open={modal === "dnContrib"} onClose={closeModal} title="Contribute" accent={T.ok}>
        <div className="grid gap-4"><PersonPicker value={form.person} onChange={v => upd("person", v)} options={["armaan", "layla", "both"]} /><Field label="Amount per person"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} placeholder="50" accent={T.ok} /></Field><Field label="Note"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} placeholder="Week 3" /></Field><Btn label="Contribute" color={T.ok} wide onClick={addDNContrib} disabled={!form.amount || Number(form.amount) <= 0 || !form.person} /></div>
      </Modal>

      <Modal open={modal === "dnSpend"} onClose={closeModal} title="Log a Date Night 💕" accent={T.shared}>
        <div className="grid gap-4"><Field label="Total spent together"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} placeholder="0" accent={T.shared} autoFocus /></Field><Field label="Where'd you go?"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} placeholder="Italian restaurant..." /></Field><Btn label="Log Date Night" color={T.shared} wide onClick={addDNSpend} disabled={!form.amount || Number(form.amount) <= 0} /></div>
      </Modal>

      <Toaster />
    </div>
  );
}
