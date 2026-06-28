// OwnerDashboard.jsx

import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../../context/LanguageContext";
import { getMyProperties } from "../../properties/services/propertiesServices";
import {
    getOwnerDashboard,
    getAnalytics,
    getActiveVisitors,
    getAnomaliesSummary,
    getOpportunities,
    getChatbotStats,
    getTopItems,
} from "../services/ownerDashboardService";
import { getOrdersByBranch } from "../../orders/services/ordersService";
import { useTheme } from "../../../context/ThemeContext";
import { PageThemeToggle } from "../../../shared/components/ui/ThemeToggle";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ComposedChart,
    Line,
} from "recharts";

import "./ownerDashboard.css";

const statusClass = {
    PENDING: "od-status-pending",
    ACCEPTED: "od-status-accepted",
    REJECTED: "od-status-rejected",
    CANCELLED: "od-status-rejected",
};

function groupOrdersByDay(orders) {
    const map = {};

    orders.forEach((o) => {
        const day = new Date(o.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });

        if (!map[day]) {
            map[day] = { date: day, orders: 0, revenue: 0 };
        }

        map[day].orders += 1;
        map[day].revenue += Number(o.total_price) || 0;
    });

    return Object.values(map).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
    );
}

function resolveDateRange(dateRange, customFrom, customTo) {
    const now = new Date();
    now.setHours(23, 59, 59, 0);

    if (dateRange === "1d") {
        const from = new Date(now);
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        return { from: from.toISOString(), to: now.toISOString() };
    }

    if (dateRange === "7d") {
        const from = new Date(now);
        from.setDate(from.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        return { from: from.toISOString(), to: now.toISOString() };
    }

    if (dateRange === "30d") {
        const from = new Date(now);
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        return { from: from.toISOString(), to: now.toISOString() };
    }

    if (dateRange === "custom" && customFrom) {
        const to = customTo ? new Date(customTo) : now;
        to.setHours(23, 59, 59, 0);
        return {
            from: new Date(customFrom).toISOString(),
            to: to.toISOString(),
        };
    }

    return { from: null, to: null };
}

function ResidentialOverview() {
    const { t } = useLanguage();

    const { data: properties = [], isLoading: loading } = useQuery({
        queryKey: ["properties"],
        queryFn: getMyProperties,
        staleTime: 1000 * 60 * 5,
    });

    const totalProps = properties.length;
    const availableProps = properties.filter((p) => p.is_available).length;
    const totalReviews = properties.reduce((s, p) => s + (p.review_count ?? 0), 0);
    const totalFavorites = properties.reduce((s, p) => s + (p.favorite_count ?? 0), 0);

    if (loading) return <div className="od-loading">{t("loading")}</div>;

    return (
        <div className="od-page">
            <div className="od-header">
                <div>
                    <h1 className="od-title">{t("welcome")}</h1>
                    <p className="od-subtitle">{t("properties_summary")}</p>
                </div>
            </div>

            <div className="od-cards">
                {[
                    { icon: "🏠", label: t("stat_total_properties"), value: totalProps },
                    { icon: "✅", label: t("stat_available"), value: availableProps },
                    { icon: "⭐", label: t("reviews"), value: totalReviews },
                    { icon: "❤️", label: t("stat_favorites"), value: totalFavorites },
                ].map((card) => (
                    <div className="od-card" key={card.label}>
                        <div className="od-card-icon">{card.icon}</div>
                        <div className="od-card-value">{card.value}</div>
                        <div className="od-card-label">{card.label}</div>
                    </div>
                ))}
            </div>

            {properties.length === 0 ? (
                <div className="od-chart-card">
                    <div className="od-chart-empty">{t("no_properties")}</div>
                </div>
            ) : (
                <div className="od-chart-card">
                    <h2 className="od-chart-title">{t("my_properties")}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {properties.map((prop) => (
                            <div
                                key={prop.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "12px 16px",
                                    background: "var(--bg-surface)",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)" }}>
                                        {prop.title}
                                    </div>
                                    <div style={{ fontSize: "12px",color: "var(--icon-muted)", marginTop: "2px" }}>
                                        ⭐ {prop.review_count ?? 0} {t("reviews")} · ❤️ {prop.favorite_count ?? 0} {t("stat_favorites")}
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                        {Number(prop.price).toLocaleString()} EGP
                                    </div>
                                    <span
                                        style={{
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            padding: "2px 8px",
                                            borderRadius: "999px",
                                            background: prop.is_available ? "#dcfce7" : "#fee2e2",
                                            color: prop.is_available ? "#15803d" : "#b91c1c",
                                        }}
                                    >
                                        {prop.is_available ? t("prop_available") : t("prop_unavailable")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OwnerDashboard() {
    const context = useOutletContext() ?? {};
    const { selectedPlaceId, placeName } = context;
    const { t } = useLanguage();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isResidential = user?.owner_type === "RESIDENTIAL";
    const queryClient = useQueryClient();

    const statCards = [
        { key: "visits", label: t("stat_visits"), icon: "👁️" },
        { key: "orders", label: t("stat_orders"), icon: "📦" },
        { key: "saves", label: t("stat_saves"), icon: "🔖" },
        { key: "calls", label: t("stat_calls"), icon: "📞" },
        { key: "directions", label: t("stat_directions"), icon: "🗺️" },
    ];

    // ── Date Filter state ─────────────────────────────────────────────
    const [dateRange, setDateRange] = useState("7d");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    // ── resolved { from, to } — single source of truth ───────────────
    const { from: resolvedFrom, to: resolvedTo } = useMemo(
        () => resolveDateRange(dateRange, customFrom, customTo),
        [dateRange, customFrom, customTo]
    );

    // ── useQuery ──────────────────────────────────────────────────────
    const { data: stats } = useQuery({
        queryKey: ["owner-dashboard", selectedPlaceId, resolvedFrom, resolvedTo],
        queryFn: () => getOwnerDashboard(selectedPlaceId, resolvedFrom, resolvedTo),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 2,
    });

    const { data: analyticsRaw } = useQuery({
        queryKey: ["owner-analytics", selectedPlaceId, resolvedFrom, resolvedTo],
        queryFn: () => getAnalytics(selectedPlaceId, resolvedFrom, resolvedTo),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 2,
    });

    const { data: activeVisitorsRaw } = useQuery({
        queryKey: ["owner-active-visitors", selectedPlaceId, resolvedFrom, resolvedTo],
        queryFn: () => getActiveVisitors(selectedPlaceId, resolvedFrom, resolvedTo),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 1,
    });

    const { data: ordersRaw } = useQuery({
        queryKey: ["owner-orders", selectedPlaceId, resolvedFrom, resolvedTo],
        queryFn: () => getOrdersByBranch(selectedPlaceId, resolvedFrom, resolvedTo),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 1,
    });

    const { data: anomalies } = useQuery({
        queryKey: ["owner-anomalies", selectedPlaceId, resolvedFrom, resolvedTo],
        queryFn: () => getAnomaliesSummary(selectedPlaceId, resolvedFrom, resolvedTo),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 2,
    });

    const { data: opportunities } = useQuery({
        queryKey: ["owner-opportunities", selectedPlaceId, resolvedFrom, resolvedTo],
        queryFn: () => getOpportunities(selectedPlaceId, resolvedFrom, resolvedTo),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: chatbotStats, isFetching: refreshing } = useQuery({
        queryKey: ["owner-chatbot", selectedPlaceId, resolvedFrom, resolvedTo],
        queryFn: () => getChatbotStats(selectedPlaceId, resolvedFrom, resolvedTo),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 2,
    });

    // ── Top Items — not affected by date filter ────────────────────────
    const { data: topItems } = useQuery({
        queryKey: ["owner-top-items", selectedPlaceId],
        queryFn: () => getTopItems(selectedPlaceId, 3),
        enabled: !!selectedPlaceId,
        staleTime: 1000 * 60 * 5,
    });

    // ── normalize ─────────────────────────────────────────────────────
    const analytics = Array.isArray(analyticsRaw) ? analyticsRaw : [];
    const activeVisitors = Array.isArray(activeVisitorsRaw) ? activeVisitorsRaw.length : null;
    const allOrders = Array.isArray(ordersRaw?.results)
        ? ordersRaw.results
        : Array.isArray(ordersRaw)
            ? ordersRaw
            : [];

    // ── manual refresh ──────────────────────────────────────────────────
    const handleRefresh = () => {
        [
            "owner-dashboard",
            "owner-analytics",
            "owner-active-visitors",
            "owner-orders",
            "owner-anomalies",
            "owner-opportunities",
            "owner-chatbot",
        ].forEach((key) =>
            queryClient.invalidateQueries({
                queryKey: [key, selectedPlaceId, resolvedFrom, resolvedTo],
            })
        );
        queryClient.invalidateQueries({ queryKey: ["owner-top-items", selectedPlaceId] });
    };

    const ordersPerDay = useMemo(() => groupOrdersByDay(allOrders), [allOrders]);

    const formattedAnalytics = useMemo(
        () =>
            analytics.map((d) => ({
                ...d,
                displayDate: new Date(d.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
            })),
        [analytics]
    );

    if (isResidential) {
        return <ResidentialOverview />;
    }

    if (!selectedPlaceId) {
        return (
            <div
                className="od-loading"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "60vh",
                    gap: "12px",
                }}
            >
                <div style={{ fontSize: "2rem" }}>⏳</div>
                <div style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
                    {t("loading_dashboard")}
                </div>
            </div>
        );
    }

    // ── medal config ──────────────────────────────────────────────────
    const medalConfig = [
        { emoji: "🥇", bg: "#fef9c3", color: "#854d0e" },
        { emoji: "🥈", bg: "#f1f5f9", color: "#475569" },
        { emoji: "🥉", bg: "#fef3c7", color: "#92400e" },
    ];

    return (
        <div className="od-page">

            {/* Header */}
            <div className="od-header">
                <div>
                    <h1 className="od-title"> {placeName} </h1>
                    <p className="od-subtitle">{t("place_subtitle")}</p>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <PageThemeToggle />
                    <button
                        className={`od-refresh-btn ${refreshing ? "od-refreshing" : ""}`}
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        🔄 {refreshing ? t("refreshing") : t("refresh")}
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {anomalies && anomalies.total_anomalies > 0 && (
                <div
                    className={`od-alert ${anomalies.urgent_anomalies > 0
                        ? "od-alert-urgent"
                        : "od-alert-warning"
                        }`}
                >
                    <span className="od-alert-icon">
                        {anomalies.urgent_anomalies > 0 ? "🚨" : "⚠️"}
                    </span>

                    <div>
                        <div className="od-alert-title">
                            {anomalies.urgent_anomalies > 0
                                ? `${anomalies.urgent_anomalies} ${t("urgent_anomalies")}`
                                : `${anomalies.total_anomalies} ${t("anomalies_detected")}`}
                        </div>
                        <div className="od-alert-msg">{anomalies.summary}</div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="od-cards">
                {statCards.map((card) => (
                    <div className="od-card" key={card.key}>
                        <div className="od-card-icon">{card.icon}</div>
                        <div className="od-card-value">{stats?.[card.key] ?? 0}</div>
                        <div className="od-card-label">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Info Row */}
            <div className="od-info-row">
                <div className="od-info-card">
                    <div className="od-info-icon">👥</div>
                    <div>
                        <div className="od-info-label">{t("active_visitors")}</div>
                        <div className="od-info-value">
                            {activeVisitors != null ? activeVisitors : 0}
                        </div>
                    </div>
                </div>

                {chatbotStats && (
                    <div className="od-info-card">
                        <div className="od-info-icon">🤖</div>
                        <div>
                            <div className="od-info-label">{t("chatbot_queries")}</div>
                            <div className="od-info-value">{chatbotStats.queries ?? 0}</div>
                            {chatbotStats.success_rate != null && (
                                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                                    {(chatbotStats.success_rate * 100).toFixed(0)}% {t("stat_available")}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Top Ordered Items */}
            {Array.isArray(topItems) && topItems.length > 0 && (
                <div className="od-chart-card">
                    <h2 className="od-chart-title">{t("top_ordered_items")}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {topItems.slice(0, 3).map((item, i) => {
                            const medal = medalConfig[i] ?? medalConfig[2];
                            return (
                                <div
                                    key={item.item_id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                       
                                        gap: "12px",
                                        padding: "12px 16px",
                                         background: "var(--bg-surface)",
                                        borderRadius: "10px",
                                        border: "1px solid var(--border)",
                                        transition: "box-shadow 0.15s",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            borderRadius: "50%",
                                            background: medal.bg,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "16px",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {medal.emoji}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: "14px",
                                                color: "var(--text-main)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {item.item_name}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "var(--icon-muted)", marginTop: "2px" }}>
                                                🛒 {item.total_ordered} {item.total_ordered === 1 ? "order" : "orders"}
                                            </div>
                                    </div>

                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: "15px",
                                           color: "var(--success)",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {Number(item.unit_price).toLocaleString()} EGP
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Orders Per Day */}
            <div className="od-chart-card">
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginBottom: "1rem",
                        paddingBottom: "0.75rem",
                        borderBottom: "1px solid #e4e2dd",
                    }}
                >
                    <h2 className="od-chart-title" style={{ margin: 0, border: "none", padding: 0 }}>
                        {t("orders_per_day")}
                    </h2>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <div className="od-date-tabs">
                            {[
                                { key: "1d", label: t("date_today") },
                                { key: "7d", label: t("date_7d") },
                                { key: "30d", label: t("date_30d") },
                                { key: "custom", label: t("date_custom") },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    className={`od-date-tab ${dateRange === tab.key ? "od-date-tab-active" : ""}`}
                                    onClick={() => setDateRange(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {dateRange === "custom" && (
                            <div className="od-date-custom">
                                <input
                                    type="date"
                                    className="od-date-input"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                />
                                <span className="od-date-sep">→</span>
                                <input
                                    type="date"
                                    className="od-date-input"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", gap: "16px", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                        📦 <strong style={{ color: "#2563eb" }}>{allOrders.length}</strong> {t("orders_label")}
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                        💰{" "}
                        <strong style={{ color: "#10b981" }}>
                            {allOrders
                                .reduce((s, o) => s + (Number(o.total_price) || 0), 0)
                                .toLocaleString()}{" "}
                            EGP
                        </strong>{" "}
                        {t("revenue")}
                    </div>
                </div>

                {ordersPerDay.length === 0 ? (
                    <div className="od-chart-empty">{t("no_orders")}</div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart
                            data={ordersPerDay}
                            margin={{ top: 5, right: 20, left: -20, bottom: 0 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f1f0ec"
                                vertical={false}
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                            <YAxis
                                yAxisId="revenue"
                                orientation="left"
                                tick={{ fontSize: 11, fill: "#10b981" }}
                                tickFormatter={(v) =>
                                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v
                                }
                            />
                            <YAxis
                                yAxisId="orders"
                                orientation="right"
                                tick={{ fontSize: 11, fill: "#2563eb" }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: "#fff",
                                    border: "1px solid #e4e2dd",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                }}
                                formatter={(v, name) => [
                                    name === t("revenue_label") ? `${v} EGP` : v,
                                    name,
                                ]}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                            <Bar
                                yAxisId="revenue"
                                dataKey="revenue"
                                name={t("revenue_label")}
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                            />
                            <Line
                                yAxisId="orders"
                                dataKey="orders"
                                name={t("orders_label")}
                                stroke="#2563eb"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: "#2563eb" }}
                                type="monotone"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Opportunities */}
            {opportunities && (
                <div className="od-chart-card">
                    <h2 className="od-chart-title">{t("growth_opportunities")}</h2>

                    {opportunities.summary && (
                        <p
                            style={{
                                fontSize: "0.875rem",
                                color: "#475569",
                                marginBottom: "1.25rem",
                                lineHeight: 1.6,
                                background: "#f8fafc",
                                border: "1px solid #e4e2dd",
                                borderRadius: "10px",
                                padding: "0.875rem 1rem",
                            }}
                        >
                            {opportunities.summary}
                        </p>
                    )}

                    {Array.isArray(opportunities.opportunities) &&
                        opportunities.opportunities.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {opportunities.opportunities.map((opp, i) => {
                                const priorityConfig = {
                                    high: { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", icon: "🔴" },
                                    medium: { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", icon: "🟡" },
                                    low: { color: "#10b981", bg: "#f0fdf4", border: "#a7f3d0", icon: "🟢" },
                                };
                                const priority = opp.priority?.toLowerCase() ?? "low";
                                const cfg = priorityConfig[priority] ?? priorityConfig.low;

                                const priorityLabel = {
                                    high: t("priority_high"),
                                    medium: t("priority_medium"),
                                    low: t("priority_low"),
                                }[priority] ?? priority;

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            background: cfg.bg,
                                            border: `1px solid ${cfg.border}`,
                                            borderRadius: "10px",
                                            padding: "1rem 1.25rem",
                                            display: "flex",
                                            gap: "0.875rem",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <span style={{ fontSize: "1.25rem", lineHeight: 1.4, flexShrink: 0 }}>
                                            {cfg.icon}
                                        </span>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {opp.title && (
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        fontSize: "0.875rem",
                                                        color: "#0f172a",
                                                        marginBottom: "0.3rem",
                                                    }}
                                                >
                                                    {opp.title}
                                                </div>
                                            )}
                                            {opp.description && (
                                                <div
                                                    style={{
                                                        fontSize: "0.8rem",
                                                        color: "#475569",
                                                        lineHeight: 1.55,
                                                    }}
                                                >
                                                    {opp.description}
                                                </div>
                                            )}
                                            {opp.action && (
                                                <div
                                                    style={{
                                                        marginTop: "0.5rem",
                                                        fontSize: "0.78rem",
                                                        color: cfg.color,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    → {opp.action}
                                                </div>
                                            )}
                                        </div>

                                        <span
                                            style={{
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                                color: cfg.color,
                                                background: "#fff",
                                                border: `1px solid ${cfg.border}`,
                                                borderRadius: "20px",
                                                padding: "2px 10px",
                                                flexShrink: 0,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.04em",
                                            }}
                                        >
                                            {priorityLabel}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="od-chart-empty">{t("no_opportunities")}</div>
                    )}
                </div>
            )}
        </div>
    );
}