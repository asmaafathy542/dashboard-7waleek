// StatCard.jsx — نفس استايل كاردز الـ Overview (KpiCard) بس عام لكل الصفحات
// بيتستخدم في Owners.jsx و Places.jsx وأي صفحة تانية محتاجة كاردز إحصائيات شبه الأوفرفيو

export const STAT_COLORS = {
  purple: { accent: "#7F77DD", iconBg: "#EEEDFE", iconColor: "#534AB7" },
  teal:   { accent: "#1D9E75", iconBg: "#E1F5EE", iconColor: "#0F6E56" },
  blue:   { accent: "#378ADD", iconBg: "#E6F1FB", iconColor: "#185FA5" },
  amber:  { accent: "#BA7517", iconBg: "#FAEEDA", iconColor: "#854F0B" },
  pink:   { accent: "#D4537E", iconBg: "#FBEAF0", iconColor: "#993556" },
  coral:  { accent: "#D85A30", iconBg: "#FAECE7", iconColor: "#993C1D" },
};

export default function StatCard({ icon, label, value, colorKey = "blue", percent }) {
  const c = STAT_COLORS[colorKey] ?? STAT_COLORS.blue;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid #e4e2dd",
        borderRadius: "12px",
        padding: "1.25rem 1.25rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent top bar */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "3px",
          background: c.accent,
          borderRadius: "12px 12px 0 0",
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: "36px", height: "36px",
          borderRadius: "8px",
          background: c.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px",
          marginBottom: "4px",
          marginTop: "4px",
        }}
      >
        <span style={{ color: c.iconColor, fontSize: "18px" }}>{icon}</span>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color: "var(--text-main)",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      {/* Label */}
      <div style={{ fontSize: "12px", color: "var(--icon-muted)", fontWeight: 400 }}>
        {label}
      </div>

      {/* Percent / trend badge */}
      {percent != null && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "999px",
            marginTop: "2px",
            alignSelf: "flex-start",
            background: c.iconBg,
            color: c.iconColor,
          }}
        >
          {percent}
        </div>
      )}
    </div>
  );
}
