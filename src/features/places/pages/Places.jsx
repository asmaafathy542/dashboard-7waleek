import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../../context/LanguageContext";
import {
  getPlaceById,
  deletePlaceImage,
  uploadPlaceImage,
  updatePlace,
  getWorkingHours,
  updateWorkingHours,
  updatePlaceStatus,
  deactivateBranch,
  activateBranch,
  getOrderSettings,
  updateOrderSettings,
  getDeliveryPrice,
  updateDeliveryPrice,
} from "../services/placesService";
import "./places.css";

const EMPTY_FORM = { file: null, image_type: "place", caption: "" };

const EMPTY_EDIT = {
  name: "", description: "", address: "", phone: [],
  website: "", whatsapp_number: "", instagram_url: "",
  facebook_url: "", tiktok_url: "", is_active: true,
  latitude: "", longitude: "", location_link: "",
};

const EMPTY_ORDER_SETTINGS = {
  is_accepting_orders: true,
  accepts_delivery: true,
  accepts_takeaway: true,
};

const EMPTY_DELIVERY = {
  delivery_price: 0,
  is_free_delivery: false,
  delivery_zones: [],
};

const DAYS = [
  { key: "saturday",  label: "Saturday"  },
  { key: "sunday",    label: "Sunday"    },
  { key: "monday",    label: "Monday"    },
  { key: "tuesday",   label: "Tuesday"   },
  { key: "wednesday", label: "wednesday" },
  { key: "thursday",  label: "Thursday"  },
  { key: "friday",    label: "Friday"    },
];

const DAY_T_KEYS = {
  saturday:  "bs_day_saturday",
  sunday:    "bs_day_sunday",
  monday:    "bs_day_monday",
  tuesday:   "bs_day_tuesday",
  wednesday: "bs_day_wednesday",
  thursday:  "bs_day_thursday",
  friday:    "bs_day_friday",
};

const TIME_OPTIONS = [
  "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM",
];

const EMPTY_HOURS = DAYS.reduce((acc, d) => {
  acc[d.key] = { open: "9:00 AM", close: "10:00 PM", is24: false };
  return acc;
}, {});

function hoursToString(hours) {
  return DAYS.map(({ key, label }) => {
    const day = hours[key];
    if (day.is24) return `${label}: 12:00 AM - 12:00 AM`;
    return `${label}: ${day.open} - ${day.close}`;
  }).join(" | ");
}

