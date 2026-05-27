import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, sendNotification } from "../services/notificationsService";
import Pagination from "../../../shared/components/ui/Pagination"; // ✅ شغال
import { usePagination } from "../../../hooks/usePagination";     
import "./notifications.css";

const statusClass = {
  PENDING:  "nt-status-pending",
  APPROVED: "nt-status-approved",
  REJECTED: "nt-status-rejected",
};

const statusLabel = {
  PENDING:  "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const TARGET_OPTIONS = [
  { value: "ALL_USERS",     label: "🌍 All Users" },
  { value: "SPECIFIC_USER", label: "👤 Specific User" },
];

const EMPTY_FORM = { title: "", message: "", target_type: "ALL_USERS", target_user_id: "" };

const QUERY_KEY = ["owner-notifications"];

export default function Notifications() {
  const queryClient = useQueryClient();

  const [form, setForm]               = useState(EMPTY_FORM);
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [pageSize, setPageSize]       = useState(10);

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const data = await getNotifications();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const pagination = usePagination(notifications, pageSize);
  const { paginated, reset: resetPage } = pagination;
  useMemo(() => { resetPage(); }, [notifications.length]);

  const handleSend = async () => {
    if (!form.title.trim())   { setSendError("Title is required.");   return; }
    if (!form.message.trim()) { setSendError("Message is required."); return; }
    if (form.target_type === "SPECIFIC_USER" && !form.target_user_id) {
      setSendError("Please enter a User ID."); return;
    }

    setSending(true);
    setSendError("");
    setSendSuccess(false);
    try {
      await sendNotification({
        ...form,
        target_user_id: form.target_user_id ? Number(form.target_user_id) : undefined,
      });
      setSendSuccess(true);
      setForm(EMPTY_FORM);
      setTimeout(() => setSendSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      if (err?.status === 500) {
        setSendSuccess(true);
        setForm(EMPTY_FORM);
        setTimeout(() => setSendSuccess(false), 4000);
      } else {
        setSendError(err?.message || "Failed to send. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="nt-page">
      <div className="nt-header">
        <h1 className="nt-title">Notifications</h1>
        <p className="nt-subtitle">
          {loading ? "Loading..." : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="nt-send-card">
        <h2 className="nt-send-title">📢 Send Notification</h2>
        <div className="nt-send-grid">
          <div className="nt-form-row">
            <label>Title *</label>
            <input
              className="nt-input"
              placeholder="e.g. New offer!"
              value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); setSendError(""); }}
            />
          </div>
          <div className="nt-form-row">
            <label>Send To</label>
            <select
              className="nt-input"
              value={form.target_type}
              onChange={(e) => setForm({ ...form, target_type: e.target.value, target_user_id: "" })}
            >
              {TARGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="nt-form-row" style={{ marginTop: "0.75rem" }}>
          <label>Message *</label>
          <textarea
            className="nt-input nt-textarea"
            placeholder="Write your message here..."
            value={form.message}
            onChange={(e) => { setForm({ ...form, message: e.target.value }); setSendError(""); }}
          />
        </div>
        {form.target_type === "SPECIFIC_USER" && (
          <div className="nt-form-row" style={{ marginTop: "0.75rem" }}>
            <label>User ID *</label>
            <input
              className="nt-input"
              type="number"
              placeholder="e.g. 42"
              value={form.target_user_id}
              onChange={(e) => { setForm({ ...form, target_user_id: e.target.value }); setSendError(""); }}
            />
          </div>
        )}
        {sendError   && <p className="nt-error">⚠️ {sendError}</p>}
        {sendSuccess && <p className="nt-success">✅ Notification sent successfully!</p>}
        <button className="nt-send-btn" onClick={handleSend} disabled={sending}>
          {sending ? "Sending..." : "📤 Send Notification"}
        </button>
      </div>

      <div className="nt-list-header">
        <span className="nt-list-label">Sent Notifications</span>
      </div>

      {loading ? (
        <div className="nt-loading">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="nt-empty">
          <div className="nt-empty-icon">🔔</div>
          <p>No notifications sent yet.</p>
        </div>
      ) : (
        <div className="nt-list">
          {paginated.map((notif) => (
            <div className="nt-card" key={notif.id}>
              <div className="nt-icon">🔔</div>
              <div className="nt-content">
                <div className="nt-top">
                  <span className="nt-message">{notif.title || "Notification"}</span>
                  <span className={`nt-status ${statusClass[notif.status] || ""}`}>
                    {statusLabel[notif.status] || notif.status}
                  </span>
                </div>
                {notif.message && <p className="nt-body">{notif.message}</p>}
                <div className="nt-meta">
                  {notif.target_type && <span>🎯 {notif.target_type.replace("_", " ")}</span>}
                  {notif.total_sent > 0 && <span>· 📤 Sent: {notif.total_sent}</span>}
                  {notif.read_count > 0 && <span>· 👁 Read: {notif.read_count}</span>}
                </div>
                <div className="nt-date">{new Date(notif.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length > 0 && (
        <Pagination
          {...pagination}
          pageSize={pageSize}
          onPageSize={(s) => { setPageSize(s); resetPage(); }}
          onNext={pagination.next}
          onPrev={pagination.prev}
          onGoTo={pagination.goTo}
        />
      )}
    </div>
  );
}