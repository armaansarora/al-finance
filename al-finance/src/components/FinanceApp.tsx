"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   A&L FINANCE — Main Client Component
   
   Color Identity:
     Armaan → #2563EB (Royal Blue)     Layla → #7C3AED (Amethyst)
     Shared → #E11D48 (Rose)           Good → #059669   Warn → #D97706   Bad → #DC2626
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Helpers ──────────────────────────────────────────────────────────────
const mkey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
const today = () => new Date().toISOString().slice(0, 10);
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const money = (n: number) => {
  const a = Math.abs(n), s = a >= 1000 ? a.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : a.toFixed(a % 1 === 0 ? 0 : 2);
  return n < 0 ? `-$${s}` : `$${s}`;
};
const shortDate = (s: string) => parse(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const pct = (v: number, t: number) => t > 0 ? Math.min(Math.max(v / t, 0), 1) : 0;

// ── Types ────────────────────────────────────────────────────────────────
interface Checkin { id: string; person: string; date: string; amount: number; note: string; }
interface CushionEntry { id: string; person: string; date: string; amount: number; type: string; note: string; }
interface DateNightEntry { id: string; person: string; date: string; amount: number; type: string; note: string; }
interface Settings { allowance: number; savings: number; dnWeekly: number; weekMode: number; paceOk: number; paceTight: number; }

// ── Color Tokens ─────────────────────────────────────────────────────────
const T = {
  armaan: "#2563EB", armaanSoft: "#EFF6FF", armaanBold: "#1D4ED8",
  layla: "#7C3AED", laylaSoft: "#F5F3FF", laylaMid: "#DDD6FE", laylaBold: "#6D28D9",
  shared: "#E11D48", sharedSoft: "#FFF1F2", sharedMid: "#FECDD3",
  ok: "#059669", okSoft: "#ECFDF5", okBorder: "#6EE7B7",
  warn: "#D97706", warnSoft: "#FFFBEB", warnBorder: "#FDE68A",
  bad: "#DC2626", badSoft: "#FEF2F2", badBorder: "#FECACA",
  bg: "#F9FAFB", card: "#FFFFFF", border: "#E5E7EB", borderSoft: "#F3F4F6",
  text: "#111827", text2: "#374151", text3: "#6B7280", text4: "#9CA3AF",
};

const PERSON: Record<string, { name: string; color: string; soft: string; bold: string; initial: string }> = {
  armaan: { name: "Armaan", color: T.armaan, soft: T.armaanSoft, bold: T.armaanBold, initial: "A" },
  layla: { name: "Layla", color: T.layla, soft: T.laylaSoft, bold: T.laylaBold, initial: "L" },
};

// ── API helper ───────────────────────────────────────────────────────────
async function api(action: string, table: string, data: any = {}) {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, table, data }),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// ── SVG Budget Ring ──────────────────────────────────────────────────────
function BudgetRing({ spent, budget, color, size = 152 }: { spent: number; budget: number; color: string; size?: number }) {
  const sw = 7, r = (size - sw * 2) / 2, circ = 2 * Math.PI * r;
  const ratio = budget > 0 ? Math.min(spent / budget, 1.2) : 0;
  const offset = circ - Math.min(ratio, 1) * circ;
  const remaining = budget - spent;
  const ringColor = ratio > 1 ? T.bad : ratio > 0.85 ? T.warn : color;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.borderSoft} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke 0.5s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="font-serif" style={{ fontSize: "2.1rem", fontWeight: 400, color: remaining >= 0 ? T.text : T.bad, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {money(remaining)}
        </div>
        <div className="font-sans" style={{ fontSize: "0.6rem", fontWeight: 500, color: T.text4, marginTop: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          remaining
        </div>
      </div>
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────
function ProgressBar({ value, max, color, h = 6, bg }: { value: number; max: number; color: string; h?: number; bg?: string }) {
  return (
    <div style={{ height: h, background: bg || T.borderSoft, borderRadius: h, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct(value, max) * 100}%`, background: color, borderRadius: h, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

// ── Week Bars ────────────────────────────────────────────────────────────
function WeekBars({ checkins, color }: { checkins: Checkin[]; color: string }) {
  const weeks = [0, 0, 0, 0, 0];
  checkins.forEach(c => { const w = Math.min(Math.floor((parse(c.date).getDate() - 1) / 7), 4); weeks[w] += c.amount; });
  const mx = Math.max(...weeks, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 44 }}>
      {["W1", "W2", "W3", "W4", "W5"].map((label, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%", maxWidth: 32, borderRadius: "4px 4px 2px 2px",
            height: weeks[i] > 0 ? `${Math.max(10, (weeks[i] / mx) * 36)}px` : "3px",
            background: weeks[i] > 0 ? color : T.borderSoft,
            opacity: weeks[i] > 0 ? 0.35 + (0.65 * weeks[i] / mx) : 0.3,
            transition: "height 0.6s cubic-bezier(.4,0,.2,1)",
          }} />
          <span className="font-mono" style={{ fontSize: "0.5rem", fontWeight: 500, color: T.text4 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Pace Badge ───────────────────────────────────────────────────────────
function PaceBadge({ status }: { status: string }) {
  const m: Record<string, { l: string; c: string; bg: string; b: string }> = {
    ok: { l: "On Track", c: T.ok, bg: T.okSoft, b: T.okBorder },
    tight: { l: "Tight", c: T.warn, bg: T.warnSoft, b: T.warnBorder },
    over: { l: "Over Budget", c: T.bad, bg: T.badSoft, b: T.badBorder },
  };
  const s = m[status] || m.ok;
  return (
    <span className="font-sans" style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 100,
      fontSize: "0.6rem", fontWeight: 600, color: s.c, background: s.bg, border: `1px solid ${s.b}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.c }} />{s.l}
    </span>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────
function useToast() {
  const [t, setT] = useState<{ msg: string; v: string } | null>(null);
  const timer = useRef<any>(null);
  const show = useCallback((msg: string, v = "success") => { setT({ msg, v }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 3000); }, []);
  const colors: Record<string, string> = { success: T.ok, error: T.bad, info: T.armaan };
  const icons: Record<string, string> = { success: "✓", error: "✕", info: "i" };
  const Toaster = () => t ? (
    <div className="animate-toast" style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 999,
      background: colors[t.v] || T.ok, color: "#fff", padding: "11px 24px 11px 18px", borderRadius: 12,
      fontSize: "0.8rem", fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800,
      }}>{icons[t.v]}</span>{t.msg}
    </div>
  ) : null;
  return { show, Toaster };
}

// ── Modal ────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, accent, children }: { open: boolean; onClose: () => void; title: string; accent?: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.45)", backdropFilter: "blur(6px)" }} />
      <div className="animate-modal" onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{
        position: "relative", background: T.card, borderRadius: 20, maxWidth: 440, width: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
      }}>
        {accent && <div style={{ height: 3, borderRadius: "20px 20px 0 0", background: accent }} />}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 className="font-sans" style={{ fontSize: "1.05rem", fontWeight: 700, color: T.text }}>{title}</h3>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none", background: T.borderSoft, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: T.text3,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Form helpers ─────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="font-sans" style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, color: T.text3, marginBottom: 6 }}>{label}</label>{children}</div>;
}

function Input({ value, onChange, type = "number", placeholder, accent, autoFocus }: any) {
  return (
    <input type={type} value={value} placeholder={placeholder} autoFocus={autoFocus}
      onChange={(e: any) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${accent ? `${accent}50` : T.border}`,
        background: accent ? `${accent}06` : T.borderSoft,
        fontFamily: type === "text" || type === "date" ? "'Sora', sans-serif" : "'DM Mono', monospace",
        fontSize: type === "text" ? "0.88rem" : "1rem", fontWeight: 500, color: T.text, outline: "none", boxSizing: "border-box" as const,
      }} />
  );
}

function PersonPicker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options?: string[] }) {
  const opts = options || ["armaan", "layla"];
  return (
    <Field label="Person">
      <div style={{ display: "flex", gap: 6 }}>
        {opts.map(p => {
          const c = p === "both" ? T.shared : PERSON[p]?.color || T.text3;
          const active = value === p;
          return (
            <button key={p} onClick={() => onChange(p)} style={{
              flex: 1, padding: "11px 8px", borderRadius: 12, border: `1.5px solid ${active ? c : T.border}`,
              background: active ? `${c}10` : "transparent", fontFamily: "'Sora', sans-serif",
              fontSize: "0.82rem", fontWeight: active ? 700 : 500, color: active ? c : T.text3,
              cursor: "pointer", textTransform: "capitalize" as const,
            }}>{p === "both" ? "Both" : PERSON[p]?.name || p}</button>
          );
        })}
      </div>
    </Field>
  );
}

function Btn({ label, color, onClick, disabled, wide, variant = "solid" }: any) {
  const isSolid = variant === "solid";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "12px 24px", borderRadius: 12, cursor: disabled ? "default" : "pointer",
      fontFamily: "'Sora', sans-serif", fontSize: "0.82rem", fontWeight: 700,
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      width: wide ? "100%" : "auto",
      background: isSolid ? color : "transparent",
      border: `1.5px solid ${isSolid ? color : variant === "danger" ? `${T.bad}40` : `${color}40`}`,
      color: isSolid ? "#fff" : variant === "danger" ? T.bad : color,
      opacity: disabled ? 0.35 : 1, transition: "opacity 0.15s",
    }}>{label}</button>
  );
}

// ── Nav Icon ─────────────────────────────────────────────────────────────
function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
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
// MAIN APP COMPONENT
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
  const { show: toast, Toaster } = useToast();

  // ── Fetch all data from server ─────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/data");
      if (res.status === 401) { window.location.reload(); return; }
      const data = await res.json();
      setCheckins(data.checkins || []);
      setCushion(data.cushion || []);
      setDatenight(data.datenight || []);
      setConfig(data.settings || config);
      setLaylaRec(data.laylaReceived || {});
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh when tab becomes visible (so you see the other person's changes)
  useEffect(() => {
    const handler = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [fetchData]);

  // ── Time calculations ──────────────────────────────────────────────
  const now = new Date();
  const curMK = mkey(now);
  const year = now.getFullYear(), month = now.getMonth() + 1;
  const totalDays = daysIn(year, month), dayNum = now.getDate(), daysLeft = totalDays - dayNum + 1;
  const monthProg = dayNum / totalDays;
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const wks = config.weekMode || 4;
  const deductions = config.savings + config.dnWeekly * wks;
  const budget = config.allowance - deductions;

  // ── Per-person calculations ────────────────────────────────────────
  const calcPerson = useCallback((person: string) => {
    const entries = checkins.filter(c => c.person === person && c.date.startsWith(curMK));
    const spent = entries.reduce((s, c) => s + c.amount, 0);
    const remaining = budget - spent;
    const perDay = daysLeft > 0 ? remaining / daysLeft : 0;
    const perWeek = daysLeft > 0 ? (remaining / daysLeft) * 7 : 0;
    const expected = budget * (dayNum / totalDays);
    const ratio = budget > 0 ? (spent - expected) / budget : 0;
    let pace = "ok";
    if (ratio > config.paceTight) pace = "over";
    else if (ratio > config.paceOk) pace = "tight";
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const last = sorted[0] || null;
    const daysSince = last ? Math.floor((now.getTime() - parse(last.date).getTime()) / 86400000) : null;
    return { entries, spent, remaining, perDay, perWeek, pace, last, daysSince };
  }, [checkins, curMK, budget, daysLeft, dayNum, totalDays, config, now]);

  const arm = useMemo(() => calcPerson("armaan"), [calcPerson]);
  const lay = useMemo(() => calcPerson("layla"), [calcPerson]);

  const laylaRecAmt = laylaRec[curMK] || 0;
  const laylaStillExp = Math.max(0, config.allowance - laylaRecAmt);

  const cushBal = useCallback((p: string) => cushion.filter(c => c.person === p).reduce((s, c) => c.type === "add" ? s + c.amount : s - c.amount, 0), [cushion]);
  const armCush = useMemo(() => cushBal("armaan"), [cushBal]);
  const layCush = useMemo(() => cushBal("layla"), [cushBal]);
  const dnBal = useMemo(() => datenight.reduce((s, e) => e.type === "contrib" ? s + e.amount : s - e.amount, 0), [datenight]);

  const hSpent = arm.spent + lay.spent, hBudget = budget * 2, hRem = arm.remaining + lay.remaining;
  const hRatio = hBudget > 0 ? hSpent / (hBudget * monthProg || 1) : 0;
  const hStatus = hRatio > 1.12 ? "over" : hRatio > 1.05 ? "tight" : "ok";

  // ── Modal helpers ──────────────────────────────────────────────────
  const openModal = (name: string, data: any = {}) => { setForm(data); setModal(name); };
  const closeModal = () => { setModal(null); setForm({}); setEditId(null); };
  const upd = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  // ── API actions (mutate then refetch) ──────────────────────────────
  const act = async (action: string, table: string, data: any, msg: string, variant = "success") => {
    try {
      await api(action, table, data);
      toast(msg, variant);
      await fetchData();
    } catch {
      toast("Something went wrong", "error");
    }
  };

  const addCheckin = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return;
    act("create", "checkin", { person: form.person, date: form.date || today(), amount: amt, note: form.note || "" },
      `${money(amt)} logged for ${PERSON[form.person]?.name || form.person}`);
    closeModal();
  };

  const saveCheckin = () => {
    if (!editId || !form.amount) return;
    act("update", "checkin", { id: editId, amount: Number(form.amount), date: form.date, note: form.note ?? "" }, "Entry updated");
    closeModal();
  };

  const deleteCheckin = (cid: string) => { act("delete", "checkin", { id: cid }, "Entry removed", "info"); };

  const addCushionEntry = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return;
    act("create", "cushion", { person: form.person, date: today(), amount: amt, type: form.type, note: form.note || "" },
      form.type === "add" ? `${money(amt)} deposited` : `${money(amt)} withdrawn`);
    closeModal();
  };

  const addDNContrib = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0 || !form.person) return;
    if (form.person === "both") {
      // Create two entries sequentially
      Promise.all([
        api("create", "datenight", { person: "armaan", date: today(), amount: amt, type: "contrib", note: form.note || "" }),
        api("create", "datenight", { person: "layla", date: today(), amount: amt, type: "contrib", note: form.note || "" }),
      ]).then(() => { toast("Contribution added"); fetchData(); }).catch(() => toast("Error", "error"));
    } else {
      act("create", "datenight", { person: form.person, date: today(), amount: amt, type: "contrib", note: form.note || "" }, "Contribution added");
    }
    closeModal();
  };

  const addDNSpend = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return;
    act("create", "datenight", { person: "both", date: today(), amount: amt, type: "spend", note: form.note || "" }, "Date night logged! 💕");
    closeModal();
  };

  const updateLaylaRec = () => {
    act("update", "laylaReceived", { monthKey: curMK, amount: Number(form.amount) || 0 }, "Updated");
    closeModal();
  };

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.reload();
  };

  // ── Nav ────────────────────────────────────────────────────────────
  const TABS = [
    { key: "overview", label: "Overview", icon: "grid" },
    { key: "log", label: "Log", icon: "list" },
    { key: "cushion", label: "Cushion", icon: "shield" },
    { key: "datenight", label: "Date Night", icon: "heart" },
    { key: "settings", label: "Settings", icon: "settings" },
  ];

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    ok: { label: "Healthy", color: T.ok, bg: T.okSoft },
    tight: { label: "Watch It", color: T.warn, bg: T.warnSoft },
    over: { label: "Over Pace", color: T.bad, bg: T.badSoft },
  };
  const hs = statusMap[hStatus];

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center animate-fade" style={{ background: T.bg }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-extrabold text-sm"
          style={{ background: `linear-gradient(135deg, ${T.armaan}, ${T.layla})` }}>A&L</div>
        <div className="text-sm font-medium" style={{ color: T.text4 }}>Loading...</div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // PERSON CARD
  // ══════════════════════════════════════════════════════════════════
  const PersonCard = ({ person, data }: { person: string; data: ReturnType<typeof calcPerson> }) => {
    const p = PERSON[person];
    const { spent, remaining, perDay, perWeek, pace, entries, last, daysSince } = data;
    const nudge = daysSince !== null && daysSince >= 3;
    return (
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ flex: 1, minWidth: 310 }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${p.color}, ${p.color}99)` }} />
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: p.soft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", color: p.color }}>{p.initial}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: T.text }}>{p.name}</div>
              <div style={{ fontSize: "0.65rem", fontWeight: 500, color: T.text4 }}>{monthName}</div>
            </div>
          </div>
          <PaceBadge status={pace} />
        </div>
        <div style={{ padding: "18px 24px 10px" }}><BudgetRing spent={spent} budget={budget} color={p.color} /></div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "4px 24px 16px" }}>
          {[{ l: "/ day", v: perDay }, { l: "/ week", v: perWeek }].map((x, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px 12px", background: T.bg, borderRadius: 12 }}>
              <div className="font-serif" style={{ fontSize: "1.2rem", color: x.v >= 0 ? T.text : T.bad }}>{money(x.v)}</div>
              <div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4, marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>
        {entries.length > 0 && (
          <div style={{ padding: "0 24px 14px" }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 600, color: T.text4, marginBottom: 6 }}>Spending by Week</div>
            <WeekBars checkins={entries} color={p.color} />
          </div>
        )}
        <div style={{ margin: "0 24px", padding: "14px 0", borderTop: `1px solid ${T.borderSoft}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[{ l: "Allowance", v: money(config.allowance), c: T.text2 }, { l: "Deductions", v: `-${money(deductions)}`, c: T.text4 }, { l: "Spent", v: money(spent), c: spent > budget ? T.bad : T.text }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>{s.l}</div>
              <div className="font-mono" style={{ fontSize: "0.88rem", fontWeight: 600, color: s.c, marginTop: 2 }}>{s.v}</div>
            </div>
          ))}
        </div>
        {nudge && (
          <div style={{ margin: "6px 24px 0", padding: "10px 14px", background: T.warnSoft, borderRadius: 12, border: `1px solid ${T.warnBorder}`, display: "flex", alignItems: "center", gap: 8, fontSize: "0.72rem", fontWeight: 600, color: T.warn }}>
            ⏰ {daysSince} days since last check-in
          </div>
        )}
        <div style={{ padding: "16px 24px 22px" }}>
          <button onClick={() => openModal("checkin", { person, date: today(), amount: "", note: "" })} style={{
            width: "100%", padding: "13px 20px", background: p.color, border: "none", borderRadius: 14, cursor: "pointer",
            fontSize: "0.85rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: `0 4px 14px ${p.color}30`, transition: "transform 0.15s, box-shadow 0.15s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Check In
          </button>
          {last && !nudge && (
            <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.62rem", color: T.text4 }}>
              Last: {shortDate(last.date)} ({daysSince === 0 ? "today" : `${daysSince}d ago`})
            </div>
          )}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // LAYLA DAD CARD
  // ══════════════════════════════════════════════════════════════════
  const DadCard = () => {
    const recPct = pct(laylaRecAmt, config.allowance);
    const done = laylaStillExp === 0;
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
        <div style={{ height: 3, background: `linear-gradient(90deg, ${T.layla}, ${T.layla}77)` }} />
        <div style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.laylaSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>💜</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: T.text }}>Layla&apos;s Allowance from Dad</div>
                <div style={{ fontSize: "0.65rem", fontWeight: 500, color: T.text4 }}>{monthName}</div>
              </div>
            </div>
            <button onClick={() => openModal("laylaRec", { amount: laylaRecAmt })} style={{
              padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${T.layla}40`, background: `${T.layla}08`,
              fontSize: "0.72rem", fontWeight: 700, color: T.layla, cursor: "pointer",
            }}>Update Amount</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ padding: "18px 20px", background: T.laylaSoft, borderRadius: 14 }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 600, color: T.layla, marginBottom: 6 }}>Received So Far</div>
              <div className="font-serif" style={{ fontSize: "1.8rem", color: T.laylaBold, lineHeight: 1 }}>{money(laylaRecAmt)}</div>
            </div>
            <div style={{ padding: "18px 20px", background: done ? T.okSoft : T.warnSoft, borderRadius: 14 }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 600, color: done ? T.ok : T.warn, marginBottom: 6 }}>{done ? "All Received!" : "Still Expected"}</div>
              <div className="font-serif" style={{ fontSize: "1.8rem", color: done ? T.ok : T.warn, lineHeight: 1 }}>{done ? "✓" : money(laylaStillExp)}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: T.text3 }}>Progress</span>
            <span className="font-mono" style={{ fontSize: "0.68rem", fontWeight: 700, color: T.layla }}>{Math.round(recPct * 100)}%</span>
          </div>
          <ProgressBar value={laylaRecAmt} max={config.allowance} color={T.layla} h={10} bg={`${T.laylaMid}50`} />
          <div style={{ fontSize: "0.62rem", color: T.text4, marginTop: 8 }}>{money(laylaRecAmt)} of {money(config.allowance)} received this month</div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // TAB: LOG
  // ══════════════════════════════════════════════════════════════════
  const LogView = () => {
    const [filter, setFilter] = useState("all");
    const filtered = checkins.filter(c => c.date.startsWith(curMK)).filter(c => filter === "all" || c.person === filter).sort((a, b) => b.date.localeCompare(a.date));
    const total = filtered.reduce((s, c) => s + c.amount, 0);
    return (
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: "1.15rem", color: T.text }}>{filtered.length} check-ins</h2>
            <div style={{ fontSize: "0.68rem", color: T.text4 }}>{money(total)} total this month</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[{ k: "all", l: "All", c: T.text2 }, { k: "armaan", l: "Armaan", c: T.armaan }, { k: "layla", l: "Layla", c: T.layla }].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} style={{
                padding: "6px 14px", borderRadius: 100, border: `1.5px solid ${filter === f.k ? f.c : T.border}`,
                background: filter === f.k ? `${f.c}10` : "transparent", fontSize: "0.7rem", fontWeight: filter === f.k ? 700 : 500,
                color: filter === f.k ? f.c : T.text4, cursor: "pointer",
              }}>{f.l}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 px-6">
            <div className="text-4xl mb-3">📝</div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: T.text2 }}>No check-ins yet</div>
            <div style={{ fontSize: "0.78rem", color: T.text4, marginTop: 4 }}>Head to Overview and tap &quot;Check In&quot;</div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map(c => {
              const pc = PERSON[c.person];
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 flex items-center gap-3.5 px-4 py-3.5 hover:shadow-sm transition-shadow">
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: pc?.soft || T.borderSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.78rem", color: pc?.color || T.text3, flexShrink: 0 }}>{c.person[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div><span className="font-mono" style={{ fontSize: "0.9rem", fontWeight: 600, color: T.text }}>{money(c.amount)}</span>{c.note && <span style={{ fontSize: "0.78rem", color: T.text3, marginLeft: 8 }}>{c.note}</span>}</div>
                    <div style={{ fontSize: "0.62rem", fontWeight: 500, color: T.text4, marginTop: 2, textTransform: "capitalize" }}>{c.person} · {shortDate(c.date)}</div>
                  </div>
                  <button onClick={() => { setEditId(c.id); openModal("editCI", { ...c }); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ border: "none", background: "transparent", cursor: "pointer", color: T.text4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button onClick={() => deleteCheckin(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors" style={{ border: "none", background: "transparent", cursor: "pointer", color: T.text4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              );
            })}
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
            <div style={{ height: 3, background: x.c, position: "absolute", top: 0, left: 0, right: 0, borderRadius: "16px 16px 0 0" }} />
            <div className="flex items-center gap-2.5 mb-4">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: x.s, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={x.c} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: T.text }}>{x.n}</span>
            </div>
            <div className="font-serif" style={{ fontSize: "2.2rem", color: x.c, marginBottom: 20 }}>{money(x.b)}</div>
            <div className="flex gap-2">
              <Btn label="Deposit" color={T.ok} variant="outline" onClick={() => openModal("cushion", { person: x.p, type: "add" })} />
              <Btn label="Withdraw" color={T.bad} variant="danger" onClick={() => openModal("cushion", { person: x.p, type: "withdraw" })} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: "0.82rem", color: T.text2, marginBottom: 14 }}>History</div>
      <div className="flex flex-col gap-1">
        {[...cushion].map(c => {
          const isAdd = c.type === "add";
          return (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 flex items-center gap-3 px-4 py-3">
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: isAdd ? T.ok : T.bad, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: T.text }}>
                  {PERSON[c.person]?.name || c.person} <span style={{ color: isAdd ? T.ok : T.bad }}>{isAdd ? "+" : "−"}{money(c.amount)}</span>
                </span>
                <div style={{ fontSize: "0.62rem", fontWeight: 500, color: T.text4 }}>{shortDate(c.date)}{c.note ? ` — ${c.note}` : ""}</div>
              </div>
            </div>
          );
        })}
      </div>
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
            {[{ n: "Armaan", v: armC, c: T.armaan }, { n: "Layla", v: layC, c: T.layla }].map((x, i) => (
              <Fragment key={x.n}>
                {i > 0 && <div style={{ width: 1, background: T.borderSoft, alignSelf: "stretch" }} />}
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 600, color: T.text4 }}>{x.n}</div>
                  <div className="font-mono" style={{ fontSize: "1.05rem", fontWeight: 600, color: x.c, marginTop: 3 }}>{money(x.v)}</div>
                </div>
              </Fragment>
            ))}
          </div>
          <div className="flex gap-2.5 justify-center">
            <Btn label="Contribute" color={T.ok} variant="outline" onClick={() => openModal("dnContrib", { person: "both", amount: "", note: "" })} />
            <Btn label="Log a Date" color={T.shared} onClick={() => openModal("dnSpend", { amount: "", note: "" })} />
          </div>
        </div>
        {spends.length > 0 && <>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: T.text2, marginBottom: 14 }}>Past Dates</div>
          <div className="flex flex-col gap-1.5 mb-6">
            {[...spends].reverse().map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: T.sharedSoft, borderRadius: 14, border: `1px solid ${T.sharedMid}50` }}>
                <span className="text-xl">🍷</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: T.text }}>{money(e.amount)}{e.note ? <span style={{ fontWeight: 400, color: T.text3 }}> — {e.note}</span> : ""}</div>
                  <div style={{ fontSize: "0.62rem", fontWeight: 500, color: T.text4 }}>{shortDate(e.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </>}
        {contribs.length > 0 && <>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: T.text2, marginBottom: 14 }}>Contributions</div>
          <div className="flex flex-col gap-1">
            {[...contribs].reverse().map(e => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 flex items-center gap-3 px-4 py-2.5">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.ok, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: T.text }}>{PERSON[e.person]?.name || e.person} <span style={{ color: T.ok }}>+{money(e.amount)}</span></span>
                  <div style={{ fontSize: "0.58rem", fontWeight: 500, color: T.text4 }}>{shortDate(e.date)}{e.note ? ` — ${e.note}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // TAB: SETTINGS
  // ══════════════════════════════════════════════════════════════════
  const SettingsView = () => {
    const [local, setLocal] = useState({ ...config });
    const dirty = JSON.stringify(local) !== JSON.stringify(config);
    const set = (k: string, v: string) => setLocal((p: any) => ({ ...p, [k]: Number(v) }));
    return (
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{ fontWeight: 800, fontSize: "1.15rem", color: T.text, marginBottom: 24 }}>Settings</h2>
        <div className="grid gap-5">
          <Field label="Monthly Allowance ($)"><Input value={local.allowance} onChange={(v: string) => set("allowance", v)} /></Field>
          <Field label="Savings Deduction ($/month)"><Input value={local.savings} onChange={(v: string) => set("savings", v)} /></Field>
          <Field label="Date Night Contribution ($/week each)"><Input value={local.dnWeekly} onChange={(v: string) => set("dnWeekly", v)} /></Field>
          <Field label="Weeks per Month">
            <div className="flex gap-2">
              {[4, 5].map(w => (
                <button key={w} onClick={() => setLocal((p: any) => ({ ...p, weekMode: w }))} style={{
                  flex: 1, padding: "11px", borderRadius: 12, border: `1.5px solid ${local.weekMode === w ? T.armaan : T.border}`,
                  background: local.weekMode === w ? `${T.armaan}10` : "transparent", fontSize: "0.85rem", fontWeight: local.weekMode === w ? 700 : 500,
                  color: local.weekMode === w ? T.armaan : T.text4, cursor: "pointer",
                }}>{w} weeks</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="On Track %"><Input value={(local.paceOk * 100).toFixed(0)} onChange={(v: string) => set("paceOk", String(Number(v) / 100))} /></Field>
            <Field label="Tight %"><Input value={(local.paceTight * 100).toFixed(0)} onChange={(v: string) => set("paceTight", String(Number(v) / 100))} /></Field>
          </div>
          {dirty && <Btn label="Save Changes" color={T.armaan} wide onClick={async () => {
            await api("update", "settings", local, "Settings saved");
            setConfig(local);
            toast("Settings saved");
          }} />}
          <div className="h-px bg-gray-200" />
          <Btn label="Reset to Demo Data" color={T.bad} variant="danger" wide onClick={async () => {
            if (!confirm("Reset all data? This cannot be undone.")) return;
            await api("reset", "all", {}, "Reset");
            toast("Reset complete");
            fetchData();
          }} />
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200" style={{ background: `${T.bg}EE`, backdropFilter: "blur(16px)" }}>
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs" style={{ background: `linear-gradient(135deg, ${T.armaan}, ${T.layla})` }}>A&L</div>
            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: T.text }}>Finance</span>
          </div>
          <nav className="hidden sm:flex gap-0.5">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                background: tab === t.key ? `${T.armaan}10` : "transparent",
                fontSize: "0.75rem", fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? T.armaan : T.text4,
              }}>{t.label}</button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 pt-7 pb-28">
        {tab === "overview" && (
          <div className="animate-tab" key="ov">
            {/* Household strip */}
            <div className="bg-white rounded-2xl border border-gray-200 flex items-center gap-4 flex-wrap p-4 px-5 mb-5">
              <div className="flex-1 min-w-[180px]">
                <div style={{ fontSize: "0.62rem", fontWeight: 600, color: T.text4, marginBottom: 4 }}>Household Remaining</div>
                <div className="font-serif" style={{ fontSize: "1.65rem", color: hRem >= 0 ? T.text : T.bad }}>{money(hRem)}</div>
              </div>
              <div className="flex gap-4 items-center flex-wrap">
                <div><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Budget</div><div className="font-mono" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{money(hBudget)}</div></div>
                <div><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Spent</div><div className="font-mono" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{money(hSpent)}</div></div>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, color: hs.color, background: hs.bg, padding: "4px 12px", borderRadius: 100 }}>{hs.label}</span>
              </div>
              <div className="w-[130px]">
                <div className="flex justify-between mb-1.5">
                  <span style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Month</span>
                  <span className="font-mono" style={{ fontSize: "0.58rem", fontWeight: 500, color: T.text3 }}>Day {dayNum}/{totalDays}</span>
                </div>
                <ProgressBar value={dayNum} max={totalDays} color={T.armaan} h={5} />
              </div>
            </div>

            {/* Person cards */}
            <div className="flex flex-col sm:flex-row gap-5 mb-5">
              <PersonCard person="armaan" data={arm} />
              <PersonCard person="layla" data={lay} />
            </div>

            {/* Dad card */}
            <div className="mb-5"><DadCard /></div>

            {/* Bottom row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div onClick={() => setTab("cushion")} className="flex-1 bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all min-w-[280px]">
                <div className="flex items-center gap-2 mb-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ok} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span style={{ fontWeight: 700, fontSize: "0.8rem", color: T.text }}>Cushion</span>
                  <span className="ml-auto" style={{ fontSize: "0.62rem", color: T.text4 }}>→</span>
                </div>
                <div className="flex gap-6">
                  <div><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Armaan</div><div className="font-serif" style={{ fontSize: "1.25rem", color: T.armaan }}>{money(armCush)}</div></div>
                  <div><div style={{ fontSize: "0.55rem", fontWeight: 600, color: T.text4 }}>Layla</div><div className="font-serif" style={{ fontSize: "1.25rem", color: T.layla }}>{money(layCush)}</div></div>
                </div>
              </div>
              <div onClick={() => setTab("datenight")} className="flex-1 bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all min-w-[280px]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base">💕</span>
                  <span style={{ fontWeight: 700, fontSize: "0.8rem", color: T.text }}>Date Night</span>
                  <span className="ml-auto" style={{ fontSize: "0.62rem", color: T.text4 }}>→</span>
                </div>
                <div className="font-serif" style={{ fontSize: "1.25rem", color: T.shared }}>{money(dnBal)}</div>
                <div style={{ fontSize: "0.65rem", fontWeight: 500, color: T.text4, marginTop: 4 }}>{datenight.filter(e => e.type === "spend").length} date{datenight.filter(e => e.type === "spend").length !== 1 ? "s" : ""} logged</div>
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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 flex justify-around" style={{ background: `${T.bg}F5`, backdropFilter: "blur(16px)", padding: "6px 0 env(safe-area-inset-bottom, 8px)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "6px 4px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: tab === t.key ? T.armaan : T.text4, minWidth: 48,
          }}>
            <span style={{ opacity: tab === t.key ? 1 : 0.4 }}><NavIcon name={t.icon} size={20} /></span>
            <span style={{ fontSize: "0.5rem", fontWeight: tab === t.key ? 700 : 500 }}>{t.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>

      {/* ════════ MODALS ════════ */}
      <Modal open={modal === "checkin"} onClose={closeModal} title="Check In" accent={PERSON[form.person]?.color}>
        <div className="grid gap-4">
          <PersonPicker value={form.person} onChange={v => upd("person", v)} />
          <Field label="Amount Spent"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} placeholder="0" accent={PERSON[form.person]?.color} autoFocus /></Field>
          <Field label="Date"><Input type="date" value={form.date || today()} onChange={(v: string) => upd("date", v)} /></Field>
          <Field label="Note (optional)"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} placeholder="What was it for?" /></Field>
          <Btn label="Log Check-in" color={PERSON[form.person]?.color || T.armaan} wide onClick={addCheckin} disabled={!form.amount || Number(form.amount) <= 0} />
        </div>
      </Modal>

      <Modal open={modal === "editCI"} onClose={closeModal} title="Edit Entry" accent={PERSON[form.person]?.color}>
        <div className="grid gap-4">
          <Field label="Amount"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} accent={T.armaan} autoFocus /></Field>
          <Field label="Date"><Input type="date" value={form.date || ""} onChange={(v: string) => upd("date", v)} /></Field>
          <Field label="Note"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} /></Field>
          <Btn label="Save Changes" color={T.armaan} wide onClick={saveCheckin} />
        </div>
      </Modal>

      <Modal open={modal === "laylaRec"} onClose={closeModal} title="Update Received from Dad" accent={T.layla}>
        <div className="grid gap-4">
          <Field label="Amount received so far this month"><Input value={form.amount ?? ""} onChange={(v: string) => upd("amount", v)} accent={T.layla} autoFocus /></Field>
          <Btn label="Update" color={T.layla} wide onClick={updateLaylaRec} />
        </div>
      </Modal>

      <Modal open={modal === "cushion"} onClose={closeModal} title={`Cushion ${form.type === "add" ? "Deposit" : "Withdrawal"}`} accent={form.type === "add" ? T.ok : T.bad}>
        <div className="grid gap-4">
          <PersonPicker value={form.person} onChange={v => upd("person", v)} />
          <Field label="Amount"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} placeholder="0" accent={form.type === "add" ? T.ok : T.bad} autoFocus /></Field>
          <Field label="Note (optional)"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} placeholder="Reason" /></Field>
          <Btn label={form.type === "add" ? "Deposit" : "Withdraw"} color={form.type === "add" ? T.ok : T.bad} wide onClick={addCushionEntry} disabled={!form.amount || Number(form.amount) <= 0} />
        </div>
      </Modal>

      <Modal open={modal === "dnContrib"} onClose={closeModal} title="Date Night Contribution" accent={T.ok}>
        <div className="grid gap-4">
          <PersonPicker value={form.person} onChange={v => upd("person", v)} options={["armaan", "layla", "both"]} />
          <Field label="Amount per person"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} placeholder="50" accent={T.ok} /></Field>
          <Field label="Note"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} placeholder="e.g. Week 3" /></Field>
          <Btn label="Contribute" color={T.ok} wide onClick={addDNContrib} disabled={!form.amount || Number(form.amount) <= 0 || !form.person} />
        </div>
      </Modal>

      <Modal open={modal === "dnSpend"} onClose={closeModal} title="Log a Date Night 💕" accent={T.shared}>
        <div className="grid gap-4">
          <Field label="Total spent together"><Input value={form.amount || ""} onChange={(v: string) => upd("amount", v)} placeholder="0" accent={T.shared} autoFocus /></Field>
          <Field label="Where'd you go?"><Input type="text" value={form.note || ""} onChange={(v: string) => upd("note", v)} placeholder="Italian restaurant..." /></Field>
          <Btn label="Log Date Night" color={T.shared} wide onClick={addDNSpend} disabled={!form.amount || Number(form.amount) <= 0} />
        </div>
      </Modal>

      <Toaster />
    </div>
  );
}
