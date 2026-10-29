import React, { useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";

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
      title="Ajouter un mod externe"
      width={520}
      actions={
        <>
          <ActionButton onClick={onCancel}>Annuler</ActionButton>
          <ActionButton onClick={() => onSubmit(zipPath, url)}>Ajouter</ActionButton>
        </>
      }
    >
      <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "12px" }}>
        Le ZIP sera copié dans le profil sélectionné :{" "}
        <strong>{profile}</strong>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <input
          type="text"
          className="text-input"
          value={zipPath}
          readOnly
          placeholder="Aucun ZIP sélectionné"
          style={{ flex: 1 }}
        />

        <ActionButton onClick={pickZip}>Choisir un ZIP</ActionButton>
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
        Exemples : page KingMods, page de forum, page perso du mod.
      </div>
    </Modal>
  );
}
