// AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useLanguage } from "../../../context/LanguageContext";

const BASE = "https://aroundubackend-production.up.railway.app/api";
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });
const apiFetch = async (path) => {
    const res = await fetch(`${BASE}${path}`, { headers: authHeader() });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
};
const updateRequest = async (requestId, action) => {
    const res = await fetch(`${BASE}/dashboard/admin/notifications/requests/${requestId}/${action}`, { method: "POST", headers: authHeader() });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
};

function KpiCard({ icon, label, value, linkTo, color, delta }) {
    const isPositive = delta && delta.startsWith("+");
    const isZero = delta === "0%" || delta === "+0%";
    return (
        <Link to={linkTo ?? "#"} style={{ textDecoration: "none" }}>
            <div style={{ background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", transition: "box-shadow 0.15s", cursor: linkTo ? "pointer" : "default" }}
                onMouseEnter={(e) => { if (linkTo) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ fontSize: "1.5rem" }}>{icon}</div>
                <div style={{ fontSize: "2rem", fontWeight: 600, color: color ?? "#0f172a", letterSpacing: "-0.03em", lineHeight: 1 }}>{value ?? "—"}</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>{label}</div>
                {delta && !isZero && (
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: isPositive ? "#16a34a" : "#dc2626", background: isPositive ? "#f0fdf4" : "#fef2f2", border: `1px solid ${isPositive ? "#bbf7d0" : "#fecaca"}`, borderRadius: "999px", padding: "2px 8px", alignSelf: "flex-start" }}>
                        {isPositive ? "↑" : "↓"} {delta}
                    </div>
                )}
            </div>
        </Link>
    );
}

const statusStyle = {
    PENDING:  { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },
    APPROVED: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
    REJECTED: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
};

export default function AdminDashboard() {
    const { requests: layoutRequests = [], reqLoading, refetchRequests, overview, overviewLoading, refetchOverview } = useOutletContext() ?? {};
    const { t } = useLanguage();
    const [requests, setRequests] = useState(layoutRequests);
    const [actioning, setActioning] = useState(null);

    useEffect(() => { setRequests(layoutRequests); }, [layoutRequests]);

    const handleRefresh = () => { refetchOverview?.(); refetchRequests?.(); };

    const handleAction = async (requestId, action) => {
        setActioning(requestId);
        try {
            await updateRequest(requestId, action);
            setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: action === "approve" ? "APPROVED" : "REJECTED" } : r));
            refetchRequests?.();
        } catch (err) { console.error("Action failed", err); }
        finally { setActioning(null); }
    };

    const pendingRequests = requests.filter((r) => r.status === "PENDING");

    if (overviewLoading) {
        return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94a3b8", fontSize: "0.9rem" }}>{t("loading")}</div>;
    }

    return (
        <div style={{ maxWidth: "1100px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                        {t("welcome_admin")}
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t("platform_summary")}</p>
                </div>
                <button onClick={handleRefresh} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "#fff", fontSize: "13px", cursor: "pointer", color: "#475569", fontWeight: 500 }}>
                    🔄 {t("refresh")}
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <KpiCard icon="👥" label={t("new_users")}     value={overview?.new_users}     linkTo="users"  delta={overview?.users_delta} />
                <KpiCard icon="🏪" label={t("new_owners")}    value={overview?.new_owners}    linkTo="owners" delta={overview?.owners_delta} />
                <KpiCard icon="📍" label={t("active_places")} value={overview?.active_places} linkTo="places" />
                <KpiCard icon="👁️" label={t("visits")}        value={overview?.visits}        delta={overview?.visits_delta} />
                <KpiCard icon="⭐" label={t("reviews")}       value={overview?.reviews}       delta={overview?.reviews_delta} />
                <KpiCard icon="📞" label={t("calls")}         value={overview?.calls}         delta={overview?.calls_delta} />
                {pendingRequests.length > 0 && (
                    <KpiCard icon="🔔" label={t("pending_requests")} value={pendingRequests.length} linkTo="notifications" color="#ef4444" />
                )}
            </div>

            {/* Pending Requests */}
            <div style={{ background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid #e4e2dd" }}>
                    <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>{t("pending_notif_requests")}</h2>
                    {pendingRequests.length > 0 && (
                        <span style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, padding: "2px 10px" }}>
                            {pendingRequests.length} {t("pending")}
                        </span>
                    )}
                </div>
                {pendingRequests.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100px", color: "#94a3b8", fontSize: "0.875rem" }}>{t("no_pending")}</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {pendingRequests.map((req) => (
                            <div key={req.id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "1rem 1.25rem", display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                                <div style={{ flex: 1, minWidth: "200px" }}>
                                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>{req.title ?? "Notification Request"}</div>
                                    <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "6px", lineHeight: 1.5 }}>{req.message ?? "—"}</div>
                                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                        {req.sender_name && <span style={{ fontSize: "0.75rem", color: "#64748b" }}>🏪 {req.sender_name}</span>}
                                        {req.target_type && <span style={{ fontSize: "0.75rem", color: "#64748b" }}>🎯 {req.target_type.replace("_", " ")}</span>}
                                        {req.created_at && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>🕐 {new Date(req.created_at).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                                    <button disabled={actioning === req.id} onClick={() => handleAction(req.id, "approve")}
                                        style={{ padding: "7px 16px", borderRadius: "8px", border: "none", background: actioning === req.id ? "#94a3b8" : "#22c55e", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: actioning === req.id ? "not-allowed" : "pointer" }}>
                                        {t("approve")}
                                    </button>
                                    <button disabled={actioning === req.id} onClick={() => handleAction(req.id, "reject")}
                                        style={{ padding: "7px 16px", borderRadius: "8px", border: "1px solid #fca5a5", background: "#fff", color: "#ef4444", fontSize: "13px", fontWeight: 600, cursor: actioning === req.id ? "not-allowed" : "pointer" }}>
                                        {t("reject")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Requests */}
            {requests.filter((r) => r.status !== "PENDING").length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "1.5rem" }}>
                    <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid #e4e2dd" }}>
                        {t("recent_requests")}
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {requests.filter((r) => r.status !== "PENDING").slice(0, 5).map((req) => (
                            <div key={req.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "10px 12px", borderRadius: "8px", background: "#f8fafc", flexWrap: "wrap" }}>
                                <div style={{ flex: 1, minWidth: "150px" }}>
                                    <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#0f172a" }}>{req.title ?? "Notification Request"}</div>
                                    {req.sender_name && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>🏪 {req.sender_name}</div>}
                                </div>
                                <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", flexShrink: 0, ...statusStyle[req.status] }}>
                                    {t(req.status.toLowerCase())}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}