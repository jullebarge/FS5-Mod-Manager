import React, { useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";

// onPickFolder renvoie le dossier choisi, ou null si annule
export function SettingsModal({ settings, onCancel, onPickFolder, onSave }) {
  const [form, setForm] = useState({
    gamePath: settings?.gamePath || "",
    launchUrl: settings?.launchUrl || ""
  });

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function pickFolder() {
    const folderPath = await onPickFolder();
    if (folderPath) {
      setField("gamePath", folderPath);
    }
  }

  return (
    <Modal
      title="Réglages"
      width={560}
      actions={
        <>
          <ActionButton onClick={onCancel}>Annuler</ActionButton>
          <ActionButton onClick={() => onSave(form)}>Enregistrer</ActionButton>
        </>
      }
    >
      <label className="field-label">
        Dossier du jeu (contient gameSettings.xml, mods et modsCartes)
      </label>
      <div style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
        <input
          type="text"
          className="text-input"
          value={form.gamePath}
          onChange={(e) => setField("gamePath", e.target.value)}
          style={{ flex: 1 }}
        />
        <ActionButton onClick={pickFolder}>Parcourir</ActionButton>
      </div>
      <div className="hint" style={{ marginBottom: "16px" }}>
        Par défaut : {settings?.defaultGamePath}
      </div>

      <label className="field-label">
        URL de lancement du jeu (bouton « Lancer le jeu »)
      </label>
      <input
        type="text"
        className="text-input"
        value={form.launchUrl}
        onChange={(e) => setField("launchUrl", e.target.value)}
        placeholder="playnite://playnite/start/<id> ou steam://rungameid/<id>"
        style={{ width: "100%", marginBottom: "6px" }}
      />
      <div className="hint" style={{ marginBottom: "16px" }}>
        Laisser vide pour désactiver le bouton.
      </div>
    </Modal>
  );
}
