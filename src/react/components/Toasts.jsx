import React from "react";

export function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={toast.type === "error" ? "toast toast--error" : "toast"}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
