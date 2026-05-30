// AdminNotifications.jsx
import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
import { useLanguage } from "../../../context/LanguageContext";

import {
  getNotificationRequests,
  archiveRequest,
  sendAdminNotification,
  getNotificationLogs,
} from "../services/adminnotificationsservice";

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-EG", { dateStyle: "medium", timeStyle: "short" }) : "—";

const EMPTY_FORM = { title: "", message: "", target_type: "ALL_USERS", target_user_id: "" };

export default function AdminNotifications() {
  const { t } = useLanguage();
  const { refetchRequests } = useOutletContext() ?? {};
  const queryClient = useQueryClient();

  const TABS = [
    { key: "history", label: t("logs") },
    { key: "send",    label: t("send_notification") },
  ];

  const [tab, setTab]             = useState("history");
  const [actioning, setActioning] = useState(null);
  const [reqPageSize, setReqPageSize]   = useState(10);
  const [logsPageSize, setLogsPageSize] = useState(10);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  // ── Owner Requests (history tab) ────────────────────────────
  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ["admin-notification-requests"],
    queryFn: async () => {
      const data = await getNotificationRequests();
      return Array.isArray(data) ? data : data?.items ?? data?.requests ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // ── Logs ────────────────────────────────────────────────────
  const { data: rawLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["admin-notification-logs"],
    queryFn: async () => {
      const data = await getNotificationLogs();
      const arr = Array.isArray(data) ? data : data?.items ?? [];
      const grouped = {};
      arr.forEach((log) => {
        const key = `${log.title}__${log.message}__${log.created_at}`;
        if (!grouped[key]) grouped[key] = { ...log, recipients: 1 };
        else grouped[key].recipients += 1;
      });
      return Object.values(grouped).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    enabled: tab === "history",
    staleTime: 1000 * 60 * 5,
  });

  // ── Archive ─────────────────────────────────────────────────
  const handleArchive = async (id) => {
    setActioning(id);
    try {
      await archiveRequest(id);
      queryClient.setQueryData(["admin-notification-requests"], (old = []) =>
        old.map((r) => r.id === id ? { ...r, is_archived: true } : r)
      );
      refetchRequests?.();
    } catch (err) {
      console.error("Archive failed", err);
    } finally {
      setActioning(null);
    }
  };

  // ── Send ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!form.title.trim())   { setSendError(t("title_required"));   return; }
    if (!form.message.trim()) { setSendError(t("message_required")); return; }
    if (form.target_type === "SPECIFIC_USER" && !form.target_user_id) {
      setSendError(t("notif_user_id_required")); return;
    }
    setSending(true); setSendError(""); setSendSuccess(false);
    try {
      await sendAdminNotification(form);
      setSendSuccess(true);
      setForm(EMPTY_FORM);
      setTimeout(() => setSendSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["admin-notification-logs"] });
    } catch {
      setSendError(t("send_failed"));
    } finally {
      setSending(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────
  const totalDelivered = requests.reduce((s, r) => s + (r.total_sent ?? 0), 0);
  const totalRead      = requests.reduce((s, r) => s + (r.read_count ?? 0), 0);

  const reqPagination  = usePagination(requests.filter(r => !r.is_archived), reqPageSize);
  const logsPagination = usePagination(rawLogs, logsPageSize);

  // ── Styles ───────────────────────────────────────────────────
  const st = {
    page:    { padding: "0" },
    header:  { marginBottom: "24px" },
    title:   { fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: 0 },
    sub:     { fontSize: "13px", color: "#94a3b8", marginTop: "4px" },
    statsRow: {
      display: "grid", gridTemplateColumns: "repeat(3,1fr)",
      gap: "12px", marginBottom: "24px",
    },
    statCard: {
      display: "flex", alignItems: "center", gap: "12px",
      background: "#fff", border: "1px solid #e4e2dd",
      borderRadius: "12px", padding: "14px 16px",
    },
    statIcon:  { fontSize: "1.4rem", flexShrink: 0 },
    statVal:   { fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 },
    statLabel: { fontSize: "11px", color: "#94a3b8", marginTop: "3px" },
    tabs: {
      display: "flex", gap: "4px",
      marginBottom: "24px", borderBottom: "1px solid #e4e2dd",
    },
    tab: (active) => ({
      padding: "8px 20px", fontSize: "13px",
      fontWeight: active ? 600 : 400,
      color: active ? "#2563eb" : "#64748b",
      background: "transparent", border: "none", cursor: "pointer",
      borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
      transition: "all 0.15s",
    }),
    card: {
      background: "#fff", border: "1px solid #e4e2dd",
      borderRadius: "12px", padding: "16px 20px", marginBottom: "10px",
    },
    cardTop: {
      display: "flex", alignItems: "flex-start",
      justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
    },
    cardTitle: { fontSize: "14px", fontWeight: 600, color: "#0f172a" },
    cardMsg:   { fontSize: "13px", color: "#475569", marginTop: "4px", lineHeight: 1.55 },
    cardMeta:  { fontSize: "11px", color: "#94a3b8", marginTop: "8px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" },
    metric: {
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontSize: "11px", color: "#64748b",
      background: "#f8fafc", border: "1px solid #e4e2dd",
      borderRadius: "6px", padding: "2px 8px",
    },
    metricStrong: { color: "#0f172a", fontWeight: 600 },
    targetBadge: {
      fontSize: "11px", fontWeight: 500,
      padding: "2px 10px", borderRadius: "999px",
      background: "#f1f5f9", color: "#475569",
      whiteSpace: "nowrap",
    },
    archiveBtn: (busy) => ({
      padding: "5px 14px", borderRadius: "8px", border: "none",
      background: busy ? "#94a3b8" : "#f1f5f9",
      color: busy ? "#fff" : "#64748b",
      fontSize: "12px", fontWeight: 600,
      cursor: busy ? "not-allowed" : "pointer",
      transition: "all 0.15s",
    }),
    loading: { padding: "48px", textAlign: "center", color: "#94a3b8" },
    empty:   { textAlign: "center", padding: "64px 16px", color: "#94a3b8" },
    emptyIcon: { fontSize: "2.5rem", marginBottom: "10px" },
  };

  return (
    <div style={st.page}>

      {/* ── Header ── */}
      <div style={st.header}>
        <h1 style={st.title}>🔔 {t("notifications")}</h1>
        <p style={st.sub}>{t("notif_manage_sub")}</p>
      </div>

      {/* ── Stats ── */}
      <div style={st.statsRow}>
        <div style={st.statCard}>
          <span style={st.statIcon}>📢</span>
          <div>
            <div style={st.statVal}>{requests.length}</div>
            <div style={st.statLabel}>{t("total") ?? "Total Sent"}</div>
          </div>
        </div>
        <div style={st.statCard}>
          <span style={st.statIcon}>📤</span>
          <div>
            <div style={st.statVal}>{totalDelivered.toLocaleString()}</div>
            <div style={st.statLabel}>{"Total Delivered"}</div>
          </div>
        </div>
        <div style={st.statCard}>
          <span style={st.statIcon}>👁</span>
          <div>
            <div style={st.statVal}>{totalRead.toLocaleString()}</div>
            <div style={st.statLabel}>{"Total Read"}</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={st.tabs}>
        {TABS.map(({ key, label }) => (
          <button key={key} style={st.tab(tab === key)} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ TAB: History (owner requests) ══ */}
      {tab === "history" && (
        <>
          {reqLoading ? (
            <div style={st.loading}>Loading...</div>
          ) : reqPagination.paginated.length === 0 ? (
            <div style={st.empty}>
              <div style={st.emptyIcon}>📭</div>
              <p>{t("no_requests")}</p>
            </div>
          ) : (
            <>
              {reqPagination.paginated.map((req) => {
                const busy = actioning === req.id;
                const hasSent = req.total_sent > 0;
                const hasRead = req.read_count > 0;
                const readRate = hasSent
                  ? Math.round((req.read_count / req.total_sent) * 100)
                  : null;

                return (
                  <div key={req.id} style={st.card}>
                    <div style={st.cardTop}>
                      <div style={{ flex: 1, minWidth: 0 }}>

                        {/* Title + target */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={st.cardTitle}>{req.title}</span>
                          {req.target_type === "ALL_USERS" ? (
                            <span style={st.targetBadge}>🌍 All Users</span>
                          ) : (
                            <span style={{ ...st.targetBadge, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
                              👤 Specific User
                              {req.target_user_id && (
                                <span style={{ marginLeft: "6px", fontWeight: 700 }}>
                                  · ID: {req.target_user_id}
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Message */}
                        {req.message && <p style={st.cardMsg}>{req.message}</p>}

                        {/* Metrics */}
                        <div style={st.cardMeta}>
                          <span>👤 {req.sender_name ?? `Owner #${req.sender_id}`}</span>
                          <span>🕐 {fmt(req.created_at)}</span>

                          {hasSent && (
                            <span style={st.metric}>
                              📤 {t("send_now") ? "Delivered:" : "Delivered:"}
                              &nbsp;<strong style={st.metricStrong}>{req.total_sent.toLocaleString()}</strong>
                            </span>
                          )}
                          {hasRead && (
                            <span style={st.metric}>
                              👁 Read:&nbsp;<strong style={st.metricStrong}>{req.read_count.toLocaleString()}</strong>
                            </span>
                          )}
                          {readRate !== null && (
                            <span style={{ ...st.metric, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8", fontWeight: 600 }}>
                              📊 {readRate}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Archive */}
                      {!req.is_archived && (
                        <button
                          style={st.archiveBtn(busy)}
                          disabled={busy}
                          onClick={() => handleArchive(req.id)}
                          onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#0f172a"; } }}
                          onMouseLeave={e => { if (!busy) { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; } }}
                        >
                          📦 {t("archive")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <Pagination
                {...reqPagination}
                pageSize={reqPageSize}
                onPageSize={(s) => { setReqPageSize(s); reqPagination.reset(); }}
                onNext={reqPagination.next}
                onPrev={reqPagination.prev}
                onGoTo={reqPagination.goTo}
              />
            </>
          )}
        </>
      )}

      {/* ══ TAB: Send Notification ══ */}
      {tab === "send" && (
        <div style={{ maxWidth: "560px" }}>
          <div style={st.card}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "20px" }}>
              📤 {t("send_notification")}
            </h2>

            {/* Target */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                {t("notif_target")}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "ALL_USERS",     label: t("notif_all_users") },
                  { value: "SPECIFIC_USER", label: t("notif_specific_user") },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm((f) => ({ ...f, target_type: opt.value, target_user_id: "" }))}
                    style={{
                      padding: "7px 16px", borderRadius: "8px", border: "1.5px solid",
                      borderColor: form.target_type === opt.value ? "#2563eb" : "#e2e8f0",
                      background: form.target_type === opt.value ? "#eff6ff" : "#fff",
                      color: form.target_type === opt.value ? "#2563eb" : "#64748b",
                      fontSize: "13px", fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* User ID */}
            {form.target_type === "SPECIFIC_USER" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  {t("notif_user_id")}
                </label>
                <input
                  type="number"
                  placeholder={t("notif_user_id_placeholder")}
                  value={form.target_user_id}
                  onChange={(e) => setForm((f) => ({ ...f, target_user_id: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            {/* Title */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                {t("notif_title_label")}
              </label>
              <input
                type="text"
                placeholder={t("notif_title_placeholder")}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                {t("notif_message_label")}
              </label>
              <textarea
                placeholder={t("notif_message_placeholder")}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={4}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            {sendError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", color: "#991b1b", fontSize: "13px", marginBottom: "12px" }}>
                ⚠️ {sendError}
              </div>
            )}
            {sendSuccess && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", color: "#166534", fontSize: "13px", marginBottom: "12px" }}>
                ✅ {t("sent_success")}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                width: "100%", padding: "11px", borderRadius: "10px", border: "none",
                background: sending ? "#94a3b8" : "#2563eb",
                color: "#fff", fontSize: "14px", fontWeight: 600,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? t("sending") : t("send_now")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}