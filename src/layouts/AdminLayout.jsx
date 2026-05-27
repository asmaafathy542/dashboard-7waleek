// AdminLayout.jsx — نسخة responsive

import { useLanguage } from "../context/LanguageContext";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../shared/components/ui/ThemeToggle";

// ─────────────────────────────────────────────
// Bottom Nav — بيظهر بس على الموبايل (CSS بيتحكم فيه)
// ─────────────────────────────────────────────
function MobileBottomNav({ location, notifBadge, navItems, t }) {
    return (
        <nav className="mobile-bottom-nav">
            {navItems.map((item) => {
                const isActive = item.path === ""
                    ? location.pathname === "/admin-dashboard"
                    : location.pathname.includes(item.path);

                const badge = item.path === "notifications" ? notifBadge : 0;

                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={isActive ? "active" : ""}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        {badge > 0 && (
                            <span className="nav-badge">{badge}</span>
                        )}
                    </Link>
                );
            })}
            <button
                onClick={() => {
                    localStorage.clear();
                    window.location.href = "/login";
                }}
            >
                <span className="nav-icon">🚪</span>
                <span className="nav-label">{t("logout")}</span>
            </button>
        </nav>
    );
}

export default function AdminLayout() {
    const { isDark, colors } = useTheme();
    const { lang, toggleLang, t } = useLanguage();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [notifBadge, setNotifBadge] = useState(0);
    const [requests, setRequests] = useState([]);
    const [reqLoading, setReqLoading] = useState(true);

    const [overview, setOverview] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const overviewFetchedRef = useRef(false);

    const navItems = [
        { label: t("overview"),      path: "",              icon: "📊" },
        { label: t("owners"),        path: "owners",        icon: "🏪" },
        { label: t("places"),        path: "places",        icon: "📍" },
        { label: t("users"),         path: "users",         icon: "👥" },
        { label: t("reports"),       path: "reports",       icon: "🚩" },
        { label: t("notifications"), path: "notifications", icon: "🔔" },
    ];

    const fetchOverview = async (forceRefresh = false) => {
        if (!forceRefresh && overviewFetchedRef.current) return;
        setOverviewLoading(true);
        try {
            const res = await fetch(
                "https://aroundubackend-production.up.railway.app/api/dashboard/admin/stats/overview",
                { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
            );
            const data = await res.json();
            setOverview(data);
            overviewFetchedRef.current = true;
        } catch {
            setOverview(null);
        } finally {
            setOverviewLoading(false);
        }
    };

    const fetchPending = async () => {
        try {
            const res = await fetch(
                "https://aroundubackend-production.up.railway.app/api/dashboard/admin/notifications/requests",
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                    },
                }
            );
            const data = await res.json();
            const arr = Array.isArray(data) ? data : (data?.requests ?? data?.items ?? []);
            setRequests(arr);
            setNotifBadge(arr.filter((r) => r.status === "PENDING").length);
        } catch {
            setNotifBadge(0);
        } finally {
            setReqLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
        fetchPending();
        const interval = setInterval(fetchPending, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="admin-layout-wrapper"
            style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif", background: colors.mainBg, transition: "background 0.3s ease" }}
        >
            {/* ── Sidebar ── */}
            <div
                className="admin-layout-sidebar"
                style={{
                    width: collapsed ? "64px" : "240px",
                    background: colors.sidebarBg,
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    overflowY: "auto",
                    overflowX: "hidden",
                    zIndex: 10,
                    transition: "width 0.25s ease",
                }}
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setCollapsed((prev) => !prev)}
                    title={collapsed ? "Expand" : "Collapse"}
                    style={{
                        alignSelf: collapsed ? "center" : "flex-end",
                        margin: "12px 10px 4px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        color: "#94a3b8",
                        fontSize: "11px",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                    }}
                >
                    {collapsed ? "▶" : "◀"}
                </button>

                {/* Admin Badge */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: collapsed ? "12px 8px" : "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    justifyContent: collapsed ? "center" : "flex-start",
                }}>
                    <div style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        background: "#1e40af",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                    }}>
                        🛡️
                    </div>
                    {!collapsed && (
                        <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>
                                Admin Panel
                            </div>
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                                AroundU Dashboard
                            </div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{
                    padding: "16px 8px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                }}>
                    {navItems.map((item) => {
                        const isActive = item.path === ""
                            ? location.pathname === "/admin-dashboard"
                            : location.pathname.includes(item.path);

                        const badge = item.path === "notifications" ? notifBadge : 0;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={collapsed ? item.label : ""}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: collapsed ? 0 : "10px",
                                    padding: collapsed ? "10px" : "10px 12px",
                                    borderRadius: "8px",
                                    color: isActive ? "#ffffff" : "#94a3b8",
                                    textDecoration: "none",
                                    fontSize: "14px",
                                    fontWeight: isActive ? 500 : 400,
                                    background: isActive ? "#2563eb" : "transparent",
                                    transition: "all 0.15s",
                                    justifyContent: collapsed ? "center" : "flex-start",
                                    position: "relative",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <span style={{ fontSize: "18px", width: "22px", textAlign: "center", flexShrink: 0 }}>
                                    {item.icon}
                                </span>

                                {!collapsed && (
                                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {item.label}
                                    </span>
                                )}

                                {badge > 0 && (
                                    <span style={{
                                        background: "#ef4444",
                                        color: "#fff",
                                        fontSize: collapsed ? "0.6rem" : "0.7rem",
                                        fontWeight: 700,
                                        padding: "2px 7px",
                                        borderRadius: "999px",
                                        minWidth: "20px",
                                        textAlign: "center",
                                        flexShrink: 0,
                                        ...(collapsed ? {
                                            position: "absolute",
                                            top: "4px",
                                            right: "4px",
                                            padding: "1px 5px",
                                        } : { marginLeft: "auto" }),
                                    }}>
                                        {badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Buttons */}
                <div style={{ padding: "16px 8px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    
                    <ThemeToggle collapsed={collapsed} />

                    {/* Language Toggle */}
                    <button
                        onClick={toggleLang}
                        title={collapsed ? "Language" : ""}
                        style={{
                            width: "100%",
                            padding: collapsed ? "10px" : "10px 12px",
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#94a3b8",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: collapsed ? 0 : "10px",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#94a3b8";
                        }}
                    >
                        <span>🌐</span>
                        {!collapsed && <span>{lang === "en" ? "العربية" : "English"}</span>}
                    </button>

                    {/* Logout */}
                    <button
                        title={collapsed ? "Logout" : ""}
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = "/login";
                        }}
                        style={{
                            width: "100%",
                            padding: collapsed ? "10px" : "10px 12px",
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#94a3b8",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: collapsed ? 0 : "10px",
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#94a3b8";
                        }}
                    >
                        <span>🚪</span>
                        {!collapsed && <span>{t("logout")}</span>}
                    </button>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div
                className="admin-layout-main"
                style={{
                    flex: 1,
                    background: colors.mainBg,
                    color: colors.text,
                    padding: "32px",
                    overflowY: "auto",
                    transition: "background 0.3s ease",
                }}
            >
                <Outlet context={{
                    requests,
                    reqLoading,
                    refetchRequests: fetchPending,
                    overview,
                    overviewLoading,
                    refetchOverview: () => {
                        overviewFetchedRef.current = false;
                        fetchOverview(true);
                    }
                }} />
            </div>

            {/* ── Mobile Bottom Nav ── */}
            <MobileBottomNav
                location={location}
                notifBadge={notifBadge}
                navItems={navItems}
                t={t}
            />
        </div>
    );
}