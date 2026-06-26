// AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useLanguage } from "../../../context/LanguageContext";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const BASE = "https://aroundubackend-production.up.railway.app/api";
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });

const apiFetch = async (path) => {
    const res = await fetch(`${BASE}${path}`, { headers: authHeader() });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
};

const fmt = (d) =>
    d ? new Date(d).toLocaleString("en-EG", { dateStyle: "medium", timeStyle: "short" }) : "—";

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : d;

// ── KPI Card ────────────────────────────────────────────────────────────────
const KPI_COLORS = {
    purple: { accent: "#7F77DD", iconBg: "#EEEDFE", iconColor: "#534AB7" },
    teal: { accent: "#1D9E75", iconBg: "#E1F5EE", iconColor: "#0F6E56" },
    blue: { accent: "#378ADD", iconBg: "#E6F1FB", iconColor: "#185FA5" },
    amber: { accent: "#BA7517", iconBg: "#FAEEDA", iconColor: "#854F0B" },
    pink: { accent: "#D4537E", iconBg: "#FBEAF0", iconColor: "#993556" },
    coral: { accent: "#D85A30", iconBg: "#FAECE7", iconColor: "#993C1D" },
};

function KpiCard({ icon, label, value, linkTo, colorKey = "blue", delta }) {
    const c = KPI_COLORS[colorKey] ?? KPI_COLORS.blue;
    const isPositive = delta && delta.startsWith("+");
    const isZero = delta === "0%" || delta === "+0%";

    const cardStyle = {
        background: "var(--bg-card)",
        border: "1px solid #e4e2dd",
        borderRadius: "12px",
        padding: "1.25rem 1.25rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        cursor: linkTo ? "pointer" : "default",
        transition: "border-color 0.15s, background 0.15s",
        textDecoration: "none",
        position: "relative",
        overflow: "hidden",
    };

    const content = (
        <div
            style={cardStyle}
            onMouseEnter={(e) => {
                if (linkTo) {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.background = "var(--bg-surface)";
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e4e2dd";
                e.currentTarget.style.background = "var(--bg-card)";
            }}
        >
            {/* Accent top bar */}
            <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: "3px",
                background: c.accent,
                borderRadius: "12px 12px 0 0",
            }} />

            {/* Icon */}
            <div style={{
                width: "36px", height: "36px",
                borderRadius: "8px",
                background: c.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px",
                marginBottom: "4px",
                marginTop: "4px",
            }}>
                <span style={{ color: c.iconColor, fontSize: "18px" }}>{icon}</span>
            </div>

            {/* Value */}
            <div style={{
                fontSize: "28px",
                fontWeight: 600,
                color: "var(--text-main)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
            }}>
                {value?.toLocaleString() ?? "—"}
            </div>

            {/* Label */}
            <div style={{
                fontSize: "12px",
                color: "var(--icon-muted)",
                fontWeight: 400,
            }}>
                {label}
            </div>

            {/* Delta badge */}
            {delta && !isZero && (
                <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    marginTop: "2px",
                    alignSelf: "flex-start",
                    background: isPositive ? "var(--success-bg)" : "var(--danger-bg)",
                    color: isPositive ? "var(--success)" : "var(--danger)",
                }}>
                    {isPositive ? "↑" : "↓"} {delta}
                </div>
            )}
        </div>
    );

    return linkTo ? (
        <Link to={linkTo} style={{ textDecoration: "none" }}>{content}</Link>
    ) : content;
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid #e4e2dd", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>{label}</div>
            {payload.map((p) => (
                <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--text-sub)" }}>{p.name}:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{p.value?.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
    const { refetchOverview, overview, overviewLoading, refetchRequests } = useOutletContext() ?? {};
    const { t } = useLanguage();

    const [recentNotifs, setRecentNotifs] = useState([]);
    const [notifsLoading, setNotifsLoading] = useState(true);
    const [trendData, setTrendData] = useState([]);
    const [trendLoading, setTrendLoading] = useState(true);
    const [activeLine, setActiveLine] = useState(null);

    useEffect(() => {
        const load = async () => {
            setNotifsLoading(true);
            try {
                const data = await apiFetch("/dashboard/admin/notifications/requests?skip=0&limit=5");
                const arr = Array.isArray(data) ? data : data?.items ?? data?.requests ?? [];
                setRecentNotifs(arr.slice(0, 5));
            } catch {
                setRecentNotifs([]);
            } finally {
                setNotifsLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const load = async () => {
            setTrendLoading(true);
            try {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 6);
                const fmt2 = (d) => d.toISOString().split("T")[0];
                const data = await apiFetch(`/dashboard/admin/stats/trending?start_date=${fmt2(start)}&end_date=${fmt2(end)}`);
                const arr = Array.isArray(data) ? data : [];
                setTrendData(arr.map((d) => ({ ...d, displayDate: fmtDate(d.date) })));
            } catch {
                setTrendData([]);
            } finally {
                setTrendLoading(false);
            }
        };
        load();
    }, []);

    const handleRefresh = () => { refetchOverview?.(); refetchRequests?.(); };

    const LINES = [
        { key: "visits", name: t("visits"), color: "var(--color-primary)" },
        { key: "new_users", name: t("new_users"), color: "var(--success)" },
        { key: "reviews", name: t("reviews"), color: "var(--accent)" },
        { key: "calls", name: t("calls"), color: "var(--color-secondary)" },
    ];

    if (overviewLoading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--icon-muted)", fontSize: "0.9rem" }}>
                {t("loading")}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "1100px" }}>

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                        {t("welcome_admin")}
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "var(--icon-muted)" }}>{t("platform_summary")}</p>
                </div>
                <button onClick={handleRefresh} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "var(--bg-card)", fontSize: "13px", cursor: "pointer", color: "var(--text-sub)", fontWeight: 500 }}>
                    🔄 {t("refresh")}
                </button>
            </div>

            {/* ── KPI Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <KpiCard icon="👥" label={t("new_users")} value={overview?.new_users} linkTo="users" colorKey="purple" delta={overview?.users_delta} />
                <KpiCard icon="🏪" label={t("new_owners")} value={overview?.new_owners} linkTo="owners" colorKey="teal" delta={overview?.owners_delta} />
                <KpiCard icon="📍" label={t("active_places")} value={overview?.active_places} linkTo="places" colorKey="blue" />
                <KpiCard icon="👁️" label={t("visits")} value={overview?.visits} colorKey="amber" delta={overview?.visits_delta} />
                <KpiCard icon="⭐" label={t("reviews")} value={overview?.reviews} colorKey="pink" delta={overview?.reviews_delta} />
                <KpiCard icon="📞" label={t("calls")} value={overview?.calls} colorKey="coral" delta={overview?.calls_delta} />
            </div>

            {/* ── Platform Trends Chart ── */}
            <div style={{ background: "var(--bg-card)", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid #e4e2dd" }}>
                    <div>
                        <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>📈 {t("platform_trends")} </h2>
                        <p style={{ fontSize: "0.75rem", color: "var(--icon-muted)", marginTop: "3px" }}>{t("last_7_days")}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {LINES.map((l) => (
                            <button
                                key={l.key}
                                onClick={() => setActiveLine(activeLine === l.key ? null : l.key)}
                                style={{
                                    display: "flex", alignItems: "center", gap: "5px",
                                    padding: "3px 10px", borderRadius: "999px", border: "1.5px solid",
                                    borderColor: activeLine && activeLine !== l.key ? "var(--border)" : l.color,
                                    background: activeLine && activeLine !== l.key ? "var(--bg-surface)" : `${l.color}15`,
                                    color: activeLine && activeLine !== l.key ? "var(--icon-muted)" : l.color,
                                    fontSize: "11px", fontWeight: 600, cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: activeLine && activeLine !== l.key ? "var(--border)" : l.color }} />
                                {l.name}
                            </button>
                        ))}
                    </div>
                </div>

                {trendLoading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--icon-muted)", fontSize: "0.875rem" }}>
                        {t("loading")}
                    </div>
                ) : trendData.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "var(--icon-muted)", fontSize: "0.875rem" }}>
                        📊 No trend data available.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-surface)" vertical={false} />
                            <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: "var(--icon-muted)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "var(--icon-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            {LINES.map((l) => (
                                <Line
                                    key={l.key}
                                    type="monotone"
                                    dataKey={l.key}
                                    name={l.name}
                                    stroke={l.color}
                                    strokeWidth={activeLine === l.key ? 3 : activeLine ? 1 : 2}
                                    strokeOpacity={activeLine && activeLine !== l.key ? 0.2 : 1}
                                    dot={{ r: 3, fill: l.color, strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Latest Notifications ── */}
            <div style={{ background: "var(--bg-card)", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid #e4e2dd" }}>
                    <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
                        🔔 {t("latest_notifications")}
                    </h2>
                    <Link to="notifications" style={{ fontSize: "0.78rem", color: "var(--color-primary)", fontWeight: 500, textDecoration: "none" }}>
                        {t("view_all")} →
                    </Link>
                </div>

                {notifsLoading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px", color: "var(--icon-muted)", fontSize: "0.875rem" }}>
                        {t("loading")}
                    </div>
                ) : recentNotifs.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80px", color: "var(--icon-muted)", fontSize: "0.875rem" }}>
                        🔕 No notifications yet.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {recentNotifs.map((notif) => {
                            const hasSent = notif.total_sent > 0;
                            const hasRead = notif.read_count > 0;
                            const readRate = hasSent ? Math.round((notif.read_count / notif.total_sent) * 100) : null;
                            return (
                                <div key={notif.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", background: "var(--bg-surface)", border: "1px solid #e4e2dd", flexWrap: "wrap" }}>
                                    <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "var(--info-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                                        📢
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                            <span style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px" }}>
                                                {notif.title || "Notification"}
                                            </span>
                                            <span style={{
                                                fontSize: "0.7rem", fontWeight: 500, padding: "1px 8px", borderRadius: "999px",
                                                background: notif.target_type === "ALL_USERS" ? "var(--bg-surface)" : "var(--info-bg)",
                                                color: notif.target_type === "ALL_USERS" ? "var(--text-sub)" : "var(--color-primary-hover)",
                                                border: `1px solid ${notif.target_type === "ALL_USERS" ? "var(--border)" : "var(--info-bg)"}`,
                                                flexShrink: 0,
                                            }}>
                                                {notif.target_type === "ALL_USERS" ? `🌍 ${t("notif_all_users_label")}` : `👤 ID: ${notif.target_user_id ?? "?"}`}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", gap: "10px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                                            {notif.sender_name && <span style={{ fontSize: "0.72rem", color: "var(--text-sub)" }}>🏪 {notif.sender_name}</span>}
                                            <span style={{ fontSize: "0.72rem", color: "var(--icon-muted)" }}>🕐 {fmt(notif.created_at)}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                                        {hasSent && (
                                            <span style={{ fontSize: "0.72rem", color: "var(--text-sub)", background: "var(--bg-card)", border: "1px solid #e4e2dd", borderRadius: "6px", padding: "2px 8px" }}>
                                                📤 <strong style={{ color: "var(--text-main)" }}>{notif.total_sent}</strong>
                                            </span>
                                        )}
                                        {hasRead && (
                                            <span style={{ fontSize: "0.72rem", color: "var(--text-sub)", background: "var(--bg-card)", border: "1px solid #e4e2dd", borderRadius: "6px", padding: "2px 8px" }}>
                                                👁 <strong style={{ color: "var(--text-main)" }}>{notif.read_count}</strong>
                                            </span>
                                        )}
                                        {readRate !== null && (
                                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-primary-hover)", background: "var(--info-bg)", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "2px 8px" }}>
                                                📊 {readRate}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}