// AdminNotifications.jsx
import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
import { useLanguage } from "../../../context/LanguageContext";

import {
  getNotificationRequests,
  approveRequest,
  rejectRequest,
  archiveRequest,
  sendAdminNotification,
  getNotificationLogs,
} from "../services/adminnotificationsservice";

// ── helpers ────────────────────────────────────────────────────────────────
const statusStyle = {
  PENDING: {
    background: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fde68a",
  },
  APPROVED: {
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },
  REJECTED: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
};

const badge = (s) => (
  <span
    style={{
      ...statusStyle[s],
      fontSize: "11px",
      fontWeight: 600,
      padding: "2px 10px",
      borderRadius: "999px",
      display: "inline-block",
    }}
  >
    {s}
  </span>
);

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString("en-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const EMPTY_FORM = {
  title: "",
  message: "",
  target_type: "ALL_USERS",
  target_user_id: "",
};

const TARGET_OPTIONS = [
  { value: "ALL_USERS", label: "🌍 All Users" },
  { value: "SPECIFIC_USER", label: "👤 Specific User" },
];

// ══════════════════════════════════════════════════════════════════════════
export default function AdminNotifications() {
  const { t } = useLanguage();

  const TABS = [
    t("requests_tab"),
    t("send_notification"),
    t("logs"),
  ];

  const { refetchRequests } = useOutletContext() ?? {};
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(t("requests_tab"));
  const [actioning, setActioning] = useState(null);
  const [filter, setFilter] = useState("ALL");

  const [reqPageSize, setReqPageSize] = useState(10);
  const [logsPageSize, setLogsPageSize] = useState(10);

  const [form, setForm] = useState(EMPTY_FORM);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  // ── Requests ────────────────────────────────────────────────
  const { data: requests = [], isLoading: loading } = useQuery({
    queryKey: ["admin-notification-requests"],
    queryFn: async () => {
      const data = await getNotificationRequests();

      return Array.isArray(data)
        ? data
        : data?.items ?? data?.requests ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // ── Logs ────────────────────────────────────────────────────
  const { data: rawLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["admin-notification-logs"],
    queryFn: async () => {
      const data = await getNotificationLogs();

      const arr = Array.isArray(data)
        ? data
        : data?.items ?? [];

      const grouped = {};

      arr.forEach((log) => {
        const key = `${log.title}__${log.message}__${log.created_at}`;

        if (!grouped[key]) {
          grouped[key] = {
            ...log,
            recipients: 1,
          };
        } else {
          grouped[key].recipients += 1;
        }
      });

      return Object.values(grouped);
    },
    enabled: tab === t("logs"),
    staleTime: 1000 * 60 * 5,
  });

  const logs = rawLogs;

  // ── actions ─────────────────────────────────────────────────
  const handleAction = async (id, action) => {
    setActioning(id);

    try {
      if (action === "approve") {
        await approveRequest(id);
      } else if (action === "reject") {
        await rejectRequest(id);
      } else if (action === "archive") {
        await archiveRequest(id);
      }

      queryClient.setQueryData(
        ["admin-notification-requests"],
        (old = []) =>
          old.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status:
                    action === "approve"
                      ? "APPROVED"
                      : action === "reject"
                      ? "REJECTED"
                      : r.status,

                  is_archived:
                    action === "archive"
                      ? true
                      : r.is_archived,
                }
              : r
          )
      );

      refetchRequests?.();
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setActioning(null);
    }
  };

  // ── send notification ──────────────────────────────────────
  const handleSend = async () => {
    if (!form.title.trim()) {
      setSendError("Title is required.");
      return;
    }

    if (!form.message.trim()) {
      setSendError("Message is required.");
      return;
    }

    if (
      form.target_type === "SPECIFIC_USER" &&
      !form.target_user_id
    ) {
      setSendError("Please enter a User ID.");
      return;
    }

    setSending(true);
    setSendError("");
    setSendSuccess(false);

    try {
      await sendAdminNotification(form);

      setSendSuccess(true);
      setForm(EMPTY_FORM);

      setTimeout(() => {
        setSendSuccess(false);
      }, 3000);

      queryClient.invalidateQueries({
        queryKey: ["admin-notification-logs"],
      });
    } catch {
      setSendError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ── filters ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return filter === "ALL"
      ? requests
      : requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const pendingCount = requests.filter(
    (r) => r.status === "PENDING"
  ).length;

  const approvedCount = requests.filter(
    (r) => r.status === "APPROVED"
  ).length;

  const rejectedCount = requests.filter(
    (r) => r.status === "REJECTED"
  ).length;

  const reqPagination = usePagination(filtered, reqPageSize);
  const logsPagination = usePagination(logs, logsPageSize);

  useMemo(() => {
    reqPagination.reset();
  }, [filter]);

  // ── styles ─────────────────────────────────────────────────
  const st = {
    page: { padding: "0" },

    header: {
      marginBottom: "24px",
    },

    title: {
      fontSize: "22px",
      fontWeight: 700,
      color: "#0f172a",
      margin: 0,
    },

    sub: {
      fontSize: "13px",
      color: "#94a3b8",
      marginTop: "4px",
    },

    tabs: {
      display: "flex",
      gap: "4px",
      marginBottom: "24px",
      borderBottom: "1px solid #e4e2dd",
    },

    tab: (active) => ({
      padding: "8px 18px",
      fontSize: "13px",
      fontWeight: active ? 600 : 400,
      color: active ? "#2563eb" : "#64748b",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      borderBottom: active
        ? "2px solid #2563eb"
        : "2px solid transparent",
    }),

    filters: {
      display: "flex",
      gap: "8px",
      marginBottom: "16px",
      flexWrap: "wrap",
    },

    filterBtn: (active) => ({
      padding: "5px 14px",
      fontSize: "12px",
      fontWeight: active ? 600 : 400,
      borderRadius: "999px",
      border: "1px solid",
      borderColor: active ? "#2563eb" : "#e4e2dd",
      background: active ? "#eff6ff" : "#fff",
      color: active ? "#2563eb" : "#64748b",
      cursor: "pointer",
    }),

    card: {
      background: "#fff",
      border: "1px solid #e4e2dd",
      borderRadius: "12px",
      padding: "16px 20px",
      marginBottom: "10px",
    },

    cardTop: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
    },

    cardTitle: {
      fontSize: "14px",
      fontWeight: 600,
      color: "#0f172a",
    },

    cardMsg: {
      fontSize: "13px",
      color: "#475569",
      marginTop: "4px",
    },

    cardMeta: {
      fontSize: "11px",
      color: "#94a3b8",
      marginTop: "6px",
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
    },

    actions: {
      display: "flex",
      gap: "6px",
      alignItems: "center",
    },

    btn: (color, disabled) => ({
      padding: "5px 14px",
      borderRadius: "8px",
      border: "none",
      background: disabled ? "#94a3b8" : color,
      color: "#fff",
      fontSize: "12px",
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
    }),

    loading: {
      padding: "32px",
      textAlign: "center",
      color: "#94a3b8",
    },

    empty: {
      textAlign: "center",
      padding: "48px 16px",
      color: "#94a3b8",
    },

    emptyIcon: {
      fontSize: "32px",
      marginBottom: "8px",
    },
  };

  return (
    <div style={st.page}>
      {/* Header */}
      <div style={st.header}>
        <h1 style={st.title}>
          🔔 {t("notifications")}
        </h1>

        <p style={st.sub}>
          Manage owner requests and send notifications
        </p>
      </div>

      {/* Tabs */}
      <div style={st.tabs}>
        {TABS.map((item) => (
          <button
            key={item}
            style={st.tab(tab === item)}
            onClick={() => setTab(item)}
          >
            {item}

            {item === t("requests_tab") &&
              pendingCount > 0 && (
                <span
                  style={{
                    marginLeft: "6px",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "999px",
                  }}
                >
                  {pendingCount}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* Requests */}
      {tab === t("requests_tab") && (
        <>
          <div style={st.filters}>
            {[
              {
                key: "ALL",
                label: `All (${requests.length})`,
              },
              {
                key: "PENDING",
                label: `Pending (${pendingCount})`,
              },
              {
                key: "APPROVED",
                label: `Approved (${approvedCount})`,
              },
              {
                key: "REJECTED",
                label: `Rejected (${rejectedCount})`,
              },
            ].map(({ key, label }) => (
              <button
                key={key}
                style={st.filterBtn(filter === key)}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={st.loading}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={st.empty}>
              <div style={st.emptyIcon}>📭</div>
              <p>{t("no_requests")}</p>
            </div>
          ) : (
            <>
              {reqPagination.paginated.map((req) => {
                const busy = actioning === req.id;

                return (
                  <div
                    key={req.id}
                    style={st.card}
                  >
                    <div style={st.cardTop}>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={st.cardTitle}>
                            {req.title}
                          </span>

                          {badge(req.status)}
                        </div>

                        <p style={st.cardMsg}>
                          {req.message}
                        </p>

                        <div style={st.cardMeta}>
                          <span>
                            👤{" "}
                            {req.sender_name ??
                              `Owner #${req.sender_id}`}
                          </span>

                          <span>
                            🕐 {fmt(req.created_at)}
                          </span>
                        </div>
                      </div>

                      {!req.is_archived && (
                        <div style={st.actions}>
                          {req.status === "PENDING" ? (
                            <>
                              <button
                                style={st.btn(
                                  "#22c55e",
                                  busy
                                )}
                                disabled={busy}
                                onClick={() =>
                                  handleAction(
                                    req.id,
                                    "approve"
                                  )
                                }
                              >
                                {t("approve")}
                              </button>

                              <button
                                style={st.btn(
                                  "#ef4444",
                                  busy
                                )}
                                disabled={busy}
                                onClick={() =>
                                  handleAction(
                                    req.id,
                                    "reject"
                                  )
                                }
                              >
                                {t("reject")}
                              </button>
                            </>
                          ) : (
                            <button
                              style={st.btn(
                                "#64748b",
                                busy
                              )}
                              disabled={busy}
                              onClick={() =>
                                handleAction(
                                  req.id,
                                  "archive"
                                )
                              }
                            >
                              {t("archive")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <Pagination
                {...reqPagination}
                pageSize={reqPageSize}
                onPageSize={(s) => {
                  setReqPageSize(s);
                  reqPagination.reset();
                }}
                onNext={reqPagination.next}
                onPrev={reqPagination.prev}
                onGoTo={reqPagination.goTo}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}