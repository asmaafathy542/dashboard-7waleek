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

/* ─── Star Rating ─── */
function Stars({ rating }) {
    return (
        <span style={{ color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
            {"★".repeat(rating)}{"☆".repeat(5 - rating)}
            <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "4px" }}>{rating}/5</span>
        </span>
    );
}

/* ─── Confirm Delete Modal ─── */
function ConfirmModal({ review, onConfirm, onCancel }) {
    const { t } = useLanguage();
    if (!review) return null;
    return (
        <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", padding: "24px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>🗑 {t("delete_review")}</h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 6px" }}>
                    {t("review_by")} <strong>{review.User}</strong> {t("on")} <strong>{review.Place}</strong>:
                </p>
                <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#475569", margin: "0 0 20px", border: "1px solid #e4e2dd", fontStyle: "italic" }}>
                    "{review.Review}"
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button onClick={onCancel} style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#475569" }}>{t("cancel")}</button>
                    <button onClick={onConfirm} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: "#b91c1c", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>🗑 {t("delete")}</button>
                </div>
            </div>
        </div>
    );
}

/* ─── MAIN PAGE ─── */
export default function AdminReports() {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    const [search, setSearch] = useState("");
    const [confirmReview, setConfirmReview] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [pageSize, setPageSize] = useState(10);

    const { data: reviews = [], isLoading: loading, isError } = useQuery({
        queryKey: ["admin-reports"],
        queryFn: async () => {
            const data = await apiFetch("/dashboard/admin/moderation/pending");
            return data?.flagged_reviews ?? [];
        },
        staleTime: 1000 * 60 * 5,
    });

    const error = isError ? t("load_error") : "";

    const fetchData = () => queryClient.invalidateQueries({ queryKey: ["admin-reports"] });

    const handleApprove = (review) => {
        queryClient.setQueryData(["admin-reports"], (old = []) =>
            old.filter((r) => r.Review_ID !== review.Review_ID)
        );
    };

    const handleReject = (review) => setConfirmReview(review);

    const confirmDelete = async () => {
        if (!confirmReview) return;
        setActionLoading(confirmReview.Review_ID);
        setConfirmReview(null);
        try {
            const id = String(confirmReview.Review_ID).replace(/^R-/i, "");
            await apiFetch(`/dashboard/admin/reviews/${id}`, { method: "DELETE" });
            queryClient.setQueryData(["admin-reports"], (old = []) =>
                old.filter((r) => r.Review_ID !== confirmReview.Review_ID)
            );
        } catch {
            fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = reviews.filter((r) => {
        const q = search.trim().toLowerCase();
        return !q ||
            (r.Place ?? "").toLowerCase().includes(q) ||
            (r.User ?? "").toLowerCase().includes(q) ||
            (r.Review ?? "").toLowerCase().includes(q);
    });

    const pagination = usePagination(filtered, pageSize);
    const { paginated, reset: resetPage } = pagination;
    useMemo(() => { resetPage(); }, [search]);

    return (
        <div style={{ maxWidth: "1200px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                        {t("reports")} 🚩
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                        {loading ? t("loading") : `${reviews.length} ${t("flagged_reviews")}`}
                    </p>
                </div>
                <button onClick={fetchData} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "#fff", fontSize: "13px", cursor: "pointer", color: "#475569", fontWeight: 500 }}>
                    🔄 {t("refresh")}
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
                {[
                    { icon: "🚩", label: t("total_flagged"), value: reviews.length, bg: "#fef2f2", color: "#991b1b" },
                    { icon: "⭐", label: t("avg_rating"), value: reviews.length ? (reviews.reduce((s, r) => s + r.Rating, 0) / reviews.length).toFixed(1) : "—", bg: "#fffbeb", color: "#92400e" },
                    { icon: "🏪", label: t("places_affected"), value: new Set(reviews.map((r) => r.Place)).size, bg: "#f0f9ff", color: "#0369a1" },
                ].map((s) => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: "12px", padding: "16px 20px", border: "1px solid #e4e2dd" }}>
                        <div style={{ fontSize: "22px", marginBottom: "6px" }}>{s.icon}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: "1.25rem", position: "relative", maxWidth: "360px" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8", pointerEvents: "none" }}>🔍</span>
                <input
                    type="text"
                    placeholder={t("search_reports")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: "8px", border: "1px solid #e4e2dd", fontSize: "13px", color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }}
                />
                {search && (
                    <button onClick={() => setSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px" }}>✕</button>
                )}
            </div>

            {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "1rem", fontSize: "13px", color: "#b91c1c" }}>⚠️ {error}</div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94a3b8" }}>{t("loading")}</div>
            ) : filtered.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎉</div>
                    <p style={{ fontSize: "14px" }}>{t("no_flagged")}</p>
                </div>
            ) : (
                <div style={{ background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e2dd" }}>
                                    {[
                                        { key: "col-id", label: t("id") },
                                        { key: "col-place", label: t("places") },
                                        { key: "col-reported-by", label: t("reported_by") },
                                        { key: "col-review", label: t("review") },
                                        { key: "col-rating", label: t("rating") },
                                        { key: "col-date", label: t("date") },
                                        { key: "col-actions", label: t("actions") },
                                    ].map((h) => (
                                        <th key={h.key} style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                                            {h.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((r, idx) => {
                                    const isActioning = actionLoading === r.Review_ID;
                                    return (
                                        <tr
                                            key={r.Review_ID}
                                            style={{ borderBottom: idx < paginated.length - 1 ? "1px solid #f1f0ec" : "none", opacity: isActioning ? 0.5 : 1, transition: "opacity 0.2s" }}
                                        >
                                            <td style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 500 }}>{r.Review_ID}</td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, flexShrink: 0 }}>
                                                        {(r.Place ?? "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 500, color: "#0f172a" }}>{r.Place}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 14px", color: "#475569", fontWeight: 500 }}>👤 {r.User}</td>
                                            <td style={{ padding: "12px 14px", maxWidth: "220px" }}>
                                                <span style={{ display: "block", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>
                                                    "{r.Review}"
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 14px" }}><Stars rating={r.Rating} /></td>
                                            <td style={{ padding: "12px 14px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                                                {r.Date ? new Date(r.Date).toLocaleDateString() : "—"}
                                            </td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button onClick={() => handleApprove(r)} disabled={isActioning} style={{ padding: "5px 12px", borderRadius: "7px", border: "none", fontSize: "12px", fontWeight: 600, cursor: isActioning ? "not-allowed" : "pointer", background: "#f0fdf4", color: "#166534", whiteSpace: "nowrap" }}>
                                                        ✓ {t("approve")}
                                                    </button>
                                                    <button onClick={() => handleReject(r)} disabled={isActioning} style={{ padding: "5px 12px", borderRadius: "7px", border: "none", fontSize: "12px", fontWeight: 600, cursor: isActioning ? "not-allowed" : "pointer", background: "#fef2f2", color: "#991b1b", whiteSpace: "nowrap" }}>
                                                        🗑 {t("delete")}
                                                    </button>
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

            <ConfirmModal
                review={confirmReview}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmReview(null)}
            />
        </div>
    );
}