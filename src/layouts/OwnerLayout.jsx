// OwnerLayout.jsx

import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { getMyPlaces } from "../features/places/services/placesService";
import { getOrdersByBranch } from "../features/orders/services/ordersService";
import { getReviews } from "../features/reviews/services/reviewsService";

import {
  saveSelectedBranch,
  getSelectedBranch,
} from "../store/authStore";

import AddBranchModal from "../features/places/components/AddBranchModal";

import "./ownerLayout.css";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import ThemeToggle from "../shared/components/ui/ThemeToggle";

function MobileBranchSwitcher({ places, selectedPlace, onSelect, onAddBranch, isResidential, t }) {
  const [open, setOpen] = useState(false);

  if (isResidential || places.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 990,
          display: "flex", alignItems: "center", gap: "8px",
          background: "#0f172a",
          border: "1.5px solid rgba(255,255,255,0.15)",
          borderRadius: "999px",
          padding: "8px 16px",
          color: "#fff", fontSize: "13px", fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
          maxWidth: "220px",
          whiteSpace: "nowrap", overflow: "hidden",
        }}
      >
        <span style={{ fontSize: "15px" }}>🏪</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
          {selectedPlace?.name ?? t("select_branch")}
        </span>
        <span style={{ fontSize: "10px", color: "#94a3b8", flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 991,
              background: "rgba(0,0,0,0.5)",
            }}
          />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            zIndex: 992,
            background: "#fff",
            borderRadius: "20px 20px 0 0",
            padding: "0 0 32px",
            boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#e2e8f0" }} />
            </div>
            <div style={{
              padding: "8px 20px 12px",
              fontSize: "13px", fontWeight: 700, color: "#64748b",
              textTransform: "uppercase", letterSpacing: "0.05em",
              borderBottom: "1px solid #f1f5f9",
            }}>
              {t("choose_branch")}
            </div>
            <div style={{ padding: "8px 12px" }}>
              {places.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    width: "100%", padding: "12px 14px",
                    background: selectedPlace?.id === p.id ? "#eff6ff" : "transparent",
                    border: "none", borderRadius: "12px",
                    cursor: "pointer", textAlign: "left",
                    marginBottom: "4px",
                  }}
                >
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "10px",
                    background: selectedPlace?.id === p.id ? "#2563eb" : "#f1f5f9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px", flexShrink: 0,
                  }}>
                    🏪
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "14px", fontWeight: 600,
                      color: selectedPlace?.id === p.id ? "#1d4ed8" : "#0f172a",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.name}
                    </div>
                    {p.address && (
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📍 {p.address}
                      </div>
                    )}
                  </div>
                  {selectedPlace?.id === p.id && (
                    <span style={{
                      width: "20px", height: "20px", borderRadius: "50%",
                      background: "#2563eb", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", flexShrink: 0,
                    }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ padding: "0 12px" }}>
              <button
                onClick={() => { setOpen(false); onAddBranch(); }}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  width: "100%", padding: "12px 14px",
                  background: "#f8fafc",
                  border: "1.5px dashed #cbd5e1",
                  borderRadius: "12px", cursor: "pointer",
                }}
              >
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px",
                  background: "#eff6ff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", flexShrink: 0,
                }}>
                  ➕
                </div>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#2563eb" }}>
                  {t("add_branch")}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MobileBottomNav({ navItems,
  location,
  onAddBranch,
  isResidential,
  t,
  toggleLang,
  lang, }) {
  const mobileItems = isResidential ? navItems : navItems.filter(item =>
    ["", "places", "items", "orders", "reviews", "notifications", "profile"].includes(item.path)
  );

  return (
    <nav className="mobile-bottom-nav">
      {mobileItems.map((item) => {
        const isActive =
          item.path === ""
            ? location.pathname === "/owner-dashboard"
            : location.pathname.includes(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={isActive ? "active" : ""}
          >
            <span className="nav-label">{item.label}</span>
            {item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
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


        <span className="nav-label">{t("logout")}</span>
      </button>
    </nav>
  );
}

export default function OwnerLayout() {
  const { isDark, colors, toggleTheme } = useTheme();
  const { t, toggleLang, lang } = useLanguage();
  const location = useLocation();
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [orderAlert, setOrderAlert] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const knownIdsRef = useRef(null);
  const knownReviewIdsRef = useRef(null);
  const swRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isResidential = user?.owner_type === "RESIDENTIAL";

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    if (isResidential) { setPlacesLoading(false); return; }
    const savedId = getSelectedBranch();
    getMyPlaces()
      .then((data) => {
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        setPlaces(arr);
        if (arr.length === 0) { setPlacesLoading(false); return; }
        const found = savedId ? arr.find((p) => p.id === savedId) : null;
        const initial = found ?? arr[0];
        setSelectedPlace(initial);
        saveSelectedBranch(initial.id);
      })
      .catch((err) => console.error("getMyPlaces error", err))
      .finally(() => setPlacesLoading(false));
  }, [isResidential]);

  useEffect(() => {
    if (isIOS) { console.log("Skip Service Worker on iOS"); return; }
    if (!("serviceWorker" in navigator)) return;
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        swRef.current = reg;
      } catch (err) {
        console.error("Service Worker registration failed:", err);
      }
    };
    registerSW();
  }, [isIOS]);

  useEffect(() => {
    if (isResidential || !selectedPlace?.id) return;
    knownIdsRef.current = null;
    const sendPushNotification = async (count) => {
      try {
        if (isIOS) return;
        if (!swRef.current) return;
        const reg = swRef.current;
        if (reg && reg.active) {
          reg.active.postMessage({ type: "NEW_ORDER", count, placeName: selectedPlace?.name ?? "" });
        }
      } catch (err) { console.error(err); }
    };
    const checkOrders = async () => {
      try {
        const data = await getOrdersByBranch(selectedPlace.id);
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        const pendingOrders = arr.filter((o) => o && o.status === "PENDING");
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(arr.filter((o) => o?.id).map((o) => o.id));
          setOrderAlert(pendingOrders.length);
          return;
        }
        const newOrders = arr.filter((o) => o?.id && !knownIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          await sendPushNotification(newOrders.length);
          newOrders.forEach((o) => knownIdsRef.current.add(o.id));
        }
        setOrderAlert(pendingOrders.length);
      } catch (err) { console.error("Polling error", err); }
    };
    checkOrders();
    const interval = setInterval(checkOrders, 30000);
    return () => clearInterval(interval);
  }, [selectedPlace?.id, isResidential, isIOS]);

  useEffect(() => {
    if (isResidential || !selectedPlace?.id) return;
    knownReviewIdsRef.current = null;
    const checkReviews = async () => {
      try {
        const data = await getReviews(selectedPlace.id, 1, 5);
        const arr = Array.isArray(data?.items) ? data.items : [];
        if (knownReviewIdsRef.current === null) {
          knownReviewIdsRef.current = new Set(arr.filter((r) => r?.id).map((r) => r.id));
          return;
        }
        const newReviews = arr.filter((r) => r?.id && !knownReviewIdsRef.current.has(r.id));
        if (newReviews.length > 0) {
          try {
            if (!isIOS && swRef.current?.active) {
              swRef.current.active.postMessage({ type: "NEW_REVIEW", count: newReviews.length, placeName: selectedPlace?.name ?? "" });
            }
          } catch (err) { console.error(err); }
          newReviews.forEach((r) => knownReviewIdsRef.current.add(r.id));
        }
      } catch (err) { console.error("Reviews polling error", err); }
    };
    checkReviews();
    const interval = setInterval(checkReviews, 30000);
    return () => clearInterval(interval);
  }, [selectedPlace?.id, isResidential, isIOS]);

  const handleSelectBranch = (place) => {
    setSelectedPlace(place);
    saveSelectedBranch(place.id);
    setBranchMenuOpen(false);
  };

  const navItems = isResidential
    ? [
      { label: t("overview"), path: "", icon: "📊" },
      { label: t("properties"), path: "properties", icon: "🏡" },
      { label: t("reviews"), path: "reviews", icon: "⭐" },
      { label: t("notifications"), path: "notifications", icon: "🔔" },
      { label: t("profile"), path: "profile", icon: "👤" },
    ]
    : [
      { label: t("overview"), path: "", icon: "📊" },
      { label: t("places"), path: "places", icon: "🏠" },
      { label: t("items"), path: "items", icon: "🍔" },
      // { label: t("subcategories"), path: "subcategories", icon: "📋" },
      { label: t("orders"), path: "orders", icon: "📦", badge: orderAlert },
      { label: t("reviews"), path: "reviews", icon: "⭐" },
      { label: t("notifications"), path: "notifications", icon: "🔔" },
      { label: t("profile"), path: "profile", icon: "👤" },
    ];

  const placeName = selectedPlace?.name ?? "";

  return (
    <div className="owner-layout">
      <div className="mobile-branch-switcher-wrapper">
        <MobileBranchSwitcher
          places={places}
          selectedPlace={selectedPlace}
          onSelect={handleSelectBranch}
          onAddBranch={() => setShowAddBranch(true)}
          isResidential={isResidential}
          t={t}
        />
      </div>

      {/* Sidebar */}
      <div className={`owner-sidebar ${collapsed ? "collapsed" : ""}`}>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? "▶" : "◀"}
        </button>

        <nav className="owner-nav">

          {/* ── User card — RESIDENTIAL only ── */}
          {isResidential && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              width: "100%", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px",
              padding: collapsed ? "8px 6px" : "12px 8px",
              marginBottom: "2px", gap: "6px",
            }}>
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user?.name ?? ""}
                  style={{
                    width: collapsed ? "28px" : "48px",
                    height: collapsed ? "28px" : "48px",
                    borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                    border: "2px solid rgba(255,255,255,0.15)",
                    transition: "all 0.25s",
                  }}
                />
              ) : (
                <div style={{
                  width: collapsed ? "28px" : "48px",
                  height: collapsed ? "28px" : "48px",
                  borderRadius: "50%", background: "#1e40af",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: collapsed ? "14px" : "22px",
                  border: "2px solid rgba(255,255,255,0.15)",
                  flexShrink: 0, transition: "all 0.25s",
                }}>🏡</div>
              )}
              {!collapsed && (
                <div style={{ textAlign: "center", width: "100%" }}>
                  <div style={{
                    color: "#fff", fontWeight: 700, fontSize: "13px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {user?.name ?? user?.username ?? "Owner"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                    {t("residential_label")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Branch switcher — COMMERCIAL only ── */}
          {!isResidential && places.length > 0 && (
            <>
              <button
                onClick={() => setBranchMenuOpen((v) => !v)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px",
                  padding: collapsed ? "8px 6px" : "12px 8px",
                  cursor: "pointer", marginBottom: "2px",
                  transition: "background 0.15s", gap: "6px",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              >
                {(() => {
                  const img = selectedPlace?.images?.find((i) => i.image_type === "place");
                  return img ? (
                    <img
                      src={img.image_url}
                      alt={selectedPlace?.name ?? ""}
                      style={{
                        width: collapsed ? "28px" : "48px",
                        height: collapsed ? "28px" : "48px",
                        borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                        border: "2px solid rgba(255,255,255,0.15)",
                        transition: "all 0.25s",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: collapsed ? "28px" : "48px",
                      height: collapsed ? "28px" : "48px",
                      borderRadius: "50%", background: "#1e40af",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: collapsed ? "14px" : "22px",
                      border: "2px solid rgba(255,255,255,0.15)",
                      flexShrink: 0, transition: "all 0.25s",
                    }}>🏪</div>
                  );
                })()}
                {!collapsed && (
                  <div style={{ textAlign: "center", width: "100%" }}>
                    <div style={{
                      color: "#fff", fontWeight: 700, fontSize: "13px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {selectedPlace?.name ?? t("select_branch")}
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                      {branchMenuOpen ? "▲" : "▼"}
                    </div>
                  </div>
                )}
              </button>

              {branchMenuOpen && !collapsed && places.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { handleSelectBranch(p); setBranchMenuOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    width: "100%", padding: "7px 12px 7px 28px",
                    background: selectedPlace?.id === p.id ? "rgba(37,99,235,0.15)" : "transparent",
                    border: "none", borderRadius: "8px",
                    color: selectedPlace?.id === p.id ? "#93c5fd" : "#64748b",
                    fontSize: "12px", fontWeight: selectedPlace?.id === p.id ? 600 : 400,
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: "12px" }}>└</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  {selectedPlace?.id === p.id && <span style={{ fontSize: "10px", color: "#3b82f6" }}>✓</span>}
                </button>
              ))}

              {branchMenuOpen && !collapsed && (
                <button
                  onClick={() => { setBranchMenuOpen(false); setShowAddBranch(true); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    width: "100%", padding: "7px 12px 7px 28px",
                    background: "transparent", border: "none", borderRadius: "8px",
                    color: "#60a5fa", fontSize: "12px", fontWeight: 500,
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "2px",
                  }}
                >
                  <span style={{ fontSize: "12px" }}>＋</span>
                  <span>{t("add_branch")}</span>
                </button>
              )}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
            </>
          )}

          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`owner-nav-link ${item.path === ""
                ? location.pathname === "/owner-dashboard" ? "active" : ""
                : location.pathname.includes(item.path) ? "active" : ""
                }`}
            >
              <span className="owner-nav-icon">{item.icon}</span>
              {!collapsed && <span className="owner-nav-label">{item.label}</span>}
              {item.badge > 0 && <span className="owner-nav-badge">{item.badge}</span>}
            </Link>
          ))}

        </nav>

        <div className="owner-sidebar-logout">
          <button
            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
            className="owner-logout-btn"
            title={collapsed ? t("logout") : ""}
          >
            <span className="owner-nav-icon">🚪</span>
            {!collapsed && <span className="owner-nav-label">{t("logout")}</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      {/* Main */}
      <div className="owner-main" style={{ background: colors.mainBg, color: colors.text, transition: "background 0.3s ease" }}>
        <Outlet
          context={{
            selectedPlaceId: selectedPlace?.id ?? null,
            placeName,
            selectedPlace,
            allBranches: places,
            placesLoading,
          }}
        />
      </div>
      <button onClick={toggleTheme} className="mobile-dark-toggle">
        {isDark ? "☀️" : "🌙"}
      </button>
      <MobileBottomNav
        navItems={navItems}
        location={location}
        onAddBranch={() => setShowAddBranch(true)}
        isResidential={isResidential}
        t={t}
        toggleLang={toggleLang}
        lang={lang}
      />

      {
        !isResidential && showAddBranch && (
          <AddBranchModal
            onClose={() => setShowAddBranch(false)}
            onSuccess={(newBranch) => {
              getMyPlaces()
                .then((data) => {
                  const arr = Array.isArray(data) ? data : data ? [data] : [];
                  setPlaces(arr);
                  const selected = newBranch
                    ? (arr.find((p) => p.id === newBranch.id) ?? arr[arr.length - 1])
                    : arr[arr.length - 1];
                  if (selected) {
                    setSelectedPlace(selected);
                    saveSelectedBranch(selected.id);
                  }
                })
                .catch(console.error);
            }}
          />
        )
      }
    </div >
  );
}