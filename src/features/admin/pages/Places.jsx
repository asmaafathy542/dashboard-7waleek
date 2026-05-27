// places.jsx(admin)
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

const STATUS_COLORS = {
    active: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
    inactive: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
    suspended: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
};

const statusStyle = (status) => {
    const key = (status ?? "").toLowerCase();
    return STATUS_COLORS[key] ?? STATUS_COLORS.inactive;
};

/* ─────────────── CONFIRM POPUP ─────────────── */
function ConfirmPopup({ message, subMessage, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
    return (
        <div
            onClick={onCancel}
            style={{
                position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 2000, padding: "1rem",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "360px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.18)", padding: "28px 24px", textAlign: "center",
                }}
            >
                <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>{danger ? "🗑️" : "⚠️"}</div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{message}</p>
                <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "22px" }}>
                    {subMessage ?? (danger ? "This action cannot be undone." : "Are you sure you want to continue?")}
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#475569" }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: danger ? "#dc2626" : "#0f172a", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────── CREATE PLACE MODAL ─────────────── */
function CreatePlaceModal({ onClose, onCreated }) {
    const [form, setForm] = useState({
        place_name: "", description: "", category_id: "",
        location_link: "", latitude: "", longitude: "",
        owner_email: "", owner_password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(true);
    const [geoLoading, setGeoLoading] = useState(false);

    useState(() => {
        const fetchCats = async () => {
            try {
                const data = await apiFetch("/v1/categories");
                const arr = Array.isArray(data) ? data : (data?.categories ?? data?.data ?? []);
                setCategories(arr);
            } catch { /* silently fail */ } finally {
                setCatLoading(false);
            }
        };
        fetchCats();
    }, []);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setError("");
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) { setError("Geolocation is not supported by your browser."); return; }
        setGeoLoading(true);
        setError("");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setForm((prev) => ({ ...prev, latitude: lat.toString(), longitude: lng.toString(), location_link: `https://www.google.com/maps?q=${lat},${lng}` }));
                setGeoLoading(false);
            },
            () => { setError("Could not get your location. Please allow location access."); setGeoLoading(false); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = async () => {
        const required = ["place_name", "category_id", "latitude", "longitude", "owner_email", "owner_password"];
        for (const field of required) {
            if (!form[field].toString().trim()) { setError(`Please fill in: ${field.replace(/_/g, " ")}`); return; }
        }
        setLoading(true);
        setError("");
        try {
            const body = { ...form, category_id: Number(form.category_id), latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) };
            const result = await apiFetch("/dashboard/admin/places", { method: "POST", body: JSON.stringify(body) });
            onCreated(result);
            onClose();
        } catch {
            setError("Failed to create place. Check your inputs and try again.");
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e4e2dd", fontSize: "13px", color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#fff" };
    const labelStyle = { fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "5px", display: "block" };

    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f0ec", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>🏪 Create New Place</h2>
                        <p style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0" }}>Creates a place and its owner account automatically</p>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8", lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ padding: "20px 24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Place Name *</label>
                            <input type="text" placeholder="e.g. Bolivar Café" value={form.place_name} onChange={handleChange("place_name")} style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Description</label>
                            <input type="text" placeholder="Short description..." value={form.description} onChange={handleChange("description")} style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Category *</label>
                            {catLoading ? (
                                <div style={{ ...inputStyle, color: "#94a3b8" }}>Loading categories...</div>
                            ) : categories.length > 0 ? (
                                <select value={form.category_id} onChange={handleChange("category_id")} style={{ ...inputStyle, cursor: "pointer" }}>
                                    <option value="">— Select a category —</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id ?? cat.category_id} value={cat.id ?? cat.category_id}>
                                            {cat.name ?? cat.category_name ?? cat.title ?? `Category ${cat.id}`}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input type="number" placeholder="e.g. 1" value={form.category_id} onChange={handleChange("category_id")} style={inputStyle} />
                            )}
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>Location Link</label>
                                <button type="button" onClick={handleUseMyLocation} disabled={geoLoading} style={{ fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", border: "1px solid #bfdbfe", background: geoLoading ? "#f1f5f9" : "#eff6ff", color: geoLoading ? "#94a3b8" : "#1d4ed8", cursor: geoLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                    {geoLoading ? "⏳ Getting location..." : "📍 Use My Location"}
                                </button>
                            </div>
                            <input type="text" placeholder="Google Maps link" value={form.location_link} onChange={handleChange("location_link")} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Latitude *</label>
                            <input type="number" placeholder="e.g. 29.0731" value={form.latitude} onChange={handleChange("latitude")} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Longitude *</label>
                            <input type="number" placeholder="e.g. 31.0993" value={form.longitude} onChange={handleChange("longitude")} style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Owner Email *</label>
                            <input type="email" placeholder="owner@example.com" value={form.owner_email} onChange={handleChange("owner_email")} style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Owner Password *</label>
                            <div style={{ position: "relative" }}>
                                <input type={showPass ? "text" : "password"} placeholder="Min 8 characters" value={form.owner_password} onChange={handleChange("owner_password")} style={{ ...inputStyle, paddingRight: "40px" }} />
                                <button onClick={() => setShowPass((p) => !p)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#94a3b8", lineHeight: 1 }}>
                                    {showPass ? "🙈" : "👁"}
                                </button>
                            </div>
                        </div>
                    </div>
                    {error && (
                        <div style={{ marginTop: "14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#b91c1c" }}>⚠️ {error}</div>
                    )}
                </div>
                <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f0ec", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#475569" }}>Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: loading ? "#94a3b8" : "#0f172a", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
                        {loading ? "Creating..." : "✓ Create Place"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────── VIEW MODAL ─────────────── */
function PlaceModal({ place, onClose, onToggleStatus }) {
    const [toggling, setToggling] = useState(false);
    const [confirmToggle, setConfirmToggle] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (!place) return null;

    const id = place.Place_ID;
    const name = place.Name ?? "—";
    const category = place.Category ?? "—";
    const district = place.District ?? "—";
    const status = place.Status ?? "—";
    const rating = place.Rating ?? 0;
    const reviews = place.Reviews ?? 0;
    const saves = place.Saves ?? 0;
    const visits = place.Visits ?? 0;
    const added = place.Added ? new Date(place.Added).toLocaleDateString() : "—";
    const isActive = status.toLowerCase() === "active";
    const ss = statusStyle(status);

    const handleToggle = async () => {
        setConfirmToggle(false);
        setToggling(true);
        try {
            const newActive = !isActive;
            await apiFetch(`/dashboard/admin/places/${id}/status?active=${newActive}`, { method: "POST" });
            onToggleStatus(id, newActive ? "Active" : "Suspended");
            onClose();
        } catch {
            alert("Failed to update status.");
        } finally {
            setToggling(false);
        }
    };

    const handleDelete = async () => {
        setConfirmDelete(false);
        try {
            const numericId = String(id).replace(/^P-/i, "");
            await apiFetch(`/dashboard/admin/db/table/places/${numericId}`, { method: "DELETE" });
            onToggleStatus(id, "__DELETED__");
            onClose();
        } catch {
            alert("Failed to delete place.");
        }
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
                <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "480px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                    <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f0ec", display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, flexShrink: 0 }}>
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{name}</h2>
                            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0" }}>Place Details</p>
                        </div>
                        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8", lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ padding: "14px 24px", display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid #f1f0ec" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px", background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>{status}</span>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "999px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>📂 {category}</span>
                    </div>
                    <div style={{ padding: "16px 24px" }}>
                        {[["ID", id], ["District", district], ["Added", added]].map(([label, val]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f8fafc", gap: "12px" }}>
                                <span style={{ fontSize: "13px", color: "#64748b" }}>{label}</span>
                                <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 500 }}>{val}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: "0 24px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                        {[["⭐", typeof rating === "number" ? rating.toFixed(1) : rating, "Rating"], ["💬", reviews, "Reviews"], ["❤️", saves, "Saves"], ["👁", visits, "Visits"]].map(([icon, val, lbl]) => (
                            <div key={lbl} style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 8px", textAlign: "center", border: "1px solid #f1f0ec" }}>
                                <div style={{ fontSize: "18px" }}>{icon}</div>
                                <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>{val}</div>
                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{lbl}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f0ec", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button onClick={() => setConfirmDelete(true)} style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", background: "#fef2f2", color: "#991b1b", marginRight: "auto" }}>🗑 Delete</button>
                        <button onClick={() => setConfirmToggle(true)} disabled={toggling} style={{ padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: toggling ? "not-allowed" : "pointer", border: "none", background: isActive ? "#fef2f2" : "#f0fdf4", color: isActive ? "#991b1b" : "#166534" }}>
                            {toggling ? "..." : isActive ? "🔴 Deactivate" : "🟢 Activate"}
                        </button>
                        <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#475569" }}>Close</button>
                    </div>
                </div>
            </div>
            {confirmToggle && (
                <ConfirmPopup
                    message={`${isActive ? "Deactivate" : "Activate"} "${name}"?`}
                    subMessage={isActive ? "The place will be hidden from the app." : "The place will be visible in the app again."}
                    confirmLabel={isActive ? "Deactivate" : "Activate"}
                    danger={isActive}
                    onConfirm={handleToggle}
                    onCancel={() => setConfirmToggle(false)}
                />
            )}
            {confirmDelete && (
                <ConfirmPopup
                    message={`Delete "${name}" permanently?`}
                    danger={true}
                    confirmLabel="Delete"
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </>
    );
}

/* ─────────────── TOGGLE BUTTON ─────────────── */
function ToggleBtn({ place, onToggle }) {
    const { t } = useLanguage(); // ← أضف السطر ده
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const isActive = (place.Status ?? "").toLowerCase() === "active";

    const handleConfirm = async () => {
        setShowConfirm(false);
        setLoading(true);
        try {
            const newActive = !isActive;
            await apiFetch(`/dashboard/admin/places/${place.Place_ID}/status?active=${newActive}`, { method: "POST" });
            onToggle(place.Place_ID, newActive ? "Active" : "Suspended");
        } catch {
            alert("Failed to update status.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button onClick={() => setShowConfirm(true)} disabled={loading} style={{ padding: "5px 12px", borderRadius: "7px", border: "none", fontSize: "12px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", background: isActive ? "#fef2f2" : "#f0fdf4", color: isActive ? "#991b1b" : "#166534", whiteSpace: "nowrap" }}>
                {loading ? "..." : isActive ? t("deactivate") : t("activate")}
            </button>
            {showConfirm && (
                <ConfirmPopup
                    message={`${isActive ? "Deactivate" : "Activate"} "${place.Name}"?`}
                    subMessage={isActive ? "The place will be hidden from the app." : "The place will be visible in the app again."}
                    confirmLabel={isActive ? "Deactivate" : "Activate"}
                    danger={isActive}
                    onConfirm={handleConfirm}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function AdminPlaces() {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [viewPlace, setViewPlace] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [pageSize, setPageSize] = useState(10);

    // ── useQuery ──────────────────────────────────────────────────────
    const { data: places = [], isLoading: loading, isError } = useQuery({
        queryKey: ["admin-places"],
        queryFn: async () => {
            const data = await apiFetch("/dashboard/admin/stats/places");
            return Array.isArray(data) ? data : (data?.places ?? data?.items ?? data?.data ?? []);
        },
        staleTime: 1000 * 60 * 5,
    });

    const error = isError ? "Failed to load places. Please try again." : "";

    const fetchData = () => queryClient.invalidateQueries({ queryKey: ["admin-places"] });

    const handleToggleStatus = (id, newStatus) => {
        queryClient.setQueryData(["admin-places"], (old = []) =>
            newStatus === "__DELETED__"
                ? old.filter((p) => p.Place_ID !== id)
                : old.map((p) => p.Place_ID === id ? { ...p, Status: newStatus } : p)
        );
    };

    const handleCreated = () => fetchData();

    const categories = useMemo(() => {
        const cats = new Set(places.map((p) => p.Category).filter(Boolean));
        return ["All", ...Array.from(cats)];
    }, [places]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return places.filter((p) => {
            const matchSearch = !q || (p.Name ?? "").toLowerCase().includes(q) || (p.District ?? "").toLowerCase().includes(q);
            const matchStatus = statusFilter === "All" || (p.Status ?? "").toLowerCase() === statusFilter.toLowerCase();
            const matchCategory = categoryFilter === "All" || p.Category === categoryFilter;
            return matchSearch && matchStatus && matchCategory;
        });
    }, [places, search, statusFilter, categoryFilter]);

    const pagination = usePagination(filtered, pageSize);
    const { paginated, reset: resetPage } = pagination;
    useMemo(() => { resetPage(); }, [search, statusFilter, categoryFilter]);

    const total = places.length;
    const active = places.filter((p) => (p.Status ?? "").toLowerCase() === "active").length;
    const inactive = places.filter((p) => (p.Status ?? "").toLowerCase() === "inactive").length;
    const suspended = places.filter((p) => (p.Status ?? "").toLowerCase() === "suspended").length;

    const filterBtnStyle = (isActive) => ({
        padding: "7px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
        cursor: "pointer", border: isActive ? "1.5px solid #0f172a" : "1px solid #e4e2dd",
        background: isActive ? "#0f172a" : "#fff",
        color: isActive ? "#fff" : "#475569",
    });

    return (
        <div style={{ maxWidth: "1200px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}> {t("places")} 🏪</h1>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{loading ? "Loading..." : `${total} ${t("total_places")}`}</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setShowCreate(true)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#0f172a", color: "#fff", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                        + {t("create_place")}
                    </button>
                    <button onClick={fetchData} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e4e2dd", background: "#fff", fontSize: "13px", cursor: "pointer", color: "#475569", fontWeight: 500 }}>
                        🔄 {t("refresh")}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
                {[
                    { icon: "🏪", label: t("total"), value: total, bg: "#f8fafc", color: "#0f172a" },
                    { icon: "✅", label: t("active"), value: active, bg: "#f0fdf4", color: "#166534" },
                    { icon: "❌", label: t("inactive"), value: inactive, bg: "#fef2f2", color: "#991b1b" },
                    { icon: "⏸️", label: t("suspended"), value: suspended, bg: "#fffbeb", color: "#92400e" },
                ].map((s) => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: "12px", padding: "16px 20px", border: "1px solid #e4e2dd" }}>
                        <div style={{ fontSize: "22px", marginBottom: "6px" }}>{s.icon}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Search + Filters */}
            <div style={{ marginBottom: "1.25rem", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: "1", minWidth: "220px", maxWidth: "360px" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8", pointerEvents: "none" }}>🔍</span>
                    <input
                        type="text"
                        placeholder={t("search_placeholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: "8px", border: "1px solid #e4e2dd", fontSize: "13px", color: "#0f172a", outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px" }}>✕</button>
                    )}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                    {[
                        { key: "All", label: t("all") },
                        { key: "Active", label: t("active") },
                        { key: "Inactive", label: t("inactive") },
                        { key: "Suspended", label: t("suspended") },
                    ].map((s) => (
                        <button key={s.key} onClick={() => setStatusFilter(s.key)} style={filterBtnStyle(statusFilter === s.key)}>{s.label}</button>
                    ))}
                </div>
                {categories.length > 1 && (
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e4e2dd", fontSize: "13px", color: "#475569", background: "#fff", cursor: "pointer", outline: "none" }}>
                        {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                )}
            </div>

            {search && (
                <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
                </p>
            )}

            {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 16px", marginBottom: "1rem", fontSize: "13px", color: "#b91c1c" }}>⚠️ {error}</div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94a3b8" }}>Loading...</div>
            ) : filtered.length === 0 ? (
                <div style={{ background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏪</div>
                    <p style={{ fontSize: "14px" }}>No places found.</p>
                </div>
            ) : (
                <div style={{ background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e2dd" }}>
                                    {[t("id"), t("name"), t("category"), t("district"), t("rating"), t("status"), t("actions")].map((h) => (
                                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((place, idx) => {
                                    const ss = statusStyle(place.Status);
                                    return (
                                        <tr
                                            key={place.Place_ID ?? idx}
                                            onClick={() => setViewPlace(place)}
                                            style={{ borderBottom: idx < paginated.length - 1 ? "1px solid #f1f0ec" : "none", cursor: "pointer" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                        >
                                            <td style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 500 }}>{place.Place_ID}</td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, flexShrink: 0 }}>
                                                        {(place.Name ?? "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 500, color: "#0f172a" }}>{place.Name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 14px", color: "#475569" }}>{place.Category ?? "—"}</td>
                                            <td style={{ padding: "12px 14px", color: "#475569" }}>{place.District ?? "—"}</td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontWeight: 600 }}>
                                                    ⭐ {typeof place.Rating === "number" ? place.Rating.toFixed(1) : (place.Rating ?? 0)}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                                                    {place.Status ? t(place.Status.toLowerCase()) : "—"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                                                <ToggleBtn place={place} onToggle={handleToggleStatus} />
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

            {viewPlace && (
                <PlaceModal place={viewPlace} onClose={() => setViewPlace(null)} onToggleStatus={handleToggleStatus} />
            )}
            {showCreate && (
                <CreatePlaceModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
            )}
        </div>
    );
}