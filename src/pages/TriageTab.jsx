import { useState, useMemo } from "react";
import { C, F, COL } from "../lib/tokens";
import { fmt } from "../lib/utils";
import { useAR } from "../lib/ARContext";

const STATUSES = [
  { id: "good",     label: "Good",      icon: "\u2705", col: COL.tGood,     desc: "QB is accurate \u2014 chase this money" },
  { id: "unsure",   label: "Unsure",    icon: "\u2753", col: COL.tUnsure,   desc: "Need to verify before acting" },
  { id: "notright", label: "Not Right", icon: "\u26a0\ufe0f",  col: COL.tNotright, desc: "QB is wrong \u2014 accountant fix" },
  { id: "problem",  label: "Problem",   icon: "\ud83d\udeab",  col: COL.tProblem,  desc: "Dispute, go-back, or legal issue" },
];

export default function TriageTab() {
  const ar = useAR();
  const [viewFilter, setViewFilter] = useState("untriaged");
  const [selectedIdx, setSelectedIdx] = useState(0);

  const custList = useMemo(() => {
    return ar.customers.slice().sort((a, b) => b.total - a.total);
  }, [ar.customers]);

  const filtered = useMemo(() => {
    if (viewFilter === "all") return custList;
    if (viewFilter === "untriaged") return custList.filter((c) => !ar.triageFlags[c.name]);
    return custList.filter((c) => ar.triageFlags[c.name] === viewFilter);
  }, [custList, ar.triageFlags, viewFilter]);

  const triaged = custList.filter((c) => ar.triageFlags[c.name]).length;
  const total = custList.length;

  const statusTotals = useMemo(() => {
    const t = { good: 0, unsure: 0, notright: 0, problem: 0, untriaged: 0 };
    const c = { good: 0, unsure: 0, notright: 0, problem: 0, untriaged: 0 };
    custList.forEach((cust) => {
      const s = ar.triageFlags[cust.name] || "untriaged";
      t[s] += cust.total;
      c[s]++;
    });
    return { amounts: t, counts: c };
  }, [custList, ar.triageFlags]);

  const selected = filtered[selectedIdx] || filtered[0] || null;

  const setTriage = (custName, status) => {
    const current = ar.triageFlags[custName];
    if (current === status) {
      // clicking same status clears it
      const next = { ...ar.triageFlags };
      delete next[custName];
      ar.updateTriage(next);
    } else {
      ar.updateTriage({ ...ar.triageFlags, [custName]: status });
      // auto-advance to next untriaged if in untriaged view
      if (viewFilter === "untriaged") {
        // selectedIdx stays the same (next item slides in) or clamp
        const nextList = filtered.filter((c) => c.name !== custName);
        if (selectedIdx >= nextList.length) setSelectedIdx(Math.max(0, nextList.length - 1));
      }
    }
  };

  const pct = total > 0 ? Math.round((triaged / total) * 100) : 0;

  return (
    <div style={S.wrap}>
      {/* Progress bar */}
      <div style={S.progress}>
        <div style={S.progTop}>
          <span style={S.progLabel}>TRIAGE PROGRESS</span>
          <span style={S.progCount}>{triaged} of {total} customers</span>
        </div>
        <div style={S.progBar}>
          <div style={{ ...S.progFill, width: `${pct}%` }} />
        </div>
        <div style={S.progPct}>{pct}% complete</div>
      </div>

      {/* Status summary cards */}
      <div style={S.statCards}>
        {[
          { id: "untriaged", label: "Untriaged", icon: "\u2014", col: { bg: "#6b7280", lt: C.linenCard, tx: "#4b5563" } },
          ...STATUSES,
        ].map((s) => {
          const active = viewFilter === s.id;
          const count = statusTotals.counts[s.id] || 0;
          const amt = statusTotals.amounts[s.id] || 0;
          return (
            <div key={s.id} onClick={() => { setViewFilter(s.id); setSelectedIdx(0); }}
              style={{ ...S.statCard, ...(active ? { background: s.col.bg, borderColor: s.col.bg, transform: "translateY(-2px)", boxShadow: `0 4px 16px ${s.col.bg}33` } : {}) }}>
              <div style={{ ...S.statLabel, ...(active ? { color: "rgba(255,255,255,0.7)" } : {}) }}>
                {s.icon} {s.label}
              </div>
              <div style={{ ...S.statAmt, color: active ? "#fff" : s.col.bg }}>{fmt(amt)}</div>
              <div style={{ ...S.statCount, ...(active ? { color: "rgba(255,255,255,0.6)" } : {}) }}>{count} customer{count !== 1 ? "s" : ""}</div>
            </div>
          );
        })}
        <div onClick={() => { setViewFilter("all"); setSelectedIdx(0); }}
          style={{ ...S.statCard, ...(viewFilter === "all" ? { background: C.dark, borderColor: C.dark, transform: "translateY(-2px)" } : {}) }}>
          <div style={{ ...S.statLabel, ...(viewFilter === "all" ? { color: "rgba(255,255,255,0.7)" } : {}) }}>All</div>
          <div style={{ ...S.statAmt, color: viewFilter === "all" ? C.pop : C.textHead }}>{fmt(custList.reduce((s, c) => s + c.total, 0))}</div>
          <div style={{ ...S.statCount, ...(viewFilter === "all" ? { color: "rgba(255,255,255,0.6)" } : {}) }}>{total} customer{total !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div style={S.main}>
        {/* Left — customer list */}
        <div style={S.left}>
          <div style={S.listHeader}>
            <span style={S.listTitle}>
              {viewFilter === "all" ? "All Customers" : viewFilter === "untriaged" ? "Untriaged" : STATUSES.find((s) => s.id === viewFilter)?.label || ""}
            </span>
            <span style={S.listCount}>{filtered.length}</span>
          </div>
          <div style={S.listBody}>
            {!filtered.length && <div style={S.empty}>{viewFilter === "untriaged" ? "All triaged! Nice work." : "No customers in this status."}</div>}
            {filtered.map((c, i) => {
              const isSelected = selected && c.name === selected.name;
              const status = ar.triageFlags[c.name];
              const statusCol = status ? STATUSES.find((s) => s.id === status)?.col : null;
              return (
                <div key={c.name} onClick={() => setSelectedIdx(i)}
                  style={{ ...S.listRow, ...(isSelected ? { background: C.linenDeep, borderLeftColor: C.teal } : {}) }}>
                  <div style={S.listRowTop}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, overflow: "hidden" }}>
                      <div style={{ ...S.dot, background: statusCol ? statusCol.bg : "#9ca3af" }} />
                      <span style={S.listName}>{c.name}</span>
                    </div>
                    <span style={S.listTotal}>{fmt(c.total)}</span>
                  </div>
                  <div style={S.listMeta}>
                    {c.invoices.length} invoice{c.invoices.length !== 1 ? "s" : ""}
                    {c.over90 > 0 && <span style={{ color: COL.o90.bg, fontWeight: 700 }}> \u00b7 {fmt(c.over90)} 91+</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — detail + triage buttons */}
        <div style={S.right}>
          {selected ? (
            <>
              <div style={S.detailHeader}>
                <div style={S.detailName}>{selected.name}</div>
                <div style={S.detailTotal}>{fmt(selected.total)}</div>
              </div>

              {/* Aging buckets */}
              <div style={S.buckets}>
                {[
                  { l: "Current", v: selected.current, c: COL.cur },
                  { l: "1-30", v: selected.days30, c: COL.d30 },
                  { l: "31-60", v: selected.days60, c: COL.d60 },
                  { l: "61-90", v: selected.days90, c: COL.d90 },
                  { l: "91+", v: selected.over90, c: COL.o90 },
                ].map((b) => (
                  <div key={b.l} style={{ ...S.bucket, background: b.v ? b.c.lt : "#f3f4f6", border: `1px solid ${b.v ? b.c.bg + "33" : "#e5e7eb"}` }}>
                    <div style={{ ...S.bLabel, color: b.v ? b.c.tx : "#9ca3af" }}>{b.l}</div>
                    <div style={{ ...S.bVal, color: b.v ? b.c.bg : "#d1d5db" }}>{fmt(b.v)}</div>
                  </div>
                ))}
              </div>

              {/* Invoice list (compact) */}
              <div style={S.invSection}>
                <div style={S.invTitle}>Invoices ({selected.invoices.length})</div>
                <div style={S.invList}>
                  {selected.invoices
                    .slice()
                    .sort((a, b) => b.openBalance - a.openBalance)
                    .map((inv, i) => {
                      const bCol = { over90: COL.o90, days90: COL.d90, days60: COL.d60, days30: COL.d30, current: COL.cur }[inv.bucket] || COL.cur;
                      return (
                        <div key={i} style={S.invRow}>
                          <div style={S.invLeft}>
                            <span style={{ ...S.invDot, background: bCol.bg }} />
                            <span style={S.invNum}>#{inv.num || "\u2014"}</span>
                            <span style={S.invType}>{inv.type}</span>
                            {inv.job && <span style={S.invJob}>{inv.job}</span>}
                          </div>
                          <div style={S.invRight}>
                            <span style={S.invDate}>{inv.date}</span>
                            <span style={S.invAmt}>{fmt(inv.openBalance)}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* TRIAGE BUTTONS */}
              <div style={S.triageBar}>
                <div style={S.triageLabel}>TRIAGE THIS CUSTOMER</div>
                <div style={S.triageBtns}>
                  {STATUSES.map((s) => {
                    const active = ar.triageFlags[selected.name] === s.id;
                    return (
                      <button key={s.id} onClick={() => setTriage(selected.name, s.id)}
                        style={{ ...S.triageBtn, background: active ? s.col.bg : s.col.lt, color: active ? "#fff" : s.col.bg, border: `2px solid ${s.col.bg}`, ...(active ? { transform: "scale(1.05)", boxShadow: `0 4px 16px ${s.col.bg}44` } : {}) }}>
                        <span style={S.triageIcon}>{s.icon}</span>
                        <span style={S.triageName}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
                {ar.triageFlags[selected.name] && (
                  <div style={S.triageDesc}>
                    {STATUSES.find((s) => s.id === ar.triageFlags[selected.name])?.desc}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={S.noSelect}>
              {filtered.length === 0 ? "No customers to show" : "Select a customer from the list"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap: { maxWidth: 1260, margin: "0 auto", padding: "20px 16px" },

  // Progress
  progress: { background: C.dark, borderRadius: 10, padding: "16px 20px", marginBottom: 16 },
  progTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progLabel: { fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)" },
  progCount: { fontFamily: F.display, fontSize: 13, fontWeight: 700, color: C.pop },
  progBar: { height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" },
  progFill: { height: "100%", background: `linear-gradient(90deg, ${C.tealDark}, ${C.pop})`, borderRadius: 4, transition: "width 0.4s ease" },
  progPct: { fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6, textAlign: "right" },

  // Status cards
  statCards: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  statCard: { flex: "1 1 100px", minWidth: 100, border: `2px solid ${C.borderStrong}`, borderRadius: 10, padding: "12px 10px", cursor: "pointer", textAlign: "left", transition: "all 0.2s", background: C.linenCard },
  statLabel: { fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textMuted, marginBottom: 4 },
  statAmt: { fontFamily: F.display, fontSize: 18, fontWeight: 800, lineHeight: 1.1 },
  statCount: { fontSize: 10, color: C.textFaint, marginTop: 3 },

  // Main layout
  main: { display: "flex", gap: 16, minHeight: "calc(100vh - 280px)" },
  left: { width: 340, flexShrink: 0, display: "flex", flexDirection: "column", background: C.linenCard, border: `1px solid ${C.borderStrong}`, borderRadius: 10, overflow: "hidden" },
  right: { flex: 1, display: "flex", flexDirection: "column", background: C.linenCard, border: `1px solid ${C.borderStrong}`, borderRadius: 10, overflow: "hidden" },

  // Customer list
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: C.dark },
  listTitle: { fontFamily: F.display, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em", textTransform: "uppercase" },
  listCount: { fontFamily: F.display, fontSize: 11, fontWeight: 700, color: C.pop, background: C.darkRaised, padding: "2px 8px", borderRadius: 4 },
  listBody: { flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 380px)" },
  listRow: { padding: "10px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", borderLeft: "3px solid transparent", transition: "background 0.1s" },
  listRowTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  listName: { fontWeight: 600, fontSize: 12, color: C.textBody, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  listTotal: { fontFamily: F.display, fontWeight: 800, fontSize: 14, color: C.textHead, flexShrink: 0 },
  listMeta: { fontSize: 10, color: C.textFaint, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  empty: { padding: 40, textAlign: "center", color: C.textFaint, fontSize: 13, fontStyle: "italic" },

  // Detail panel (right side)
  detailHeader: { background: C.dark, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  detailName: { fontFamily: F.display, fontSize: 20, fontWeight: 800, color: "#fff" },
  detailTotal: { fontFamily: F.display, fontSize: 24, fontWeight: 800, color: C.pop },

  // Buckets
  buckets: { display: "flex", gap: 8, padding: "12px 24px", flexWrap: "wrap" },
  bucket: { borderRadius: 8, padding: "8px 12px", textAlign: "center", flex: "1 1 80px" },
  bLabel: { fontFamily: F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  bVal: { fontFamily: F.display, fontSize: 16, fontWeight: 800, marginTop: 2 },

  // Invoice list
  invSection: { flex: 1, padding: "0 24px 12px", overflow: "hidden", display: "flex", flexDirection: "column" },
  invTitle: { fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, padding: "8px 0", borderBottom: `1px solid ${C.border}` },
  invList: { flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 620px)" },
  invRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}`, gap: 8 },
  invLeft: { display: "flex", alignItems: "center", gap: 6, flex: 1, overflow: "hidden" },
  invRight: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  invDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  invNum: { fontFamily: F.display, fontSize: 12, fontWeight: 700, color: C.textHead },
  invType: { fontSize: 9, fontWeight: 600, color: C.textFaint, background: C.linenDeep, padding: "1px 5px", borderRadius: 3 },
  invJob: { fontSize: 10, color: C.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  invDate: { fontSize: 10, color: C.textFaint },
  invAmt: { fontFamily: F.display, fontSize: 12, fontWeight: 800, color: C.textHead, minWidth: 70, textAlign: "right" },

  // Triage buttons
  triageBar: { padding: "16px 24px 20px", borderTop: `2px solid ${C.border}`, background: C.linenDeep },
  triageLabel: { fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, marginBottom: 10 },
  triageBtns: { display: "flex", gap: 8 },
  triageBtn: { flex: 1, padding: "14px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  triageIcon: { fontSize: 20 },
  triageName: { fontFamily: F.display, fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" },
  triageDesc: { fontSize: 11, color: C.textLight, marginTop: 8, fontStyle: "italic", textAlign: "center" },

  noSelect: { padding: 60, textAlign: "center", color: C.textFaint, fontSize: 14, margin: "auto" },
};
