// Users.jsx
import { useState, useMemo } from "react";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../../../context/LanguageContext";

const BASE = "https://aroundubackend-production.up.railway.app/api";

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${BASE}${path}`, {
        headers: { ...authHeader(), ...options.headers },
        ...options,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
};

const parseUserId = (rawId) => {
    if (!rawId) return null;
    const match = String(rawId).match(/\d+$/);
    return match ? Number(match[0]) : rawId;
};

export default function Users() {
    const [search, setSearch]     = useState("");
    const { t } = useLanguage();
    const [pageSize, setPageSize] = useState(10);

    const { data: users = [], isLoading: loading, isError, refetch: fetchUsers } = useQuery({
        queryKey: ["admin-users"],
        queryFn: async () => {
            const data = await apiFetch("/dashboard/admin/stats/users");
            return Array.isArray(data) ? data : (data?.users ?? data?.items ?? data?.data ?? []);
        },
        staleTime: 1000 * 60 * 5,
    });

    const error = isError ? "Failed to load users. Please try again." : "";

    const handlePromote = async (rawId) => {
        const numericId = parseUserId(rawId);
        if (!window.confirm("Promote this user to Owner?")) return;
        try {
            await apiFetch(`/dashboard/admin/promote/${numericId}`, { method: "POST" });
        } catch {
            alert("Failed to promote user. Please try again.");
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) =>
            (u.Name ?? u.full_name ?? u.name ?? "").toLowerCase().includes(q) ||
            (u.User_ID ?? "").toString().toLowerCase().includes(q) ||
            (u.District ?? "").toLowerCase().includes(q)
        );
    }, [users, search]);

    const pagination = usePagination(filtered, pageSize);
    const { paginated, reset: resetPage } = pagination;

    useMemo(() => { resetPage(); }, [search]);

    return (
        <div style={{ maxWidth: "1200px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
                       {t("users")} 👥
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                        {loading ? "Loading..." : `${users.length} ${t("total_users")}`}
                    </p>
                </div>
                <button
                    onClick={fetchUsers}
                    style={{
                        padding: "8px 16px", borderRadius: "8px", border: "1px solid #e4e2dd",
                        background: "#fff", fontSize: "13px", cursor: "pointer", color: "#475569", fontWeight: 500,
                    }}
                >
                    🔄 {t("refresh")}
                </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ position: "relative", maxWidth: "380px" }}>
                    <span style={{
                        position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                        fontSize: "14px", color: "#94a3b8", pointerEvents: "none",
                    }}>🔍</span>
                    <input
                        type="text"
                        placeholder={t("search_placeholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%", padding: "9px 12px 9px 36px",
                            borderRadius: "8px", border: "1px solid #e4e2dd",
                            fontSize: "13px", color: "#0f172a", outline: "none",
                            fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
                            background: "#fff",
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            style={{
                                position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                                background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px",
                            }}
                        >✕</button>
                    )}
                </div>
                {search && (
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>
                        {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
                    </p>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px",
                    padding: "12px 16px", marginBottom: "1rem", fontSize: "13px", color: "#b91c1c",
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#94a3b8", fontSize: "0.9rem" }}>
                    Loading...
                </div>
            ) : filtered.length === 0 ? (
                <div style={{
                    background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px",
                    padding: "3rem", textAlign: "center", color: "#94a3b8",
                }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>👥</div>
                    <p style={{ fontSize: "14px" }}>{search ? "No users match your search." : "No users found."}</p>
                </div>
            ) : (
                <div style={{ background: "#fff", border: "1px solid #e4e2dd", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e2dd" }}>
                                    {[t("id"), t("name"), t("district"), t("reviews"), t("saves"), t("joined"), t("status")].map((h) => (
                                        <th key={h} style={{
                                            padding: "10px 14px", textAlign: "left",
                                            fontSize: "11px", fontWeight: 600, color: "#64748b",
                                            textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((user, idx) => {
                                    const rawId    = user.User_ID ?? user.id ?? user.user_id;
                                    const name     = user.Name ?? user.full_name ?? user.name ?? "—";
                                    const district = user.District ?? "—";
                                    const reviews  = user.Reviews ?? 0;
                                    const saves    = user.Saves ?? 0;
                                    const joined   = user.Joined ?? user.created_at
                                        ? new Date(user.Joined ?? user.created_at).toLocaleDateString()
                                        : "—";
                                    const status   = user.Status ?? (user.is_active ? "Active" : "Inactive");
                                    const isActive = status === "Active" || status === true;

                                    return (
                                        <tr
                                            key={rawId ?? idx}
                                            style={{ borderBottom: idx < paginated.length - 1 ? "1px solid #f1f0ec" : "none", transition: "background 0.1s" }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                        >
                                            <td style={{ padding: "12px 14px", color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap" }}>
                                                {rawId}
                                            </td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <div style={{
                                                        width: "32px", height: "32px", borderRadius: "50%",
                                                        background: "#1e40af", color: "#fff",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: "13px", fontWeight: 600, flexShrink: 0,
                                                    }}>
                                                        {name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 500, color: "#0f172a" }}>{name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 14px", color: "#475569" }}>{district}</td>
                                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                <span style={{ fontWeight: reviews > 0 ? 600 : 400, color: reviews > 0 ? "#2563eb" : "#94a3b8" }}>
                                                    {reviews}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                <span style={{ fontWeight: saves > 0 ? 600 : 400, color: saves > 0 ? "#7c3aed" : "#94a3b8" }}>
                                                    {saves}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 14px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                                                {joined}
                                            </td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <span style={{
                                                    fontSize: "11px", fontWeight: 600,
                                                    padding: "3px 10px", borderRadius: "999px",
                                                    background: isActive ? "#f0fdf4" : "#fef2f2",
                                                    color: isActive ? "#166534" : "#991b1b",
                                                    border: isActive ? "1px solid #bbf7d0" : "1px solid #fecaca",
                                                }}>
                                                    {isActive ? t("active") : t("inactive")}
                                                </span>
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
        </div>
    );
}