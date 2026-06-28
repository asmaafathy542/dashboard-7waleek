// Orders.jsx
import { useState, useMemo, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../../context/LanguageContext";
import {
  getOrdersByBranch,
  updateOrderStatus,
} from "../services/ordersService";
import * as XLSX from "xlsx";
import { usePagination } from "../../../hooks/usePagination";
import Pagination from "../../../shared/components/ui/Pagination";
import { PageThemeToggle } from "../../../shared/components/ui/ThemeToggle";
import "./orders.css";

const STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
];

// الـ flow الجديد — كل status ممكن يروح فين
const getAllowedTransitions = (order) => {
  const type = order?.order_type; // "TAKE_AWAY" or "CASH_ON_DELIVERY" etc.
  
  return {
    PENDING:          ["CONFIRMED", "CANCELLED"],
    CONFIRMED:        ["PREPARING", "CANCELLED"],
    PREPARING:        type === "TAKE_AWAY"
                        ? ["READY_FOR_PICKUP", "CANCELLED"]
                        : ["OUT_FOR_DELIVERY", "CANCELLED"],
    READY_FOR_PICKUP: ["COMPLETED"],
    OUT_FOR_DELIVERY: ["COMPLETED"],
    COMPLETED:        [],
    CANCELLED:        [],
  };
};

