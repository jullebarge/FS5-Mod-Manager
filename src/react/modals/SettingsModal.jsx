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

// Champ "dossier" : saisie libre ou bouton Parcourir. defaultHint : dossier utilise si vide
function FolderField({ label, value, placeholder, hint, onChange, onBrowse }) {
  return (
    <>
      <label className="field-label">{label}</label>
      <div style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
        <input
          type="text"
          className="text-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <ActionButton onClick={onBrowse}>Parcourir</ActionButton>
      </div>
      <div className="hint" style={{ marginBottom: "16px" }}>{hint}</div>
    </>
  );
}

// onPickFolder(titre, dossierInitial) renvoie le dossier choisi, ou null si annule
export function SettingsModal({ settings, onCancel, onPickFolder, onSave }) {
  const [form, setForm] = useState({
    gamePath: settings?.gamePath || "",
    modsPath: settings?.modsPath || "",
    profilesPath: settings?.profilesPath || "",
    launchUrl: settings?.launchUrl || ""
  });

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function browse(field, title, initialPath) {
    const folderPath = await onPickFolder(title, initialPath);
    if (folderPath) {
      setField(field, folderPath);
    }
  }

  // dossiers utilises quand les champs sont vides, deduits du dossier du jeu saisi
  const gameFolder = form.gamePath.replace(/[\\/]+$/, "");
  const defaultModsPath = `${gameFolder}\\mods`;
  const defaultProfilesPath = `${gameFolder}\\modsCartes`;

  return (
    <Modal
      title="Réglages"
      width={600}
      scrollable
      actions={
        <>
          <ActionButton onClick={onCancel}>Annuler</ActionButton>
          <ActionButton onClick={() => onSave(form)}>Enregistrer</ActionButton>
        </>
      }
    >
      <FolderField
        label="Dossier du jeu (contient gameSettings.xml et les sauvegardes)"
        value={form.gamePath}
        hint={`Par défaut : ${settings?.defaultGamePath}`}
        onChange={(value) => setField("gamePath", value)}
        onBrowse={() => browse("gamePath", "Choisir le dossier FarmingSimulator2025", form.gamePath)}
      />

      <FolderField
        label="Dossier des mods favoris (profil Default)"
        value={form.modsPath}
        placeholder={defaultModsPath}
        hint="Laisser vide pour utiliser le dossier « mods » du jeu."
        onChange={(value) => setField("modsPath", value)}
        onBrowse={() => browse("modsPath", "Choisir le dossier des mods favoris", form.modsPath || defaultModsPath)}
      />

      <FolderField
        label="Dossier des mods par carte (un sous-dossier par profil)"
        value={form.profilesPath}
        placeholder={defaultProfilesPath}
        hint="Laisser vide pour utiliser le dossier « modsCartes » du jeu. Il doit être sur le même disque que les mods favoris (liens des favoris)."
        onChange={(value) => setField("profilesPath", value)}
        onBrowse={() => browse("profilesPath", "Choisir le dossier des mods par carte", form.profilesPath || defaultProfilesPath)}
      />

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
