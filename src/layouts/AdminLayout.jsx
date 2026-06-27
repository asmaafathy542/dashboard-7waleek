// AdminLayout.jsx

import { useLanguage } from "../context/LanguageContext";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

// ─────────────────────────────────────────────
// Settings Menu — جوه الـ Sidebar
// ─────────────────────────────────────────────
function SidebarSettings({ isDark, toggleTheme, lang, toggleLang, collapsed, t }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: "relative" }}>
            <button
                onClick={() => setOpen(v => !v)}
                title="Settings"
                style={{
                    width: "100%",
                    padding: collapsed ? "10px" : "10px 12px",
                    background: open ? "rgba(255,255,255,0.1)" : "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#94a3b8",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: collapsed ? 0 : "10px",
                    transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = open ? "rgba(255,255,255,0.1)" : "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
            >
                <span>⚙️</span>
                {!collapsed && <span>{t("settings")}</span>}
            </button>

            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
                    <div style={{
                        position: "absolute",
                        bottom: "48px",
                        left: collapsed ? "60px" : "0px",
                        right: "0px",
                        background: "#1e293b",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        padding: "6px",
                        zIndex: 99,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                        minWidth: "160px",
                    }}>
                        <button
                            onClick={() => { toggleTheme(); setOpen(false); }}
                            style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                width: "100%", padding: "10px 14px",
                                background: "transparent", border: "none",
                                borderRadius: "8px", color: "#e2e8f0",
                                fontSize: "13px", fontWeight: 500,
                                cursor: "pointer", textAlign: "left",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                            <span>{isDark ? "☀️" : "🌙"}</span>
                            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                        </button>

                        <button
                            onClick={() => { toggleLang(); setOpen(false); }}
                            style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                width: "100%", padding: "10px 14px",
                                background: "transparent", border: "none",
                                borderRadius: "8px", color: "#e2e8f0",
                                fontSize: "13px", fontWeight: 500,
                                cursor: "pointer", textAlign: "left",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                            <span>🌐</span>
                            <span>{lang === "en" ? "العربية" : "English"}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Bottom Nav — موبايل بس
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
                    <Link key={item.path} to={item.path} className={isActive ? "active" : ""}>
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        {badge > 0 && <span className="nav-badge">{badge}</span>}
                    </Link>
                );
            })}
            <button onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
                <span className="nav-icon">🚪</span>
                <span className="nav-label">{t("logout")}</span>
            </button>
        </nav>
    );
}

// ─────────────────────────────────────────────
// Settings FAB — موبايل بس
// ─────────────────────────────────────────────
function AdminSettingsFAB({ isDark, toggleTheme, lang, toggleLang }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="admin-settings-fab-wrapper">
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
                    <div className="admin-settings-fab-menu">
                        <button onClick={() => { toggleTheme(); setOpen(false); }} className="admin-settings-fab-item">
                            <span style={{ fontSize: "18px" }}>{isDark ? "☀️" : "🌙"}</span>
                            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                        </button>
                        <button onClick={() => { toggleLang(); setOpen(false); }} className="admin-settings-fab-item">
                            <span style={{ fontSize: "18px" }}>🌐</span>
                            <span>{lang === "en" ? "عربي" : "English"}</span>
                        </button>
                    </div>
                </>
            )}
            <button onClick={() => setOpen((v) => !v)} className="admin-settings-fab-btn">
                {open ? "✕" : "⚙️"}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Layout
