import React, { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";
import { formatSizeStats } from "../utils";

// Taille du cache d'icones et nettoyage des icones de mods qui n'existent plus
function IconCacheSection() {
  const [stats, setStats] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadStats() {
    const result = await window.fs25.getIconCacheStats();
    setStats(result.success ? result : null);
    if (!result.success) setMessage(`Erreur : ${result.error}`);
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function clean() {
    setCleaning(true);
    const result = await window.fs25.cleanIconCache();
    setCleaning(false);
    setMessage(result.success
      ? `${result.removedCount} icône(s) supprimée(s), ${formatSizeStats(result.removedBytes)} libérés`
      : `Erreur : ${result.error}`);
    await loadStats();
  }

  return (
    <>
      <label className="field-label">Cache des icônes</label>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px", fontSize: "13px" }}>
        <span style={{ flex: 1, opacity: 0.85 }}>
          {stats
            ? `${stats.fileCount} icône(s), ${formatSizeStats(stats.totalBytes)} — dont ${stats.unusedCount} inutilisée(s) (${formatSizeStats(stats.unusedBytes)})`
            : "Calcul en cours..."}
        </span>
        <ActionButton
          onClick={clean}
          disabled={!stats || stats.unusedCount === 0 || cleaning}
        >
          {cleaning ? "Nettoyage..." : "Nettoyer maintenant"}
        </ActionButton>
      </div>
      <div className="hint" style={{ marginBottom: "16px" }}>
        {message || "Icônes de mods supprimés ou mis à jour. Le nettoyage se fait aussi automatiquement au démarrage (icônes inutilisées depuis plus de 2 jours)."}
      </div>
    </>
  );
}

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

      <IconCacheSection />
    </Modal>
  );
}
