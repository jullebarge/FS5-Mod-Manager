import React, { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";
import { formatSizeStats } from "../utils";
import { LANGUAGES, t } from "../../locales/i18n";

// Taille du cache d'icones et nettoyage des icones de mods qui n'existent plus
function IconCacheSection() {
  const [stats, setStats] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadStats() {
    const result = await window.fs25.getIconCacheStats();
    setStats(result.success ? result : null);
    if (!result.success) setMessage(t("common.errorPrefix", { error: result.error }));
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function clean() {
    setCleaning(true);
    const result = await window.fs25.cleanIconCache();
    setCleaning(false);
    setMessage(result.success
      ? t("settings.iconCache.cleaned", { count: result.removedCount, size: formatSizeStats(result.removedBytes) })
      : t("common.errorPrefix", { error: result.error }));
    await loadStats();
  }

  return (
    <>
      <label className="field-label">{t("settings.iconCache.label")}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px", fontSize: "13px" }}>
        <span style={{ flex: 1, opacity: 0.85 }}>
          {stats
            ? t("settings.iconCache.stats", {
                files: t("settings.iconCache.count.files", { count: stats.fileCount }),
                size: formatSizeStats(stats.totalBytes),
                unused: t("settings.iconCache.count.unused", { count: stats.unusedCount }),
                unusedSize: formatSizeStats(stats.unusedBytes)
              })
            : t("settings.iconCache.computing")}
        </span>
        <ActionButton
          onClick={clean}
          disabled={!stats || stats.unusedCount === 0 || cleaning}
        >
          {cleaning ? t("settings.iconCache.cleaning") : t("settings.iconCache.clean")}
        </ActionButton>
      </div>
      <div className="hint" style={{ marginBottom: "16px" }}>
        {message || t("settings.iconCache.hint")}
      </div>
    </>
  );
}

// Champ "dossier" : saisie libre ou bouton Parcourir
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
        <ActionButton onClick={onBrowse}>{t("settings.browse")}</ActionButton>
      </div>
      <div className="hint" style={{ marginBottom: "16px" }}>{hint}</div>
    </>
  );
}

// onPickFolder(titre, dossierInitial) renvoie le dossier choisi, ou null si annule
export function SettingsModal({ settings, onCancel, onPickFolder, onSave }) {
  const [form, setForm] = useState({
    language: settings?.language || "en",
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
  // (le nom du dossier des mods par carte depend de la langue, sauf s'il existe deja)
  const gameFolder = form.gamePath.replace(/[\\/]+$/, "");
  const defaultModsPath = `${gameFolder}\\mods`;
  const defaultProfilesPath = `${gameFolder}\\${settings?.profilesFolderName || "modsCartes"}`;

  return (
    <Modal
      title={t("settings.title")}
      width={600}
      scrollable
      actions={
        <>
          <ActionButton onClick={onCancel}>{t("common.cancel")}</ActionButton>
          <ActionButton onClick={() => onSave(form)}>{t("common.save")}</ActionButton>
        </>
      }
    >
      <label className="field-label">{t("settings.language")}</label>
      <select
        className="text-input"
        value={form.language}
        onChange={(e) => setField("language", e.target.value)}
        style={{ width: "100%", marginBottom: "16px" }}
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>{language.label}</option>
        ))}
      </select>

      <FolderField
        label={t("settings.gamePath.label")}
        value={form.gamePath}
        hint={t("settings.defaultValue", { value: settings?.defaultGamePath })}
        onChange={(value) => setField("gamePath", value)}
        onBrowse={() => browse("gamePath", t("settings.gamePath.pick"), form.gamePath)}
      />

      <FolderField
        label={t("settings.modsPath.label")}
        value={form.modsPath}
        placeholder={defaultModsPath}
        hint={t("settings.modsPath.hint")}
        onChange={(value) => setField("modsPath", value)}
        onBrowse={() => browse("modsPath", t("settings.modsPath.pick"), form.modsPath || defaultModsPath)}
      />

      <FolderField
        label={t("settings.profilesPath.label")}
        value={form.profilesPath}
        placeholder={defaultProfilesPath}
        hint={t("settings.profilesPath.hint", { folder: settings?.profilesFolderName || "modsCartes" })}
        onChange={(value) => setField("profilesPath", value)}
        onBrowse={() => browse("profilesPath", t("settings.profilesPath.pick"), form.profilesPath || defaultProfilesPath)}
      />

      <label className="field-label">{t("settings.launchUrl.label")}</label>
      <input
        type="text"
        className="text-input"
        value={form.launchUrl}
        onChange={(e) => setField("launchUrl", e.target.value)}
        placeholder={t("settings.launchUrl.placeholder")}
        style={{ width: "100%", marginBottom: "6px" }}
      />
      <div className="hint" style={{ marginBottom: "16px" }}>
        {t("settings.launchUrl.hint")}
      </div>

      <IconCacheSection />
    </Modal>
  );
}
