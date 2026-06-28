// Orders.jsx
import { useState, useMemo, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../../context/LanguageContext";
import {
  getOrdersByBranch,
  updateOrderStatus,
} from "../services/ordersService";
import ExcelJS from "exceljs";
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

const getAllowedTransitions = (order) => {
  const type = order?.order_type;
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

const orderTypeLabel = (type) => {
  if (!type) return "";
  const map = { CASH_ON_DELIVERY: "Cash on Delivery", TAKE_AWAY: "Take Away", DELIVERY: "Delivery" };
  return map[type] || type.replace(/_/g, " ");
};

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

  const statusConfig = {
    PENDING:          { emoji: "🟡", bg: "FFFEF3C7", fg: "FF92400E" },
    CONFIRMED:        { emoji: "🔵", bg: "FFDBEAFE", fg: "FF1E40AF" },
    PREPARING:        { emoji: "🟣", bg: "FFEDE9FE", fg: "FF5B21B6" },
    READY_FOR_PICKUP: { emoji: "🟤", bg: "FFD1FAE5", fg: "FF065F46" },
    OUT_FOR_DELIVERY: { emoji: "🚚", bg: "FFE0F2FE", fg: "FF0369A1" },
    COMPLETED:        { emoji: "✅", bg: "FFDCFCE7", fg: "FF15803D" },
    CANCELLED:        { emoji: "🔴", bg: "FFFEE2E2", fg: "FFB91C1C" },
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

  const totalRevenue = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + (o.total_price || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  const filtered = orders.filter((o) => filterStatus === "ALL" || o.status === filterStatus);

  const [pageSize, setPageSize] = useState(10);
  const pagination = usePagination(filtered, pageSize);
  const { paginated, reset: resetPage } = pagination;
  useMemo(() => { resetPage(); }, [filterStatus]);

  // ── Excel Export (ExcelJS) ─────────────────────────────────────────────
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = "7waleek Dashboard";
    const ws = wb.addWorksheet("Orders");

    ws.columns = [
      { header: "#",                  key: "id",      width: 7  },
      { header: t("or_col_user_id"),  key: "uid",     width: 10 },
      { header: t("or_col_customer"), key: "name",    width: 22 },
      { header: t("or_col_phone"),    key: "phone",   width: 18 },
      { header: t("or_col_address"),  key: "address", width: 32 },
      { header: t("or_col_type"),     key: "type",    width: 20 },
      { header: t("or_col_total"),    key: "total",   width: 14 },
      { header: t("or_col_date"),     key: "date",    width: 14 },
      { header: t("or_col_status"),   key: "status",  width: 20 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2148B0" } };
      cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    filtered.forEach((o, i) => {
      const cfg = statusConfig[o.status];
      const row = ws.addRow({
        id:      o.id,
        uid:     o.user_id ?? "",
        name:    o.full_name ?? "",
        phone:   String(o.phone_number ?? ""),
        address: o.address ?? "",
        type:    orderTypeLabel(o.order_type),
        total:   o.total_price,
        date:    new Date(o.created_at).toLocaleDateString("en-GB"),
        status:  cfg ? `${cfg.emoji} ${statusLabel[o.status] || o.status}` : (statusLabel[o.status] || o.status),
      });
      row.height = 22;

      const rowBg = i % 2 === 0 ? "FFF8FAFF" : "FFFFFFFF";
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.alignment = { vertical: "middle" };
        if (col !== 9) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        }
      });

      const phoneCell = row.getCell(4);
      phoneCell.numFmt = "@";

      const totalCell = row.getCell(7);
      totalCell.numFmt = '#,##0 "EGP"';
      totalCell.alignment = { horizontal: "right", vertical: "middle" };

      if (cfg) {
        const statusCell = row.getCell(9);
        statusCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: cfg.bg } };
        statusCell.font      = { bold: true, color: { argb: cfg.fg } };
        statusCell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top:    { style: "hair", color: { argb: "FFD5DEF0" } },
          bottom: { style: "hair", color: { argb: "FFD5DEF0" } },
          left:   { style: "hair", color: { argb: "FFD5DEF0" } },
          right:  { style: "hair", color: { argb: "FFD5DEF0" } },
        };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = `orders-${placeName || "branch"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        </div>
      </div>

      <div className="or-stats">
        <div className="or-stat-card">
          <div style={{ fontSize: "1.2rem" }}>📦</div>
          <span className="or-stat-value">{orders.length}</span>
          <span className="or-stat-label">{t("or_stat_total")}</span>
        </div>
        <div className="or-stat-card">
          <div style={{ fontSize: "1.2rem" }}>💰</div>
          <span className="or-stat-value">{totalRevenue.toLocaleString()} {t("it_egp")}</span>
          <span className="or-stat-label">{t("or_stat_revenue")}</span>
        </div>
        <div className="or-stat-card">
          <div style={{ fontSize: "1.2rem" }}>⏳</div>
          <span className="or-stat-value or-stat-pending">{pendingCount}</span>
          <span className="or-stat-label">{t("or_stat_pending")}</span>
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
                  <td className="or-type">{t(`or_type_${order.order_type}`) || orderTypeLabel(order.order_type)}</td>
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