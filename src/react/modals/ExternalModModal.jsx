import React, { useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";
import { t } from "../../locales/i18n";

// onPickZip renvoie le chemin choisi, ou null si annule
export function ExternalModModal({ profile, onCancel, onPickZip, onSubmit }) {
  const [zipPath, setZipPath] = useState("");
  const [url, setUrl] = useState("");

  async function pickZip() {
    const filePath = await onPickZip();
    if (filePath) {
      setZipPath(filePath);
    }
  }

  return (
    <Modal
      title={t("externalModal.title")}
      width={520}
      actions={
        <>
          <ActionButton onClick={onCancel}>{t("common.cancel")}</ActionButton>
          <ActionButton onClick={() => onSubmit(zipPath, url)}>{t("common.add")}</ActionButton>
        </>
      }
    >
      <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "12px" }}>
        {t("externalModal.target")}{" "}
        <strong>{profile}</strong>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <input
          type="text"
          className="text-input"
          value={zipPath}
          readOnly
          placeholder={t("externalModal.noZip")}
          style={{ flex: 1 }}
        />

        <ActionButton onClick={pickZip}>{t("externalModal.pickZip")}</ActionButton>
      </div>

      <input
        type="text"
        className="text-input"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        style={{ width: "100%", marginBottom: "12px" }}
      />

      <div className="hint" style={{ marginBottom: "16px" }}>
        {t("externalModal.urlHint")}
      </div>
    </Modal>
  );
}
