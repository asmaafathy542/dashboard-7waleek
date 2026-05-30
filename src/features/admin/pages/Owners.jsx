// Owners.jsx
import { useState, useMemo } from "react";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../../context/LanguageContext";

const BASE = "https://aroundubackend-production.up.railway.app/api";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeader(), ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

const OWNER_TYPE_COLORS = {
  COMMERCIAL: { bg: "var(--info-bg)", color: "var(--color-primary-hover)", border: "var(--info-bg)" },
  RESIDENTIAL: { bg: "var(--bg-surface)", color: "var(--color-secondary)", border: "var(--bg-surface)" },
  null: { bg: "var(--bg-surface)", color: "var(--text-sub)", border: "var(--border)" },
};

const ownerTypeStyle = (type) => OWNER_TYPE_COLORS[type] ?? OWNER_TYPE_COLORS[null];

const EMPTY_FORM = { full_name: "", email: "", password: "", owner_type: "COMMERCIAL" };

function ConfirmDialog({ dialog, onConfirm, onCancel }) {
  if (!dialog) return null;
  const isDanger = dialog.type === "danger";
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 3000, padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", borderRadius: "14px", width: "100%", maxWidth: "360px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)", padding: "28px 24px", textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>{dialog.icon}</div>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>{dialog.title}</p>
        <p style={{ fontSize: "13px", color: "var(--icon-muted)", marginBottom: "22px" }}>
          {dialog.subtitle ?? (isDanger ? "This action cannot be undone." : "Are you sure you want to continue?")}
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "10px", borderRadius: "8px",
              border: "1px solid #e4e2dd", background: "var(--bg-card)",
              fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "var(--text-sub)",
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "10px", borderRadius: "8px", border: "none",
              background: isDanger ? "var(--danger)" : "var(--success)",
              color: "var(--bg-card)", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >{dialog.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function Owners() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [actionLoading, setActionLoading] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [viewOwner, setViewOwner] = useState(null);
  const [ownerDetails, setOwnerDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // ── useQuery ──────────────────────────────────────────────────────────
  const { data: owners = [], isLoading: loading, isError } = useQuery({
    queryKey: ["admin-owners"],
    queryFn: async () => {
      const data = await apiFetch("/dashboard/admin/db/table/users");
      const arr = Array.isArray(data) ? data : (data?.data ?? data?.items ?? data?.users ?? []);
      return arr.filter((u) => u.role?.toUpperCase() === "OWNER");
    },
    staleTime: 1000 * 60 * 5,
  });

  const error = isError ? "Failed to load owners. Please try again." : "";

  const fetchOwners = () => queryClient.invalidateQueries({ queryKey: ["admin-owners"] });

  // ── helpers ───────────────────────────────────────────────────────────
  const pushToast = (msg, ok = true) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const showConfirm = (options) =>
    new Promise((resolve) => {
      setDialog({
        ...options,
        onConfirm: () => { setDialog(null); resolve(true); },
      });
    });

  const handleDialogCancel = () => setDialog(null);

  // ── Verify ────────────────────────────────────────────────────────────
  const handleVerify = async (owner) => {
    const confirmed = await showConfirm({
      title: `Verify "${owner.full_name}"?`,
      subtitle: "This will mark the owner as verified on the platform.",
      icon: "✅", type: "success", confirmLabel: "Verify",
    });
    if (!confirmed) return;
    setActionLoading({ id: owner.id, type: "verify" });
    try {
      await apiFetch(`/dashboard/admin/owners/${owner.id}/verify`, { method: "POST" });
      queryClient.setQueryData(["admin-owners"], (old = []) =>
        old.map((o) => o.id === owner.id ? { ...o, is_verified: true } : o)
      );
      pushToast(`✓ ${owner.full_name} verified successfully`);
    } catch {
      pushToast(`✗ Failed to verify ${owner.full_name}`, false);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Ban / Activate ────────────────────────────────────────────────────
  const handleToggleStatus = async (owner) => {
    const nextActive = !owner.is_active;
    const confirmed = await showConfirm(
      nextActive
        ? { title: `Activate "${owner.full_name}"?`, subtitle: "The owner will regain access to the platform.", icon: "✅", type: "success", confirmLabel: "Activate" }
        : { title: `Deactivate "${owner.full_name}"?`, subtitle: "The owner will be hidden and lose access.", icon: "🗑️", type: "danger", confirmLabel: "Deactivate" }
    );
    if (!confirmed) return;
    setActionLoading({ id: owner.id, type: "status" });
    try {
      await apiFetch(`/dashboard/admin/users/${owner.id}/status?active=${nextActive}`, { method: "POST" });
      queryClient.setQueryData(["admin-owners"], (old = []) =>
        old.map((o) => o.id === owner.id ? { ...o, is_active: nextActive } : o)
      );
      pushToast(`✓ ${owner.full_name} ${nextActive ? "activated" : "deactivated"}`);
    } catch {
      pushToast(`✗ Failed to update status`, false);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Create Owner ──────────────────────────────────────────────────────
  const handleCreateOwner = async () => {
    setFormError("");
    if (!form.full_name.trim()) return setFormError("Full name is required.");
    if (!form.email.trim()) return setFormError("Email is required.");
    if (!form.password.trim()) return setFormError("Password is required.");
    setCreating(true);
    try {
      const newOwner = await apiFetch("/dashboard/admin/owners", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          owner_type: form.owner_type,
        }),
      });
      queryClient.setQueryData(["admin-owners"], (old = []) => [newOwner, ...old]);
      pushToast(`✓ Owner "${form.full_name}" created successfully`);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err.message === "422" ? "Invalid data. Check all fields." : "Failed to create owner. Try again.");
    } finally {
      setCreating(false);
    }
  };

  // ── Fetch Owner Details ───────────────────────────────────────────────
  const fetchOwnerDetails = async (owner) => {
    setViewOwner(owner);
    setOwnerDetails(null);
    setDetailsLoading(true);
    try {
      const [placesData, ordersData, itemsData, subcatsData] = await Promise.allSettled([
        apiFetch("/dashboard/admin/db/table/places"),
        apiFetch("/admin/orders/"),
        apiFetch("/dashboard/admin/db/table/items"),
        apiFetch("/dashboard/admin/db/table/subcategories"),
      ]);

      const allPlaces = placesData.status === "fulfilled"
        ? (Array.isArray(placesData.value) ? placesData.value : placesData.value?.data ?? [])
        : [];
      const ownerPlaces = allPlaces.filter((p) => p.owner_id === owner.id || p.user_id === owner.id);
      const ownerPlaceIds = ownerPlaces.map((p) => p.id);

      let itemsCount = 0;
      if (itemsData.status === "fulfilled" && subcatsData.status === "fulfilled") {
        const allItems = Array.isArray(itemsData.value) ? itemsData.value : itemsData.value?.data ?? [];
        const allSubcats = Array.isArray(subcatsData.value) ? subcatsData.value : subcatsData.value?.data ?? [];
        const ownerSubcatIds = allSubcats
          .filter((s) => s.owner_id === owner.id || ownerPlaceIds.includes(s.place_id))
          .map((s) => s.id);
        itemsCount = allItems.filter((i) => !i.is_deleted && ownerSubcatIds.includes(i.sub_category_id)).length;
      }

      let ordersCount = 0;
      let ordersPerBranch = {};
      if (ordersData.status === "fulfilled") {
        const allOrders = Array.isArray(ordersData.value) ? ordersData.value : ordersData.value?.data ?? ordersData.value?.orders ?? [];
        const ownerOrders = allOrders.filter((o) => o.owner_id === owner.id || ownerPlaceIds.includes(o.place_id));
        ordersCount = ownerOrders.length;
        ownerOrders.forEach((o) => {
          const pid = o.place_id ?? "unknown";
          ordersPerBranch[pid] = (ordersPerBranch[pid] ?? 0) + 1;
        });
      }

      setOwnerDetails({
        places: ownerPlaces, itemsCount, ordersCount, ordersPerBranch,
        lastActivity: owner.updated_at ?? owner.created_at ?? null,
      });
    } catch {
      setOwnerDetails({ places: [], itemsCount: 0, ordersCount: 0, ordersPerBranch: {}, lastActivity: null });
    } finally {
      setDetailsLoading(false);
    }
  };

  // ── Filter + Search ───────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = owners;
    if (filterType !== "ALL") {
      list = list.filter((o) => filterType === "NONE" ? !o.owner_type : o.owner_type === filterType);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((o) =>
        (o.full_name ?? "").toLowerCase().includes(q) ||
        (o.email ?? "").toLowerCase().includes(q) ||
        String(o.id).includes(q)
      );
    }
    return list;
  }, [owners, search, filterType]);

  const pagination = usePagination(displayed, pageSize);
  const { paginated, reset: resetPage } = pagination;
  useMemo(() => { resetPage(); }, [search, filterType]);

  const stats = useMemo(() => ({
    total: owners.length,
    verified: owners.filter((o) => o.is_verified).length,
    commercial: owners.filter((o) => o.owner_type === "COMMERCIAL").length,
    residential: owners.filter((o) => o.owner_type === "RESIDENTIAL").length,
    banned: owners.filter((o) => !o.is_active).length,
  }), [owners]);

  return (
    <div style={{ maxWidth: "1200px", position: "relative" }}>

      {/* Toasts */}
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000, display: "flex", flexDirection: "column", gap: "8px" }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 500,
            background: t.ok ? "var(--success-bg)" : "var(--danger-bg)",
            border: `1px solid ${t.ok ? "var(--success-bg)" : "var(--danger-bg)"}`,
            color: t.ok ? "var(--success)" : "var(--danger)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            animation: "slideIn 0.2s ease",
          }}>{t.msg}</div>
        ))}
      </div>

      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>

      <ConfirmDialog dialog={dialog} onConfirm={dialog?.onConfirm} onCancel={handleDialogCancel} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
            {t("owners")} 🏪
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--icon-muted)" }}>
            {loading ? "Loading..." : `${stats.total} ${t("total_owners")}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => { setShowModal(true); setFormError(""); setForm(EMPTY_FORM); }}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "var(--color-primary)", color: "var(--text-on-dark)", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
          > ➕ {t("create_owner")} </button>
          <button
            onClick={fetchOwners}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "var(--bg-card)", fontSize: "13px", cursor: "pointer", color: "var(--text-sub)", fontWeight: 500 }}
          >🔄 {t("refresh")}</button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "1.5rem" }}>
          {[
            { label: t("total"), value: stats.total, icon: "🏪", bg: "#E6F1FB", color: "#0C447C", trend: "All time" },
            { label: t("verified"), value: stats.verified, icon: "✅", bg: "#EAF3DE", color: "#27500A", trend: `${Math.round(stats.verified / stats.total * 100) || 0}%` },
            { label: t("commercial"), value: stats.commercial, icon: "🏬", bg: "#E6F1FB", color: "#0C447C", trend: `${Math.round(stats.commercial / stats.total * 100) || 0}%` },
            { label: t("residential"), value: stats.residential, icon: "🏠", bg: "#EEEDFE", color: "#3C3489", trend: `${Math.round(stats.residential / stats.total * 100) || 0}%` },
            { label: t("banned"), value: stats.banned, icon: "🚫", bg: "#FCEBEB", color: "#791F1F", trend: `${Math.round(stats.banned / stats.total * 100) || 0}%` },
            
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "18px" }}>{s.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: "26px", fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "var(--icon-muted)", marginTop: "4px" }}>{s.label}</div>
              </div>
              <div style={{ width: "100%", height: "1px", background: "#e4e2dd" }} />
              <div style={{ fontSize: "11px", fontWeight: 500, color: s.color, display: "flex", alignItems: "center", gap: "4px" }}>
                <i className="ti ti-percentage" style={{ fontSize: "12px" }} aria-hidden="true" />
                {s.trend}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "220px", maxWidth: "380px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "var(--icon-muted)", pointerEvents: "none" }}>🔍</span>
          <input
            type="text"
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: "8px", border: "1px solid #e4e2dd", fontSize: "13px", color: "var(--text-main)", outline: "none", background: "var(--bg-card)", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--icon-muted)", fontSize: "14px" }}>✕</button>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { key: "ALL", label: t("all_types") },
            { key: "COMMERCIAL", label: `🏬 ${t("commercial")}` },
            { key: "RESIDENTIAL", label: `🏠 ${t("residential")}` },
            { key: "NONE", label: `❓ ${t("no_type")}` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              style={{
                padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                border: filterType === f.key ? "none" : "1px solid #e4e2dd",
                background: filterType === f.key ? "var(--color-primary)" : "var(--bg-card)",
                color: filterType === f.key ? "#ffffff" : "var(--text-sub)",
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {(search || filterType !== "ALL") && !loading && (
        <p style={{ fontSize: "12px", color: "var(--icon-muted)", marginBottom: "10px" }}>
          {displayed.length} result{displayed.length !== 1 ? "s" : ""}{search ? ` for "${search}"` : ""}
        </p>
      )}

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "1rem", fontSize: "13px", color: "var(--danger)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--icon-muted)", fontSize: "0.9rem" }}>Loading...</div>
      ) : displayed.length === 0 ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "var(--icon-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏪</div>
          <p style={{ fontSize: "14px" }}>{search || filterType !== "ALL" ? "No owners match your filter." : "No owners found."}</p>
        </div>
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid #e4e2dd", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid #e4e2dd" }}>
                  {[t("id"), t("name"), t("email"), t("type"), t("verified"), t("status"), t("joined"), t("actions")].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((owner, idx) => {
                  const typeStyle = ownerTypeStyle(owner.owner_type);
                  const isVerifying = actionLoading?.id === owner.id && actionLoading?.type === "verify";
                  const isTogglingStatus = actionLoading?.id === owner.id && actionLoading?.type === "status";
                  const joined = owner.created_at ? new Date(owner.created_at).toLocaleDateString() : "—";

                  return (
                    <tr
                      key={owner.id}
                      onClick={() => fetchOwnerDetails(owner)}
                      style={{ borderBottom: idx < paginated.length - 1 ? "1px solid #f1f0ec" : "none", transition: "background 0.1s", cursor: "pointer" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-surface)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 14px", color: "var(--icon-muted)", fontWeight: 500 }}>{owner.id}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-primary-hover)", color: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, flexShrink: 0 }}>
                            {(owner.full_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500, color: "var(--text-main)" }}>{owner.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-sub)" }}>{owner.email ?? "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}>
                          {owner.owner_type === "COMMERCIAL" ? `🏬 ${t("commercial")}` : owner.owner_type === "RESIDENTIAL" ? `🏠 ${t("residential")}` : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: owner.is_verified ? "var(--success-bg)" : "var(--warning-bg)", color: owner.is_verified ? "var(--success)" : "var(--warning)", border: `1px solid ${owner.is_verified ? "var(--success-bg)" : "var(--warning-bg)"}` }}>
                          {owner.is_verified ? `✓ ${t("verified")}` : t("pending")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: owner.is_active ? "var(--success-bg)" : "var(--danger-bg)", color: owner.is_active ? "var(--success)" : "var(--danger)", border: `1px solid ${owner.is_active ? "var(--success-bg)" : "var(--danger-bg)"}` }}>
                          {owner.is_active ? t("active") : t("banned")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--icon-muted)", whiteSpace: "nowrap" }}>{joined}</td>
                      <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
                          {!owner.is_verified && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVerify(owner); }}
                              disabled={!!actionLoading}
                              style={{ padding: "5px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer", border: "1px solid #bbf7d0", background: "var(--success-bg)", color: "var(--success)", whiteSpace: "nowrap" }}
                            >{isVerifying ? "..." : `✓ ${t("verified")}`}</button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(owner); }}
                            disabled={!!actionLoading}
                            style={{ padding: "5px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer", border: owner.is_active ? "1px solid #fecaca" : "1px solid #bbf7d0", background: owner.is_active ? "var(--danger-bg)" : "var(--success-bg)", color: owner.is_active ? "var(--danger)" : "var(--success)", whiteSpace: "nowrap" }}
                          >{isTogglingStatus ? "..." : owner.is_active ? `🔒 ${t("deactivate")}` : `✓ ${t("activate")}`}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            {...pagination}
            pageSize={pageSize}
            onPageSize={(s) => { setPageSize(s); resetPage(); }}
            onNext={pagination.next}
            onPrev={pagination.prev}
            onGoTo={pagination.goTo}
          />
        </div>
      )}

      {/* ── Create Owner Modal ── */}
      {showModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}
        >
          <div style={{ background: "var(--bg-card)", borderRadius: "16px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f0ec", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>Create New Owner</h2>
                <p style={{ fontSize: "12px", color: "var(--icon-muted)", margin: "4px 0 0" }}>Add a new owner account to the platform</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--bg-surface)", border: "none", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px", color: "var(--text-sub)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {formError && (
                <div style={{ background: "var(--danger-bg)", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "var(--danger)" }}>⚠️ {formError}</div>
              )}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>Full Name *</label>
                <input type="text" placeholder="Owner of ..." value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e4e2dd", fontSize: "13px", color: "var(--text-main)", outline: "none", boxSizing: "border-box", background: "var(--bg-card)" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>Email *</label>
                <input type="email" placeholder="owner@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e4e2dd", fontSize: "13px", color: "var(--text-main)", outline: "none", boxSizing: "border-box", background: "var(--bg-card)" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>Password *</label>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    style={{ width: "100%", padding: "9px 40px 9px 12px", borderRadius: "8px", border: "1px solid #e4e2dd", fontSize: "13px", color: "var(--text-main)", outline: "none", boxSizing: "border-box", background: "var(--bg-card)" }} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--icon-muted)", padding: "2px" }}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>Owner Type</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["COMMERCIAL", "RESIDENTIAL"].map((type) => (
                    <button key={type} onClick={() => setForm((f) => ({ ...f, owner_type: type }))}
                      style={{ flex: 1, padding: "9px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: form.owner_type === type ? "2px solid #0f172a" : "1px solid #e4e2dd", background: form.owner_type === t ? "var(--text-main)" : "var(--bg-card)", color: form.owner_type === t ? "var(--bg-card)" : "var(--text-sub)" }}>
                      {type === "COMMERCIAL" ? `🏬 ${t("commercial")}` : `🏠 ${t("residential")}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f0ec", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "var(--bg-card)", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "var(--text-sub)" }}>Cancel</button>
              <button onClick={handleCreateOwner} disabled={creating}
                style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: creating ? "var(--icon-muted)" : "var(--text-main)", fontSize: "13px", fontWeight: 600, cursor: creating ? "not-allowed" : "pointer", color: "var(--bg-card)" }}>
                {creating ? "Creating..." : "Create Owner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Owner Modal ── */}
      {viewOwner && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setViewOwner(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}
        >
          <div style={{ background: "var(--bg-card)", borderRadius: "16px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f0ec", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--color-primary-hover)", color: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, flexShrink: 0 }}>
                  {(viewOwner.full_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>{viewOwner.full_name}</h2>
                  <p style={{ fontSize: "12px", color: "var(--icon-muted)", margin: "2px 0 0" }}>Owner Details</p>
                </div>
              </div>
              <button onClick={() => setViewOwner(null)} style={{ background: "var(--bg-surface)", border: "none", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px", color: "var(--text-sub)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px", background: viewOwner.is_verified ? "var(--success-bg)" : "var(--warning-bg)", color: viewOwner.is_verified ? "var(--success)" : "var(--warning)", border: `1px solid ${viewOwner.is_verified ? "var(--success-bg)" : "var(--warning-bg)"}` }}>
                  {viewOwner.is_verified ? "✓ Verified" : "⏳ Pending Verification"}
                </span>
                <span style={{ fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px", background: viewOwner.is_active ? "var(--success-bg)" : "var(--danger-bg)", color: viewOwner.is_active ? "var(--success)" : "var(--danger)", border: `1px solid ${viewOwner.is_active ? "var(--success-bg)" : "var(--danger-bg)"}` }}>
                  {viewOwner.is_active ? "Active" : "Deactivated"}
                </span>
                {viewOwner.owner_type && (() => {
                  const ts = ownerTypeStyle(viewOwner.owner_type);
                  return (
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px", background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                      {viewOwner.owner_type === "COMMERCIAL" ? "🏬 Commercial" : "🏠 Residential"}
                    </span>
                  );
                })()}
              </div>

              {[
                { label: "ID", value: viewOwner.id },
                { label: "Email", value: viewOwner.email },
                { label: "Provider", value: viewOwner.provider ?? "local" },
                { label: "Joined", value: viewOwner.created_at ? new Date(viewOwner.created_at).toLocaleString() : "—" },
                { label: "Updated", value: viewOwner.updated_at ? new Date(viewOwner.updated_at).toLocaleString() : "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--bg-surface)", borderRadius: "8px", border: "1px solid #f1f0ec" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-sub)", fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-main)", fontWeight: 500, textAlign: "right", maxWidth: "65%", wordBreak: "break-all" }}>{value ?? "—"}</span>
                </div>
              ))}

              {detailsLoading ? (
                <div style={{ padding: "24px", borderRadius: "10px", background: "var(--bg-surface)", border: "1px solid #f1f0ec", textAlign: "center", color: "var(--icon-muted)", fontSize: "13px" }}>⏳ Loading details...</div>
              ) : ownerDetails ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    {[
                      { icon: "📦", label: "Items", value: ownerDetails.itemsCount },
                      { icon: "🛒", label: "Orders", value: ownerDetails.ordersCount },
                      { icon: "🏪", label: "Places", value: ownerDetails.places.length },
                    ].map((s) => (
                      <div key={s.label} style={{ padding: "12px 10px", borderRadius: "10px", background: "var(--bg-surface)", border: "1px solid #f1f0ec", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", marginBottom: "4px" }}>{s.icon}</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>{s.value}</div>
                        <div style={{ fontSize: "10px", color: "var(--icon-muted)", fontWeight: 500, marginTop: "2px" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {ownerDetails.places.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {ownerDetails.places.map((place, idx) => (
                        <div key={place.id ?? idx} style={{ padding: "12px 14px", borderRadius: "8px", background: "var(--success-bg)", border: "1px solid #bbf7d0" }}>
                          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--success)", margin: "0 0 6px" }}>
                            🏪 BRANCH {ownerDetails.places.length > 1 ? idx + 1 : ""}
                          </p>
                          {[
                            { label: "Name", value: place.name },
                            { label: "Category", value: place.category ?? place.category_id ?? "—" },
                            { label: "Status", value: place.is_active ? "Active" : "Inactive" },
                            { label: "Address", value: place.address ?? place.location ?? "—" },
                            { label: "Orders", value: ownerDetails.ordersPerBranch?.[place.id] ?? 0 },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "11px", color: "var(--text-sub)", fontWeight: 600 }}>{label}</span>
                              <span style={{ fontSize: "11px", color: "var(--text-main)", maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>{value ?? "—"}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "12px 14px", borderRadius: "8px", background: "var(--warning-bg)", border: "1px solid #fde68a", fontSize: "12px", color: "var(--warning)", textAlign: "center" }}>
                      ⚠️ No places linked to this owner yet
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--bg-surface)", borderRadius: "8px", border: "1px solid #f1f0ec" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-sub)", fontWeight: 600 }}>🕐 Last Activity</span>
                    <span style={{ fontSize: "12px", color: "var(--text-main)" }}>
                      {ownerDetails.lastActivity ? new Date(ownerDetails.lastActivity).toLocaleString() : "No recent activity"}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
            <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f0ec", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewOwner(null)} style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "var(--bg-card)", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "var(--text-sub)" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}