// ─────────────────────────────────────────────
export default function AdminLayout() {
    const { isDark, colors, toggleTheme } = useTheme();
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
        { label: t("overview"), path: "", icon: "📊" },
        { label: t("owners"), path: "owners", icon: "🏪" },
        { label: t("places"), path: "places", icon: "📍" },
        { label: t("users"), path: "users", icon: "👥" },
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
        } catch { setOverview(null); }
        finally { setOverviewLoading(false); }
    };

    const fetchPending = async () => {
        try {
            const res = await fetch(
                "https://aroundubackend-production.up.railway.app/api/dashboard/admin/notifications/requests",
                { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
            );
            const data = await res.json();
            const arr = Array.isArray(data) ? data : (data?.requests ?? data?.items ?? []);
            setRequests(arr);
            setNotifBadge(arr.filter((r) => r.status === "PENDING").length);
        } catch { setNotifBadge(0); }
        finally { setReqLoading(false); }
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
            style={{ display: "flex", minHeight: "100vh", fontFamily: "'Cairo', sans-serif", background: "var(--bg-main)", transition: "background 0.3s ease" }}
        >
            {/* ── Sidebar ── */}
            <div
                className="admin-layout-sidebar"
                style={{
                    width: collapsed ? "64px" : "240px",
                    background: "var(--bg-sidebar)",
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
                    style={{
                        alignSelf: collapsed ? "center" : "flex-end",
                        margin: "12px 10px 4px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        color: "#94a3b8",
                        fontSize: "11px",
                        width: "28px", height: "28px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", flexShrink: 0,
                    }}
                >
                    {collapsed ? "▶" : "◀"}
                </button>

                {/* Admin Badge */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: collapsed ? "12px 8px" : "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    justifyContent: collapsed ? "center" : "flex-start",
                }}>
                    <div style={{
                        width: "38px", height: "38px", borderRadius: "10px",
                        background: "var(--color-primary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "18px", flexShrink: 0,
                    }}>🛡️</div>
                    {!collapsed && (
                        <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>Admin Panel</div>
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>AroundU Dashboard</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ padding: "16px 8px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
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
                                    display: "flex", alignItems: "center",
                                    gap: collapsed ? 0 : "10px",
                                    padding: collapsed ? "10px" : "10px 12px",
                                    borderRadius: "8px",
                                    color: isActive ? "#ffffff" : "#94a3b8",
                                    textDecoration: "none",
                                    fontSize: "14px",
                                    fontWeight: isActive ? 500 : 400,
                                    background: isActive ? "var(--color-primary)" : "transparent",
                                    transition: "all 0.15s",
                                    justifyContent: collapsed ? "center" : "flex-start",
                                    position: "relative",
                                    whiteSpace: "nowrap", overflow: "hidden",
                                }}
                                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                            >
                                <span style={{ fontSize: "18px", width: "22px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                                {!collapsed && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                                {badge > 0 && (
                                    <span style={{
                                        background: "var(--danger)", color: "#fff",
                                        fontSize: collapsed ? "0.6rem" : "0.7rem",
                                        fontWeight: 700, padding: "2px 7px",
                                        borderRadius: "999px", minWidth: "20px",
                                        textAlign: "center", flexShrink: 0,
                                        ...(collapsed ? { position: "absolute", top: "4px", right: "4px", padding: "1px 5px" } : { marginLeft: "auto" }),
                                    }}>{badge}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Buttons */}
                <div style={{ padding: "16px 8px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "8px" }}>

                    {/* ⚙️ Settings — بيجمع الثيم واللغة */}
                    <SidebarSettings
                        isDark={isDark}
                        toggleTheme={toggleTheme}
                        lang={lang}
                        toggleLang={toggleLang}
                        collapsed={collapsed}
                        t={t}
                    />

                    {/* Logout */}
                  {/* Logout */}
<button
    title={collapsed ? "Logout" : ""}
    onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
    style={{
        width: "100%",
        padding: collapsed ? "13px" : "13px 16px",
        background: "transparent",
        border: "2px solid rgba(239, 68, 68, 0.6)",
        borderRadius: "10px",
        color: "#f87171",
        fontFamily: "'Cairo', sans-serif",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: collapsed ? 0 : "10px",
        transition: "all 0.2s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)"; e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.6)"; e.currentTarget.style.color = "#fca5a5"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)"; e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)"; e.currentTarget.style.color = "#f87171"; }}
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
                    background: "var(--bg-main)",
                    color: "var(--text-main)",
                    padding: "32px",
                    overflowY: "auto",
                    transition: "background 0.3s ease",
                }}
            >
                <Outlet context={{
                    requests, reqLoading,
                    refetchRequests: fetchPending,
                    overview, overviewLoading,
                    refetchOverview: () => { overviewFetchedRef.current = false; fetchOverview(true); }
                }} />
            </div>

            {/* ── موبايل بس ── */}
            <AdminSettingsFAB isDark={isDark} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} />
            <MobileBottomNav location={location} notifBadge={notifBadge} navItems={navItems} t={t} />
        </div>
    );
}