function stringToHours(str) {
  if (!str || typeof str !== "string") return EMPTY_HOURS;
  const result = { ...EMPTY_HOURS };
  DAYS.forEach(({ key, label }) => {
    const match = str.match(new RegExp(`${label}:\\s*([^|]+)`));
    if (match) {
      const val = match[1].trim();
      const parts = val.split("-").map((t) => t.trim());
      const open = parts[0] || "9:00 AM";
      const close = parts[1] || "10:00 PM";
      const is24 = open === "12:00 AM" && close === "12:00 AM";
      result[key] = { open, close, is24 };
    }
  });
  return result;
}
function ConfirmPopup({ message, subMessage, onConfirm, onCancel, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "1rem" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", borderRadius: "14px", width: "100%", maxWidth: "360px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>{danger ? "🙈" : "👁️"}</div>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>{message}</p>
        <p style={{ fontSize: "13px", color: "var(--icon-muted)", marginBottom: "22px" }}>{subMessage}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "var(--text-sub)" }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: danger ? "var(--danger)" : "var(--success)", color: "var(--bg-card)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function Places() {
  const { selectedPlaceId } = useOutletContext() ?? {};
  const queryClient = useQueryClient();
  const { t, isRTL } = useLanguage();

  // ── Local UI state ───────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [workingHours, setWorkingHours] = useState(EMPTY_HOURS);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState(false);
  const [hoursError, setHoursError] = useState("");

  const [lightboxImg, setLightboxImg] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [togglingBranch, setTogglingBranch] = useState(false);
  const [confirmBranch, setConfirmBranch] = useState(false);

  const [orderSettings, setOrderSettings] = useState(EMPTY_ORDER_SETTINGS);
  const [orderSettingsSaving, setOrderSettingsSaving] = useState(false);
  const [orderSettingsSuccess, setOrderSettingsSuccess] = useState(false);
  const [orderSettingsError, setOrderSettingsError] = useState("");

  const [deliverySettings, setDeliverySettings] = useState(EMPTY_DELIVERY);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  const [isOpen, setIsOpen] = useState(true);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── useQuery ─────────────────────────────────────────────────────────────
  const { data: place, isLoading: placeLoading } = useQuery({
    queryKey: ["place", selectedPlaceId],
    queryFn: () => getPlaceById(selectedPlaceId),
    enabled: !!selectedPlaceId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: hoursData } = useQuery({
    queryKey: ["working-hours", selectedPlaceId],
    queryFn: () => getWorkingHours(selectedPlaceId),
    enabled: !!selectedPlaceId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: orderSettingsData, isLoading: orderSettingsLoading } = useQuery({
    queryKey: ["order-settings", selectedPlaceId],
    queryFn: () => getOrderSettings(selectedPlaceId),
    enabled: !!selectedPlaceId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: deliveryData, isLoading: deliveryLoading } = useQuery({
    queryKey: ["delivery-settings", selectedPlaceId],
    queryFn: () => getDeliveryPrice(selectedPlaceId),
    enabled: !!selectedPlaceId,
    staleTime: 1000 * 60 * 5,
  });

  // ── Sync fetched data → local state ──────────────────────────────────────
  useEffect(() => {
    if (place) {
      setIsActive(place.is_active ?? true);
    }
  }, [place]);

  useEffect(() => {
    if (hoursData) {
      const hoursStr = hoursData?.working_hours ?? "";
      setWorkingHours(stringToHours(typeof hoursStr === "string" ? hoursStr : ""));
    }
  }, [hoursData]);

  useEffect(() => {
    if (orderSettingsData && typeof orderSettingsData === "object") {
      setOrderSettings({
        is_accepting_orders: orderSettingsData.is_accepting_orders ?? true,
        accepts_delivery: orderSettingsData.accepts_delivery ?? true,
        accepts_takeaway: orderSettingsData.accepts_takeaway ?? true,
      });
    }
  }, [orderSettingsData]);

  useEffect(() => {
    if (deliveryData && typeof deliveryData === "object") {
      setDeliverySettings({
        delivery_price: deliveryData.delivery_price ?? 0,
        is_free_delivery: deliveryData.is_free_delivery ?? false,
        delivery_zones: Array.isArray(deliveryData.delivery_zones) ? deliveryData.delivery_zones : [],
      });
    }
  }, [deliveryData]);

  // ── Keyboard / cleanup ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setLightboxImg(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // ── invalidate helper ────────────────────────────────────────────────────
  const invalidatePlace = () => {
    queryClient.invalidateQueries({ queryKey: ["place", selectedPlaceId] });
    queryClient.invalidateQueries({ queryKey: ["working-hours", selectedPlaceId] });
    queryClient.invalidateQueries({ queryKey: ["order-settings", selectedPlaceId] });
    queryClient.invalidateQueries({ queryKey: ["delivery-settings", selectedPlaceId] });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDeleteImage = async (imageId) => {
    if (!window.confirm("Delete this image?")) return;
    setDeletingId(imageId);
    try {
      await deletePlaceImage(imageId);
      // optimistic update — remove from cached place
      queryClient.setQueryData(["place", selectedPlaceId], (prev) =>
        prev ? { ...prev, images: prev.images.filter((img) => img.id !== imageId) } : prev
      );
    } catch (err) {
      console.error("Failed to delete image", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setForm((prev) => ({ ...prev, file }));
    setError("");
  };

  const handleUpload = async () => {
    if (!form.file) { setError("Please select an image file."); return; }
    setUploading(true);
    setError("");
    try {
      const newImg = await uploadPlaceImage(place.id, form.file, form.image_type, form.caption);
      // optimistic update
      queryClient.setQueryData(["place", selectedPlaceId], (prev) =>
        prev ? { ...prev, images: [...(prev.images || []), newImg] } : prev
      );
      setShowUpload(false);
      setForm(EMPTY_FORM);
      setPreviewUrl(null);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCloseUpload = () => {
    setShowUpload(false);
    setForm(EMPTY_FORM);
    setPreviewUrl(null);
    setError("");
  };

  const openEdit = () => {
    setEditForm({
      name: place.name || "",
      description: place.description || "",
      address: place.address || "",
      phone: place.phone || [],
      website: place.website || "",
      whatsapp_number: place.whatsapp_number || "",
      instagram_url: place.instagram_url || "",
      facebook_url: place.facebook_url || "",
      tiktok_url: place.tiktok_url || "",
      is_active: place.is_active ?? true,
      latitude: place.latitude ?? "",
      longitude: place.longitude ?? "",
      location_link: place.location_link || "",
    });
    setEditError("");
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setEditError("");
    try {
      const updated = await updatePlace(place.id, {
        ...editForm,
        phone: typeof editForm.phone === "string"
          ? editForm.phone.split(",").map((p) => p.trim()).filter(Boolean)
          : editForm.phone,
        latitude: editForm.latitude !== "" ? parseFloat(editForm.latitude) : undefined,
        longitude: editForm.longitude !== "" ? parseFloat(editForm.longitude) : undefined,
        location_link: editForm.location_link || undefined,
      });
      // update cache directly, no need to refetch
      queryClient.setQueryData(["place", selectedPlaceId], (prev) =>
        prev ? { ...prev, ...updated } : updated
      );
      setShowEdit(false);
    } catch {
      setEditError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    setHoursSaving(true);
    setHoursError("");
    setHoursSuccess(false);
    try {
      await updateWorkingHours(selectedPlaceId, hoursToString(workingHours));
      // invalidate so next visit gets fresh data, but don't force refetch now
      queryClient.invalidateQueries({ queryKey: ["working-hours", selectedPlaceId] });
      setHoursSuccess(true);
      setTimeout(() => setHoursSuccess(false), 3000);
    } catch {
      setHoursError("Failed to update. Try again.");
    } finally {
      setHoursSaving(false);
    }
  };

  const handleSaveOrderSettings = async () => {
    setOrderSettingsSaving(true);
    setOrderSettingsError("");
    setOrderSettingsSuccess(false);
    try {
      await updateOrderSettings(selectedPlaceId, orderSettings);
      queryClient.invalidateQueries({ queryKey: ["order-settings", selectedPlaceId] });
      setOrderSettingsSuccess(true);
      setTimeout(() => setOrderSettingsSuccess(false), 3000);
    } catch (err) {
      console.error("[OrderSettings] save error:", err);
      setOrderSettingsError("Failed to save. Please try again.");
    } finally {
      setOrderSettingsSaving(false);
    }
  };

  const handleSaveDeliverySettings = async () => {
    setDeliverySaving(true);
    setDeliveryError("");
    setDeliverySuccess(false);
    try {
      await updateDeliveryPrice(selectedPlaceId, {
        delivery_price: deliverySettings.is_free_delivery ? 0 : Number(deliverySettings.delivery_price),
        is_free_delivery: deliverySettings.is_free_delivery,
        delivery_zones: deliverySettings.delivery_zones.map((z) => ({
          name: z.name,
          price: Number(z.price),
        })),
      });
      queryClient.invalidateQueries({ queryKey: ["delivery-settings", selectedPlaceId] });
      setDeliverySuccess(true);
      setTimeout(() => setDeliverySuccess(false), 3000);
    } catch (err) {
      console.error("[DeliverySettings] save error:", err);
      setDeliveryError("فشل الحفظ. حاول مرة تانية.");
    } finally {
      setDeliverySaving(false);
    }
  };

  const handleToggleBranch = () => {
    setConfirmBranch(true);
  };
  const handleToggleBranchConfirmed = async () => {
    setConfirmBranch(false);
    setTogglingBranch(true);

    try {
      if (isActive) {
        await deactivateBranch(selectedPlaceId);

        // ✅ خليه مخفي فورًا في الـ UI
        setIsActive(false);

      } else {
        await activateBranch(selectedPlaceId);

        // ✅ خليه ظاهر فورًا في الـ UI
        setIsActive(true);
      }

      queryClient.invalidateQueries({
        queryKey: ["place", selectedPlaceId],
      });

    } catch (err) {
      console.error("Failed to toggle branch visibility", err);
    } finally {
      setTogglingBranch(false);
    }
  };

  const handleToggleOpen = () => {
    setConfirmOpen(true);
  };

  const handleToggleOpenConfirmed = async () => {
    setConfirmOpen(false);
    setTogglingOpen(true);
    try {
      await updatePlaceStatus(!isOpen);
      setIsOpen((prev) => !prev);
    } catch (err) {
      console.error("Failed to toggle place status", err);
    } finally {
      setTogglingOpen(false);
    }
  };

  const updateDay = (dayKey, field, value) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  };

  const toggle24 = (dayKey) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], is24: !prev[dayKey].is24 },
    }));
  };

  const updateZone = (idx, field, value) => {
    setDeliverySettings((prev) => {
      const zones = [...prev.delivery_zones];
      zones[idx] = { ...zones[idx], [field]: value };
      return { ...prev, delivery_zones: zones };
    });
  };

  const addZone = () => setDeliverySettings((prev) => ({ ...prev, delivery_zones: [...prev.delivery_zones, { name: "", price: 0 }] }));
  const removeZone = (idx) => setDeliverySettings((prev) => ({ ...prev, delivery_zones: prev.delivery_zones.filter((_, i) => i !== idx) }));

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!selectedPlaceId) return <div className="pl-loading">{t("loading")}</div>;
  if (placeLoading) return <div className="pl-loading">{t("loading")}</div>;
  if (!place) return <div className="pl-loading">{t("bs_no_place")}</div>;

  const placeImages = place.images?.filter((img) => img.image_type === "place") || [];
  const menuImages = place.images?.filter((img) => img.image_type === "menu") || [];

  // ── Shared toggle style helper ────────────────────────────────────────────
  const Toggle = ({ on, onClick, disabled }) => (
    <div
      onClick={() => !disabled && onClick()}
      style={{
        width: "46px", height: "26px", borderRadius: "13px",
        background: on ? "var(--success)" : "var(--danger)",
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s", flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%", background: "var(--bg-card)",
        position: "absolute", top: "4px",
        left: on ? "24px" : "4px",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="pl-page">

      {/* ── Header ── */}
      <div className="pl-header">
        <div>
          <h1 className="pl-title">{place.name}</h1>
          <span className={`pl-badge ${place.is_active ? "active" : "inactive"}`}>
            {place.is_active ? t("active") : t("inactive")}
          </span>
        </div>
        <div className="pl-header-right">
          <div className="pl-meta">⭐ {place.rating} &nbsp;·&nbsp; {place.review_count} reviews</div>
          <button className="pl-edit-btn" onClick={openEdit}>✏️ {t("bs_edit_info")}</button>
          <button
            onClick={handleToggleBranch}
            disabled={togglingBranch}
            style={{
              padding: "8px 16px", borderRadius: "10px", border: "none",
              background: togglingBranch ? "var(--icon-muted)" : isActive ? "var(--danger)" : "var(--success)",
              color: "var(--bg-card)", fontWeight: 600, fontSize: "13px",
              cursor: togglingBranch ? "not-allowed" : "pointer",
              opacity: togglingBranch ? 0.7 : 1, transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >
            {togglingBranch ? t("bs_changing") : isActive ? t("bs_hide_branch") : t("bs_show_branch")}
          </button>
        </div>
      </div>

      {/* ── Hidden branch banner ── */}
      {!isActive && (
        <div style={{
          background: "var(--danger-bg)", border: "1.5px solid #fca5a5", borderRadius: "12px",
          padding: "12px 16px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "10px",
          fontSize: "14px", color: "var(--danger)", fontWeight: 500,
        }}>
          {t("bs_branch_hidden_notice")}
          <button
            onClick={handleToggleBranch}
            disabled={togglingBranch}
            style={{
              marginLeft: "auto", padding: "6px 14px", borderRadius: "8px",
              border: "none", background: "var(--success)", color: "var(--bg-card)",
              fontWeight: 600, fontSize: "13px",
              cursor: togglingBranch ? "not-allowed" : "pointer",
            }}
          >
            {togglingBranch ? t("bs_changing") : t("bs_show_branch")}
          </button>
        </div>
      )}

      {/* ── Info + Social grid ── */}
      <div className="pl-grid">

        {/* Place Info */}
        <div className="pl-card">
          <h2 className="pl-card-title">{t("bs_place_info")}</h2>
          <div className="pl-info-row">
            <span className="pl-info-label">{t("bs_description")}</span>
            <span className="pl-info-value">{place.description || "—"}</span>
          </div>
          <div className="pl-info-row">
            <span className="pl-info-label">{t("bs_address")}</span>
            <span className="pl-info-value">{place.address || "—"}</span>
          </div>
          <div className="pl-info-row">
            <span className="pl-info-label">{t("bs_phone")}</span>
            <span className="pl-info-value">{place.phone?.join(" · ") || "—"}</span>
          </div>
          <div className="pl-info-row">
            <span className="pl-info-label">{t("bs_website")}</span>
            <span className="pl-info-value">{place.website || "—"}</span>
          </div>
          <div className="pl-info-row">
            <span className="pl-info-label">WhatsApp</span>
            <span className="pl-info-value">{place.whatsapp_number || "—"}</span>
          </div>
          <div className="pl-info-row" style={{ marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f0ec" }}>
            <span className="pl-info-label">📍 {t("bs_location")}</span>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "4px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--icon-muted)", fontWeight: 500 }}>LATITUDE</span>
                <span className="pl-info-value">{place.latitude != null ? place.latitude : "—"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--icon-muted)", fontWeight: 500 }}>LONGITUDE</span>
                <span className="pl-info-value">{place.longitude != null ? place.longitude : "—"}</span>
              </div>
            </div>
            {place.location_link && (
              <a
                href={place.location_link} target="_blank" rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  marginTop: "6px", fontSize: "12px", color: "var(--color-primary)",
                  textDecoration: "none", fontWeight: 500,
                }}
              >
              🗺️ {t("bs_open_maps")}
              </a>
            )}
          </div>
        </div>

        {/* Social Media */}
        <div className="pl-card">
          <h2 className="pl-card-title">{t("bs_social_media")}</h2>
          {place.instagram_url && (
            <a className="pl-social-link" href={place.instagram_url} target="_blank" rel="noreferrer">📸 Instagram</a>
          )}
          {place.facebook_url && (
            <a className="pl-social-link" href={place.facebook_url} target="_blank" rel="noreferrer">👍 Facebook</a>
          )}
          {place.tiktok_url && (
            <a className="pl-social-link" href={place.tiktok_url} target="_blank" rel="noreferrer">🎵 TikTok</a>
          )}
          {!place.instagram_url && !place.facebook_url && !place.tiktok_url && (
            <p style={{ color: "var(--icon-muted)", fontSize: "13px" }}>{t("bs_no_social")}</p>
          )}
        </div>
      </div>

      {/* ── Delivery Settings ── */}
      <div className="pl-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 className="pl-card-title" style={{ margin: 0 }}>{t("bs_delivery_settings")}</h2>
          {deliveryLoading && <span style={{ fontSize: "12px", color: "var(--icon-muted)" }}>{t("loading")}</span>}
        </div>

        {/* Free Delivery toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderRadius: "12px", marginBottom: "20px",
          background: deliverySettings.is_free_delivery ? "var(--success-bg)" : "var(--bg-surface)",
          border: `1.5px solid ${deliverySettings.is_free_delivery ? "var(--success-bg)" : "var(--border)"}`,
          transition: "all 0.2s",
        }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>{t("bs_free_delivery")}</div>
            <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "2px" }}>
              {t("bs_free_delivery_sub")}
            </div>
          </div>
          <Toggle
            on={deliverySettings.is_free_delivery}
            disabled={deliveryLoading}
            onClick={() => setDeliverySettings((prev) => ({ ...prev, is_free_delivery: !prev.is_free_delivery }))}
          />
        </div>

        {/* Base delivery price */}
        {!deliverySettings.is_free_delivery && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-sub)", marginBottom: "8px" }}>
              {t("bs_base_delivery_price")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="number"
                min="0"
                step="0.5"
                className="pl-input"
                style={{ width: "140px" }}
                value={deliverySettings.delivery_price}
                onChange={(e) => setDeliverySettings((prev) => ({ ...prev, delivery_price: e.target.value }))}
              />
              <span style={{ fontSize: "13px", color: "var(--text-sub)", fontWeight: 500 }}>EGP</span>
            </div>
          </div>
        )}

        {/* Delivery Zones */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-sub)" }}>
              {t("bs_delivery_zones")}
            </div>

            <button className="pl-add-btn" onClick={addZone}>
              {t("bs_add_zone")}
            </button>
          </div>

          {deliverySettings.delivery_zones.length === 0 ? (
            <div
              style={{
                fontSize: "13px",
                color: "var(--icon-muted)",
                padding: "14px",
                background: "var(--bg-surface)",
                borderRadius: "10px",
                textAlign: "center",
                border: "1px dashed #e4e2dd",
              }}
            >
              {t("bs_no_zones")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {deliverySettings.delivery_zones.map((zone, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 12px", borderRadius: "10px",
                  border: "1px solid var(--border)", background: "var(--bg-surface)",
                }}>
                  <input
                    className="pl-input"
                    placeholder={t("bs_zone_name_placeholder")}
                    style={{ flex: 1 }}
                    value={zone.name}
                    onChange={(e) => updateZone(idx, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="pl-input"
                    placeholder="السعر"
                    style={{ width: "100px" }}
                    value={zone.price}
                    onChange={(e) => updateZone(idx, "price", e.target.value)}
                  />
                  <span style={{ fontSize: "12px", color: "var(--text-sub)", flexShrink: 0 }}>EGP</span>
                  <button
                    onClick={() => removeZone(idx)}
                    style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      border: "none", background: "var(--danger-bg)", color: "var(--danger)",
                      cursor: "pointer", fontSize: "14px", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          flexWrap: "wrap", paddingTop: "16px", borderTop: "1px solid #e4e2dd",
        }}>
          {deliveryError && <p className="pl-error" style={{ margin: 0 }}>⚠️ {deliveryError}</p>}
          {deliverySuccess && <p className="pl-success" style={{ margin: 0 }}>✅ {t("bs_saved")}</p>}
          <button
            className="pl-submit-btn pl-hours-save-btn"
            onClick={handleSaveDeliverySettings}
            disabled={deliverySaving || deliveryLoading}
            style={{ marginLeft: "auto" }}
          >
            {deliverySaving ? t("bs_saving") : t("bs_save_settings")}
          </button>
        </div>
      </div>

      {/* ── Order Settings ── */}
      <div className="pl-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 className="pl-card-title" style={{ margin: 0 }}>
            🛒 {t("bs_order_settings")}
          </h2>

          {orderSettingsLoading && (
            <span style={{ fontSize: "12px", color: "var(--icon-muted)" }}>
              {t("loading")}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>

          {/* is_accepting_orders */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderRadius: "12px",
            background: orderSettings.is_accepting_orders ? "var(--success-bg)" : "var(--danger-bg)",
            border: `1.5px solid ${orderSettings.is_accepting_orders ? "var(--success-bg)" : "var(--danger-bg)"}`,
            transition: "all 0.2s",
          }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>{t("bs_accepting_orders")}</div>
              <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "2px" }}>{t("bs_accepting_orders_sub")}</div>
            </div>
            <Toggle
              on={orderSettings.is_accepting_orders}
              disabled={orderSettingsLoading}
              onClick={() => setOrderSettings((prev) => ({ ...prev, is_accepting_orders: !prev.is_accepting_orders }))}
            />
          </div>

          {/* accepts_delivery */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderRadius: "12px",
            background: orderSettings.accepts_delivery ? "var(--success-bg)" : "var(--danger-bg)",
            border: `1.5px solid ${orderSettings.accepts_delivery ? "var(--success-bg)" : "var(--danger-bg)"}`,
            transition: "all 0.2s",
            opacity: orderSettings.is_accepting_orders ? 1 : 0.5,
            pointerEvents: orderSettings.is_accepting_orders ? "auto" : "none",
          }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>🚗 {t("owner_orders") === "الطلبات" ? "ديليفري" : "Delivery"}</div>
              <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "2px" }}>
                {t("bs_delivery_toggle_sub")}
              </div>

            </div>
            <Toggle
              on={orderSettings.accepts_delivery}
              onClick={() => setOrderSettings((prev) => ({ ...prev, accepts_delivery: !prev.accepts_delivery }))}
            />
          </div>

          {/* accepts_takeaway */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderRadius: "12px",
            background: orderSettings.accepts_takeaway ? "var(--success-bg)" : "var(--danger-bg)",
            border: `1.5px solid ${orderSettings.accepts_takeaway ? "var(--success-bg)" : "var(--danger-bg)"}`,
            transition: "all 0.2s",
            opacity: orderSettings.is_accepting_orders ? 1 : 0.5,
            pointerEvents: orderSettings.is_accepting_orders ? "auto" : "none",
          }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>🥡 {t("owner_orders") === "الطلبات" ? "تيك أواي" : "Takeaway"}</div>
              <div style={{ fontSize: "12px", color: "var(--text-sub)", marginTop: "2px" }}>
                {t("bs_takeaway_toggle_sub")}
              </div>
            </div>
            <Toggle
              on={orderSettings.accepts_takeaway}
              onClick={() => setOrderSettings((prev) => ({ ...prev, accepts_takeaway: !prev.accepts_takeaway }))}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {orderSettingsError && <p className="pl-error" style={{ margin: 0 }}>⚠️ {orderSettingsError}</p>}
          {orderSettingsSuccess && <p className="pl-success" style={{ margin: 0 }}>✅ {t("bs_saved")}</p>}
          <button
            className="pl-submit-btn pl-hours-save-btn"
            onClick={handleSaveOrderSettings}
            disabled={orderSettingsSaving || orderSettingsLoading}
            style={{ marginLeft: "auto" }}
          >
            {orderSettingsSaving ? t("bs_saving") : `💾 ${t("bs_save_settings")}`}
          </button>
        </div>
      </div>

      {/* ── Working Hours ── */}
      <div className="pl-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 className="pl-card-title" style={{ margin: 0 }}>🕐 {t("bs_working_hours")}</h2>
          <div
            onClick={handleToggleOpen}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: isOpen ? "var(--success-bg)" : "var(--danger-bg)",
              border: `1.5px solid ${isOpen ? "var(--success-bg)" : "var(--danger-bg)"}`,
              borderRadius: "12px", padding: "8px 14px",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <div style={{
              width: "40px", height: "22px", borderRadius: "11px",
              background: isOpen ? "var(--success)" : "var(--danger)",
              position: "relative", flexShrink: 0,
            }}>
              <div style={{
                width: "16px", height: "16px", borderRadius: "50%", background: "var(--bg-card)",
                position: "absolute", top: "3px", left: isOpen ? "21px" : "3px",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: isOpen ? "var(--success)" : "var(--danger)" }}>
                {togglingOpen ? t("bs_changing") : isOpen ? t("bs_place_open") : t("bs_place_closed")}
              </div>

              <div style={{ fontSize: "11px", color: "var(--icon-muted)" }}>
                {t("bs_tap_to_change")}
              </div>
            </div>
          </div>
        </div>

        <div className="pl-hours-grid">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="pl-hours-row">
              <div className="pl-hours-day">{t(DAY_T_KEYS[key])}</div>

              {workingHours[key]?.is24 ? (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center",
                  padding: "6px 12px", borderRadius: "8px",
                  background: "var(--success-bg)", border: "1px solid #86efac",
                  fontSize: "13px", fontWeight: 600, color: "var(--success)",
                }}>
                  {t("bs_open_24h")}
                </div>
              ) : (
                <>
                  <select
                    className="pl-input pl-time-select"
                    value={workingHours[key]?.open || "9:00 AM"}
                    onChange={(e) => updateDay(key, "open", e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="pl-hours-sep">—</span>
                  <select
                    className="pl-input pl-time-select"
                    value={workingHours[key]?.close || "10:00 PM"}
                    onChange={(e) => updateDay(key, "close", e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </>
              )}

              <div
                onClick={() => toggle24(key)}
                title="مفتوح 24 ساعة"
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  cursor: "pointer", padding: "5px 10px", borderRadius: "8px",
                  border: `1px solid ${workingHours[key]?.is24 ? "var(--success-bg)" : "var(--border)"}`,
                  background: workingHours[key]?.is24 ? "var(--success-bg)" : "transparent",
                  fontSize: "12px", fontWeight: 600,
                  color: workingHours[key]?.is24 ? "var(--success)" : "var(--icon-muted)",
                  whiteSpace: "nowrap", userSelect: "none",
                  transition: "all 0.2s", flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "16px" }}>{workingHours[key]?.is24 ? "🟢" : "🕐"}</span>
                {t("bs_open_24h")}
              </div>
            </div>
          ))}
        </div>

        <div className="pl-hours-footer">
          {hoursError && <p className="pl-error">⚠️ {hoursError}</p>}
          {hoursSuccess && <p className="pl-success">✅ {t("bs_hours_updated")}</p>}
          <button className="pl-submit-btn pl-hours-save-btn" onClick={handleSaveWorkingHours} disabled={hoursSaving}>
            {hoursSaving ? t("bs_saving") : t("bs_save_hours")}
          </button>
        </div>
      </div>

      {/* ── Place Images ── */}
      <div className="pl-card pl-images-section">
        <div className="pl-card-title-row">
          <h2 className="pl-card-title">{t("bs_place_images")}</h2>
          <button className="pl-add-btn" onClick={() => { setForm({ ...EMPTY_FORM, image_type: "place" }); setShowUpload(true); }}>
            + {t("bs_add_image")}
          </button>
        </div>
        {placeImages.length === 0 ? (
          <p className="pl-no-images">{t("bs_no_images")}</p>
        ) : (
          <div className="pl-images-grid">
            {placeImages.map((img) => (
              <div key={img.id} className="pl-image-wrap">
                <img src={img.image_url} alt={img.caption || "place"} className="pl-image" onClick={() => setLightboxImg(img.image_url)} />
                <button className="pl-delete-btn" onClick={() => handleDeleteImage(img.id)} disabled={deletingId === img.id}>
                  {deletingId === img.id ? "..." : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Menu Images ── */}
      <div className="pl-card pl-images-section">
        <div className="pl-card-title-row">
          <h2 className="pl-card-title">{t("bs_menu_images")}</h2>
          <button className="pl-add-btn" onClick={() => { setForm({ ...EMPTY_FORM, image_type: "menu" }); setShowUpload(true); }}>
            + {t("bs_add_image")}
          </button>
        </div>
        {menuImages.length === 0 ? (
          <p className="pl-no-images">{t("bs_no_images")}</p>
        ) : (
          <div className="pl-images-grid">
            {menuImages.map((img) => (
              <div key={img.id} className="pl-image-wrap">
                <img src={img.image_url} alt="menu" className="pl-image" onClick={() => setLightboxImg(img.image_url)} />
                <button className="pl-delete-btn" onClick={() => handleDeleteImage(img.id)} disabled={deletingId === img.id}>
                  {deletingId === img.id ? "..." : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxImg && (
        <div className="pl-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <button className="pl-lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
          <img src={lightboxImg} alt="preview" className="pl-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div className="pl-modal-overlay" onClick={handleCloseUpload}>
          <div className="pl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pl-modal-header">
              <h2>{t("bs_add_image")}</h2>
              <button className="pl-modal-close" onClick={handleCloseUpload}>✕</button>
            </div>
            <div className="pl-modal-body">
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #e2e8f0", borderRadius: "12px", padding: "24px",
                  textAlign: "center", cursor: "pointer",
                  background: previewUrl ? "var(--bg-surface)" : "var(--bg-surface)",
                  transition: "border-color 0.2s", position: "relative",
                  overflow: "hidden", minHeight: "140px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--text-main)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="preview"
                    style={{ maxHeight: "160px", maxWidth: "100%", borderRadius: "8px", objectFit: "contain" }} />
                ) : (
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>🖼️</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>{t("bs_click_to_select")}</div>
                    <div style={{ fontSize: "12px", color: "var(--icon-muted)", marginTop: "4px" }}>JPG, PNG, WEBP</div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
              </div>

              {previewUrl && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "none", border: "1px solid #e2e8f0", borderRadius: "8px",
                    padding: "6px 14px", fontSize: "13px", color: "var(--text-sub)",
                    cursor: "pointer", alignSelf: "flex-start",
                  }}
                >
                  {t("bs_change_image")}
                </button>
              )}

              <div className="pl-form-row">
                <label>{t("bs_image_type")}</label>
                <select value={form.image_type} onChange={(e) => setForm({ ...form, image_type: e.target.value })} className="pl-input">
                  <option value="place">{t("bs_img_type_place")}</option>
                  <option value="menu">{t("bs_img_type_menu")}</option>
                </select>
              </div>

              <div className="pl-form-row">
                <label>{t("bs_caption_optional")}</label>
                <input type="text" placeholder={t("bs_caption_placeholder")}
                  value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="pl-input" />
              </div>

              {error && <p className="pl-error">⚠️ {error}</p>}

              <button className="pl-submit-btn" onClick={handleUpload} disabled={uploading || !form.file}>
                {uploading ? t("bs_uploading") : `⬆️ ${t("bs_upload_image")}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEdit && (
        <div className="pl-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="pl-modal pl-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="pl-modal-header">
              <h2>{t("bs_edit_place_info")}</h2>
              <button className="pl-modal-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <div className="pl-modal-body">

              <div className="pl-form-row">
                <label>{t("name")}</label>
                <input className="pl-input" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>

              <div className="pl-form-row">
                <label>{t("bs_description")}</label>
                <textarea className="pl-input pl-textarea" value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>

              <div className="pl-form-row">
                <label>{t("bs_address")}</label>
                <input className="pl-input" value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>

              <div className="pl-form-row">
                <label>{t("bs_phone_comma")}</label>
                <input className="pl-input"
                  value={Array.isArray(editForm.phone) ? editForm.phone.join(", ") : editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>

              <div className="pl-form-row">
                <label>{t("bs_website")}</label>
                <input className="pl-input" value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
              </div>

              <div className="pl-form-row">
                <label>WhatsApp</label>
                <input className="pl-input" value={editForm.whatsapp_number}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })} />
              </div>

              {/* Location */}
              <div style={{
                padding: "14px 16px", background: "var(--bg-surface)",
                border: "1px solid var(--border)", borderRadius: "12px",
                display: "flex", flexDirection: "column", gap: "12px",
              }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-sub)" }}>📍 {t("bs_location")}</div>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) { alert(t("bs_geolocation_unsupported")); return; }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setEditForm((prev) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
                      () => alert(t("bs_geolocation_failed"))
                    );
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 14px", borderRadius: "8px",
                    border: "1px solid #2563eb", background: "var(--info-bg)",
                    color: "var(--color-primary)", fontSize: "13px", fontWeight: 600,
                    cursor: "pointer", alignSelf: "flex-start",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                >
                  📍 {t("bs_use_my_location")}
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="pl-form-row">
                    <label>Latitude <span style={{ fontWeight: 400, color: "var(--icon-muted)", fontSize: "11px" }}>(22 → 32 لمصر)</span></label>
                    <input className="pl-input" type="number" step="any" placeholder="e.g. 30.0444"
                      value={editForm.latitude}
                      onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })} />
                  </div>
                  <div className="pl-form-row">
                    <label>Longitude <span style={{ fontWeight: 400, color: "var(--icon-muted)", fontSize: "11px" }}>(24 → 37 لمصر)</span></label>
                    <input className="pl-input" type="number" step="any" placeholder="e.g. 31.2357"
                      value={editForm.longitude}
                      onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })} />
                  </div>
                </div>

                {/* Map Preview */}
                {(() => {
                  const lat = parseFloat(editForm.latitude);
                  const lng = parseFloat(editForm.longitude);
                  if (!editForm.latitude || !editForm.longitude || isNaN(lat) || isNaN(lng)) return null;
                  const validEgypt = lat >= 22 && lat <= 32 && lng >= 24 && lng <= 37;
                  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                  const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
                  return (
                    <div>
                      {!validEgypt ? (
                        <div style={{ marginBottom: "8px", background: "var(--warning-bg)", border: "1px solid #fde68a", borderRadius: "8px", padding: "9px 13px", fontSize: "12px", color: "var(--warning)", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <span>&#9888;&#65039;</span>
                          <span><strong>تحذير:</strong> الكوردينيتس دي خارج نطاق مصر — تأكد انك مش عكستهم!</span>
                        </div>
                      ) : (
                        <div style={{ marginBottom: "8px", background: "var(--success-bg)", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "9px 13px", fontSize: "12px", color: "var(--success)", display: "flex", alignItems: "center", gap: "6px" }}>
                          &#10003;&#65039; الكوردينيتس في النطاق الصح — اتاكد من الموقع على الخريطة تحت
                        </div>
                      )}
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-sub)", marginBottom: "6px" }}>&#128506;&#65039; Map Preview</div>
                      <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border)" }}>
                        <iframe
                          title="edit-map-preview"
                          src={embedUrl}
                          width="100%"
                          height="200"
                          style={{ display: "block", border: "none" }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "7px", fontSize: "12px", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                        &#128279; افتح في Google Maps للتاكيد
                      </a>
                    </div>
                  );
                })()}

                <div className="pl-form-row">
                  <label>{t("bs_location_link")}</label>
                  <input className="pl-input" type="url" placeholder="https://maps.google.com/..."
                    value={editForm.location_link}
                    onChange={(e) => {
                      const url = e.target.value;
                      setEditForm((prev) => {
                        const updated = { ...prev, location_link: url };
                        // استخرج lat/lng من لينك Google Maps تلقائياً
                        const patterns = [
                          /@(-?\d+\.\d+),(-?\d+\.\d+)/,           // @lat,lng
                          /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,      // ?q=lat,lng
                          /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,     // ?ll=lat,lng
                          /\/(-?\d+\.\d+),(-?\d+\.\d+)/,          // /lat,lng
                          /place\/(-?\d+\.\d+)\+(-?\d+\.\d+)/,   // place/lat+lng
                        ];
                        for (const pattern of patterns) {
                          const match = url.match(pattern);
                          if (match) {
                            updated.latitude = match[1];
                            updated.longitude = match[2];
                            break;
                          }
                        }
                        return updated;
                      });
                    }}
                  />
                  {editForm.location_link && !editForm.latitude && (
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--icon-muted)" }}>
                      💡 تأكد إن اللينك فيه كوردينيتس — مثال: maps.google.com/maps?q=30.04,31.23
                    </div>
                  )}
                </div>
              </div>

              <div className="pl-form-row">
                <label>Instagram URL</label>
                <input className="pl-input" value={editForm.instagram_url}
                  onChange={(e) => setEditForm({ ...editForm, instagram_url: e.target.value })} />
              </div>

              <div className="pl-form-row">
                <label>Facebook URL</label>
                <input className="pl-input" value={editForm.facebook_url}
                  onChange={(e) => setEditForm({ ...editForm, facebook_url: e.target.value })} />
              </div>

              <div className="pl-form-row">
                <label>TikTok URL</label>
                <input className="pl-input" value={editForm.tiktok_url}
                  onChange={(e) => setEditForm({ ...editForm, tiktok_url: e.target.value })} />
              </div>

              {editError && <p className="pl-error">{editError}</p>}

              <button className="pl-submit-btn" onClick={handleSaveEdit} disabled={saving}>
                {saving ? t("bs_saving") : t("bs_save_changes")}
              </button>
            </div>
          </div>
        </div>

      )}
      {confirmOpen && (
        <ConfirmPopup
          message={isOpen ? t("bs_confirm_close_title") : t("bs_confirm_open_title")}
          subMessage={
            isOpen
              ? t("bs_confirm_close_sub")
              : t("bs_confirm_open_sub")
          }
          confirmLabel={isOpen ? `🔴 ${t("bs_close")}` : `🟢 ${t("bs_open")}`}
          cancelLabel={t("cancel")}
          danger={isOpen}
          onConfirm={handleToggleOpenConfirmed}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {confirmBranch && (
        <ConfirmPopup
          message={isActive ? t("bs_confirm_hide_title") : t("bs_confirm_show_title")}
          subMessage={
            isActive
              ? t("bs_confirm_hide_sub")
              : t("bs_confirm_show_sub")
          }
          confirmLabel={isActive ? t("bs_hide") : t("bs_show")}
          danger={isActive}
          onConfirm={handleToggleBranchConfirmed}
          onCancel={() => setConfirmBranch(false)}
        />
      )}
    </div>
  );
}