const statusClass = {
  PENDING:           "status-pending",
  CONFIRMED:         "status-confirmed",
  PREPARING:         "status-preparing",
  READY_FOR_PICKUP:  "status-ready",
  OUT_FOR_DELIVERY:  "status-delivery",
  COMPLETED:         "status-completed",
  CANCELLED:         "status-cancelled",
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

export default function Orders() {
  const { selectedPlaceId, placeName } = useOutletContext() ?? {};
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const statusLabel = {
    PENDING:           t("or_status_pending"),
    CONFIRMED:         t("or_status_confirmed"),
    PREPARING:         t("or_status_preparing"),
    READY_FOR_PICKUP:  t("or_status_ready_for_pickup"),
    OUT_FOR_DELIVERY:  t("or_status_out_for_delivery"),
    COMPLETED:         t("or_status_completed"),
    CANCELLED:         t("or_status_cancelled"),
  };

  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const knownIdsRef = useRef(null);

  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ["orders", selectedPlaceId],
    queryFn: async () => {
      const data = await getOrdersByBranch(selectedPlaceId);
      const arr = Array.isArray(data) ? data : [data];

      if (knownIdsRef.current !== null) {
        const newOrders = arr.filter((o) => !knownIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          playBeep();
          setNewOrderAlert(`${newOrders.length} ${t("or_new_orders_alert")}`);
          setTimeout(() => setNewOrderAlert(null), 5000);
        }
      }
      knownIdsRef.current = new Set(arr.map((o) => o.id));
      return arr;
    },
    enabled: !!selectedPlaceId,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 30000,
  });

  const handleRowClick = (order) => setSelected(order);

  const handleStatusChange = async (orderId, newStatus) => {
    const prevStatus = orders.find((o) => o.id === orderId)?.status;

    queryClient.setQueryData(["orders", selectedPlaceId], (prev) =>
      (prev ?? []).map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selected?.id === orderId) setSelected((prev) => ({ ...prev, status: newStatus }));

    try {
      const updatedOrder = await updateOrderStatus(orderId, newStatus);
      queryClient.setQueryData(["orders", selectedPlaceId], (prev) =>
        (prev ?? []).map((o) => (o.id === orderId ? updatedOrder : o))
      );
      if (selected?.id === orderId) setSelected(updatedOrder);
    } catch (err) {
      queryClient.setQueryData(["orders", selectedPlaceId], (prev) =>
        (prev ?? []).map((o) => (o.id === orderId ? { ...o, status: prevStatus } : o))
      );
      if (selected?.id === orderId) setSelected((prev) => ({ ...prev, status: prevStatus }));
      alert(err?.response?.data?.error?.message || t("or_status_change_failed"));
    }
  };

  

  const copyUserId = (userId) => {
    navigator.clipboard.writeText(String(userId)).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const exportExcel = () => {
    const orderTypeLabel = (type) => {
      if (!type) return "";
      const map = { CASH_ON_DELIVERY: "Cash on Delivery", TAKE_AWAY: "Take Away", DELIVERY: "Delivery" };
      return map[type] || type.replace(/_/g, " ");
    };

    const headers = [
      "#", t("or_col_user_id"), t("or_col_customer"), t("or_col_phone"),
      t("or_col_address"), t("or_col_type"), t("or_col_total"),
      t("or_col_date"), t("or_col_status"),
    ];

    const rows = filtered.map((o) => [
      o.id, o.user_id ?? "", o.full_name ?? "", o.phone_number ?? "",
      o.address ?? "", orderTypeLabel(o.order_type), o.total_price,
      new Date(o.created_at).toLocaleDateString(),
      statusLabel[o.status] || o.status,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    ws["!cols"] = [
      { wch: 6 }, { wch: 10 }, { wch: 20 }, { wch: 16 },
      { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
    ];

    // Header style
    headers.forEach((_, ci) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: ci })];
      if (!cell) return;
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "2148B0" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });

    // Status colors
    const statusColors = {
      PENDING:          { bg: "FEF3C7", fg: "92400E" },
      CONFIRMED:        { bg: "DBEAFE", fg: "1E40AF" },
      PREPARING:        { bg: "EDE9FE", fg: "5B21B6" },
      READY_FOR_PICKUP: { bg: "D1FAE5", fg: "065F46" },
      OUT_FOR_DELIVERY: { bg: "E0F2FE", fg: "0369A1" },
      COMPLETED:        { bg: "DCFCE7", fg: "15803D" },
      CANCELLED:        { bg: "FEE2E2", fg: "B91C1C" },
    };
    filtered.forEach((o, ri) => {
      const colors = statusColors[o.status];
      if (!colors) return;
      const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: 8 })];
      if (!cell) return;
      cell.s = { font: { bold: true, color: { rgb: colors.fg } }, fill: { fgColor: { rgb: colors.bg } }, alignment: { horizontal: "center" } };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders-${placeName || "branch"}.xlsx`, { cellStyles: true });
  };

  const exportCSV = () => {
    const headers = [
      "#", t("or_col_user_id"), t("or_col_customer"), t("or_col_phone"),
      t("or_col_address"), t("or_col_type"), t("or_col_total"),
      t("or_col_date"), t("or_col_status"),
    ];
    const rows = filtered.map((o) => [
      o.id, o.user_id ?? "", o.full_name, o.phone_number, o.address,
      o.order_type?.replace("_", " "),
      `${o.total_price} ${t("it_egp")}`,
      new Date(o.created_at).toLocaleDateString(),
      statusLabel[o.status] || o.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${placeName || "branch"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + (o.total_price || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  const filtered = orders.filter((o) => filterStatus === "ALL" || o.status === filterStatus);

  const [pageSize, setPageSize] = useState(10);
  const pagination = usePagination(filtered, pageSize);
  const { paginated, reset: resetPage } = pagination;
  useMemo(() => { resetPage(); }, [filterStatus]);

  if (!selectedPlaceId) return <div className="or-loading">{t("loading")}</div>;
  if (loading) return <div className="or-loading">{t("loading")}</div>;

  return (
    <div className="or-page">
      {newOrderAlert && (
        <div className="or-new-alert">
          🔔 {newOrderAlert}
          <button onClick={() => setNewOrderAlert(null)}>✕</button>
        </div>
      )}

      <div className="or-header">
        <div>
          <h1 className="or-title">{t("or_title")} — {placeName}</h1>
          <p className="or-subtitle">{orders.length} {t("or_total_label")}</p>
        </div>
        <div className="or-export-btns">
          <PageThemeToggle />
          <button className="or-export-btn" onClick={exportExcel}>⬇️ Excel</button>
          <button className="or-export-btn or-export-csv" onClick={exportCSV}>⬇️ CSV</button>
        </div>
      </div>

      <div className="or-stats">
        <div className="or-stat-card">
          <span className="or-stat-label">{t("or_stat_total")}</span>
          <span className="or-stat-value">{orders.length}</span>
        </div>
        <div className="or-stat-card">
          <span className="or-stat-label">{t("or_stat_revenue")}</span>
          <span className="or-stat-value">{totalRevenue.toLocaleString()} {t("it_egp")}</span>
        </div>
        <div className="or-stat-card">
          <span className="or-stat-label">{t("or_stat_pending")}</span>
          <span className="or-stat-value or-stat-pending">{pendingCount}</span>
        </div>
      </div>

      <div className="or-filters">
        <div className="or-filter-tabs">
          {["ALL", ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              className={`or-filter-tab ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === "ALL" ? t("or_filter_all") : statusLabel[s]}
              <span className="or-filter-count">
                {s === "ALL" ? orders.length : orders.filter((o) => o.status === s).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="or-empty">{t("or_empty")}</div>
      ) : (
        <div className="or-table-wrap">
          <table className="or-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("or_col_customer")}</th>
                <th>{t("or_col_phone")}</th>
                <th>{t("or_col_address")}</th>
                <th>{t("or_col_type")}</th>
                <th>{t("or_col_total")}</th>
                <th>{t("or_col_date")}</th>
                <th>{t("or_col_status")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order) => (
                <tr key={order.id} className="or-row-clickable" onClick={() => handleRowClick(order)}>
                  <td className="or-id">#{order.id}</td>
                  <td>{order.full_name}</td>
                  <td>{order.phone_number}</td>
                  <td>{order.address}</td>
                  <td className="or-type">{t(`or_type_${order.order_type}`) || order.order_type?.replace(/_/g, " ")}</td>
                  <td className="or-price">{order.total_price} {t("it_egp")}</td>
                  <td className="or-date">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`or-status ${statusClass[order.status]}`}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                     disabled={getAllowedTransitions(order)[order.status]?.length === 0}
                    >
                      <option value={order.status}>{statusLabel[order.status]}</option>
                      {getAllowedTransitions(order)[order.status]?.map((s) => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Order Detail Modal */}
      {selected && (
        <div className="or-modal-overlay" onClick={() => setSelected(null)}>
          <div className="or-modal" onClick={(e) => e.stopPropagation()}>
            <div className="or-modal-header">
              <h2>{t("or_order_hash")}{selected.id}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button className="or-modal-close" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>
            <div className="or-modal-body">
              <div className="or-modal-section">
                <h3>{t("or_customer_info")}</h3>
                <div className="or-modal-row"><span>{t("or_field_name")}</span><span>{selected.full_name}</span></div>
                <div className="or-modal-row"><span>{t("or_col_phone")}</span><span>{selected.phone_number}</span></div>
                <div className="or-modal-row"><span>{t("or_col_address")}</span><span>{selected.address}</span></div>
                {selected.notes && <div className="or-modal-row"><span>{t("or_field_notes")}</span><span>{selected.notes}</span></div>}
                {selected.user_id != null && (
                  <div className="or-modal-row">
                    <span>{t("or_col_user_id")}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ color: "#2563eb" }}>{selected.user_id}</strong>
                      <button
                        onClick={() => copyUserId(selected.user_id)}
                        style={{
                          background: copiedId ? "#10b981" : "#eff6ff",
                          color: copiedId ? "#fff" : "#2563eb",
                          border: "none", borderRadius: "6px", padding: "3px 10px",
                          fontSize: "12px", cursor: "pointer", transition: "all 0.2s",
                        }}
                      >
                        {copiedId ? `✓ ${t("or_copied")}` : t("or_copy")}
                      </button>
                    </span>
                  </div>
                )}
              </div>
              <div className="or-modal-section">
                <h3>{t("or_order_info")}</h3>
                <div className="or-modal-row"><span>{t("or_field_order_id")}</span><span>#{selected.id}</span></div>
                <div className="or-modal-row"><span>{t("or_col_type")}</span><span>{t(`or_type_${selected.order_type}`)}</span></div>
                <div className="or-modal-row"><span>{t("or_col_total")}</span><span className="or-modal-price">{selected.total_price} {t("it_egp")}</span></div>
                <div className="or-modal-row"><span>{t("or_col_date")}</span><span>{new Date(selected.created_at).toLocaleString()}</span></div>
                <div className="or-modal-row">
                  <span>{t("or_col_status")}</span>
                  <select
                    className={`or-status ${statusClass[selected.status]}`}
                    value={selected.status}
                    onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                    disabled={getAllowedTransitions(selected)[selected.status]?.length === 0}
                  >
                    <option value={selected.status}>{statusLabel[selected.status]}</option>
                    {getAllowedTransitions(selected)[selected.status]?.map((s) => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selected.items?.length > 0 ? (
                <div className="or-modal-section">
                  <h3>{t("or_items_section")}</h3>
                  {selected.items.map((item, i) => (
                    <div key={i} className="or-modal-item">
                      <div className="or-modal-row">
                        <span className="or-item-name">{item.item_name}</span>
                        <span className="or-item-qty">x{item.quantity}</span>
                      </div>
                      <div className="or-modal-row">
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                          {item.unit_price} {t("it_egp")} × {item.quantity}
                        </span>
                        <span className="or-modal-price">{item.total_price} {t("it_egp")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="or-modal-section">
                  <h3>{t("or_items_section")}</h3>
                  <div className="or-modal-row"><span style={{ color: "#94a3b8" }}>{t("or_no_items")}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}