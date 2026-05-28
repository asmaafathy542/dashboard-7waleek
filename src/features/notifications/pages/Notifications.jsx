import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, sendNotification } from "../services/notificationsService";
import Pagination from "../../../shared/components/ui/Pagination";
import { usePagination } from "../../../hooks/usePagination";
import { useLanguage } from "../../../context/LanguageContext";
import "./notifications.css";

const statusClass = {
  PENDING:  "nt-status-pending",
  APPROVED: "nt-status-approved",
  REJECTED: "nt-status-rejected",
};

const EMPTY_FORM = { title: "", message: "", target_type: "ALL_USERS", target_user_id: "" };
const QUERY_KEY = ["owner-notifications"];

export default function Notifications() {
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [form, setForm]               = useState(EMPTY_FORM);
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [pageSize, setPageSize]       = useState(10);

  const TARGET_OPTIONS = [
    { value: "ALL_USERS",     label: ar ? "🌍 كل المستخدمين" : "🌍 All Users" },
    { value: "SPECIFIC_USER", label: ar ? "👤 مستخدم محدد"   : "👤 Specific User" },
  ];

  const statusLabel = {
    PENDING:  ar ? "معلق"      : "Pending",
    APPROVED: ar ? "موافق عليه" : "Approved",
    REJECTED: ar ? "مرفوض"     : "Rejected",
  };

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
    if (!form.title.trim())   { setSendError(ar ? "العنوان مطلوب."  : "Title is required.");   return; }
    if (!form.message.trim()) { setSendError(ar ? "الرسالة مطلوبة." : "Message is required."); return; }
    if (form.target_type === "SPECIFIC_USER" && !form.target_user_id) {
      setSendError(ar ? "من فضلك ادخل ID المستخدم." : "Please enter a User ID."); return;
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
        setSendError(ar ? "فشل الإرسال. حاول مرة أخرى." : "Failed to send. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="nt-page">
      <div className="nt-header">
        <h1 className="nt-title">{ar ? "الإشعارات" : "Notifications"}</h1>
        <p className="nt-subtitle">
          {loading
            ? (ar ? "جاري التحميل..." : "Loading...")
            : ar
              ? `${notifications.length} إشعار`
              : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`
          }
        </p>
      </div>

      <div className="nt-send-card">
        <h2 className="nt-send-title">📢 {ar ? "إرسال إشعار" : "Send Notification"}</h2>
        <div className="nt-send-grid">
          <div className="nt-form-row">
            <label>{ar ? "العنوان *" : "Title *"}</label>
            <input
              className="nt-input"
              placeholder={ar ? "مثال: عرض جديد!" : "e.g. New offer!"}
              value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); setSendError(""); }}
            />
          </div>
          <div className="nt-form-row">
            <label>{ar ? "إرسال إلى" : "Send To"}</label>
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
          <label>{ar ? "الرسالة *" : "Message *"}</label>
          <textarea
            className="nt-input nt-textarea"
            placeholder={ar ? "اكتب رسالتك هنا..." : "Write your message here..."}
            value={form.message}
            onChange={(e) => { setForm({ ...form, message: e.target.value }); setSendError(""); }}
          />
        </div>
        {form.target_type === "SPECIFIC_USER" && (
          <div className="nt-form-row" style={{ marginTop: "0.75rem" }}>
            <label>{ar ? "ID المستخدم *" : "User ID *"}</label>
            <input
              className="nt-input"
              type="number"
              placeholder={ar ? "مثال: 42" : "e.g. 42"}
              value={form.target_user_id}
              onChange={(e) => { setForm({ ...form, target_user_id: e.target.value }); setSendError(""); }}
            />
          </div>
        )}
        {sendError   && <p className="nt-error">⚠️ {sendError}</p>}
        {sendSuccess && <p className="nt-success">✅ {ar ? "تم إرسال الإشعار بنجاح!" : "Notification sent successfully!"}</p>}
        <button className="nt-send-btn" onClick={handleSend} disabled={sending}>
          {sending
            ? (ar ? "جاري الإرسال..." : "Sending...")
            : `📤 ${ar ? "إرسال إشعار" : "Send Notification"}`
          }
        </button>
      </div>

      <div className="nt-list-header">
        <span className="nt-list-label">{ar ? "الإشعارات المُرسَلة" : "Sent Notifications"}</span>
      </div>

      {loading ? (
        <div className="nt-loading">{ar ? "جاري التحميل..." : "Loading..."}</div>
      ) : notifications.length === 0 ? (
        <div className="nt-empty">
          <div className="nt-empty-icon">🔔</div>
          <p>{ar ? "لم يتم إرسال أي إشعارات بعد." : "No notifications sent yet."}</p>
        </div>
      ) : (
        <div className="nt-list">
          {paginated.map((notif) => (
            <div className="nt-card" key={notif.id}>
              <div className="nt-icon">🔔</div>
              <div className="nt-content">
                <div className="nt-top">
                  <span className="nt-message">{notif.title || (ar ? "إشعار" : "Notification")}</span>
                  <span className={`nt-status ${statusClass[notif.status] || ""}`}>
                    {statusLabel[notif.status] || notif.status}
                  </span>
                </div>
                {notif.message && <p className="nt-body">{notif.message}</p>}
                <div className="nt-meta">
                  {notif.target_type && <span>🎯 {notif.target_type.replace("_", " ")}</span>}
                  {notif.total_sent > 0 && <span>· 📤 {ar ? "أُرسل:" : "Sent:"} {notif.total_sent}</span>}
                  {notif.read_count > 0 && <span>· 👁 {ar ? "قُرئ:" : "Read:"} {notif.read_count}</span>}
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