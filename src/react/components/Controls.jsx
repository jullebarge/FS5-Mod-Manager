import React from "react";
import { colors } from "../theme";

export function StatCard({ label, value, icon, onClick, active, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        background: active ? "#3a3a3a" : colors.panel2,
        border: active ? "1px solid #A8B655" : `1px solid ${colors.border}`,
        borderRadius: "10px",
        padding: "16px",
        minWidth: "160px",
        cursor: disabled ? "default" : onClick ? "pointer" : "default",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.2s"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "13px", opacity: 0.8 }}>{label}</div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
        </div>

        {icon && (
          <div
            style={{
              fontSize: "20px",
              opacity: 0.85,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff"
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// variant "danger" : bouton rouge (suppressions), "muted" : bouton secondaire gris
const VARIANT_STYLES = {
  danger: { background: colors.danger, color: "#fff" },
  muted: { background: "#555", color: "#fff" }
};

export function ActionButton({ children, onClick, style = {}, variant, disabled = false, title }) {
  const baseStyle = {
    background: colors.button,
    color: colors.buttonText,
    border: "none",
    fontWeight: 700,
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.2s"
  };

  const disabledStyle = disabled
    ? {
        background: "#555",
        color: "#aaa",
        opacity: 0.6,
        cursor: "not-allowed"
      }
    : {};

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={{
        ...baseStyle,
        ...(variant ? VARIANT_STYLES[variant] : {}),
        ...style,
        ...disabledStyle
      }}
    >
      {children}
    </button>
  );
}

export function Badge({ children, background, color = "#fff", title }) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        background,
        color,
        userSelect: "none"
      }}
    >
      {children}
    </span>
  );
}
