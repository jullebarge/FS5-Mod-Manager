import React, { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton, Badge } from "../components/Controls";
import { DEFAULT_PROFILE } from "../theme";
import { formatSize, formatSizeStats, getStatusDisplay } from "../utils";
import { t } from "../../locales/i18n";

const AUTO_ASSOCIATION = "__auto__";
const NO_ASSOCIATION = "__none__";

const sectionTitle = { margin: "20px 0 8px", fontSize: "15px" };
const row = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  padding: "6px 0",
  borderBottom: "1px solid #3a3a3a",
  fontSize: "13px"
};
const smallButton = { padding: "4px 10px", fontSize: "12px" };

function savegameLabel(savegame) {
  const details = [savegame.mapTitle, savegame.saveDate].filter(Boolean).join(", ");
  return details ? `${savegame.name} (${details})` : savegame.name;
}

function MissingRow({ mod, onReintegrate }) {
  const { availability } = mod;

  return (
    <div style={row}>
      <span style={{ fontWeight: 600 }}>{mod.title}</span>
      <span style={{ opacity: 0.7 }}>{mod.modName} v{mod.version}</span>
      {mod.required && <Badge background="#8b2f2f">{t("savegames.required")}</Badge>}
      {mod.hasObjects && (
        <Badge background="#a86b2a" title={t("savegames.hasObjectsTooltip")}>
          {t("savegames.hasObjects")}
        </Badge>
      )}
      <span style={{ marginLeft: "auto", opacity: 0.85 }}>
        {availability.type === "excluded-favorite" && t("savegames.availability.excludedFavorite")}
        {availability.type === "favorite" && t("savegames.availability.favorite")}
        {availability.type === "other-profile" && t("savegames.availability.otherProfile", { profile: availability.profile })}
        {availability.type === "none" && t("savegames.availability.none")}
      </span>
      {availability.type === "excluded-favorite" && (
        <ActionButton style={smallButton} onClick={() => onReintegrate(mod)}>
          {t("savegames.reintegrate")}
        </ActionButton>
      )}
    </div>
  );
}

function UnusedRow({ mod, canExclude, onExclude, onDelete }) {
  const status = getStatusDisplay(mod.status);
  const isFavorite = mod.status === "common-linked";

  return (
    <div style={row}>
      <span title={status.tooltip} style={{ color: status.color }}>{status.icon}</span>
      <span style={{ fontWeight: 600 }}>{mod.name}</span>
      <span style={{ opacity: 0.7 }}>{mod.fileName}</span>
      {mod.isNew && (
        <Badge background="#355c7d" title={t("savegames.newTooltip")}>
          {t("savegames.new")}
        </Badge>
      )}
      {mod.usedBy.length > 0 && (
        <Badge background="#2f6b3a" title={t("savegames.usedByTooltip")}>
          {t("savegames.usedBy", { savegames: mod.usedBy.join(", ") })}
        </Badge>
      )}
      <span style={{ marginLeft: "auto", opacity: 0.7 }}>
        {mod.isDirectory ? t("card.folder") : formatSize(mod.size)}
      </span>
      {isFavorite && canExclude ? (
        <ActionButton style={smallButton} onClick={() => onExclude([mod])}>
          {t("savegames.exclude")}
        </ActionButton>
      ) : !isFavorite ? (
        <ActionButton style={smallButton} variant="danger" onClick={() => onDelete(mod)}>
          {t("savegames.trash")}
        </ActionButton>
      ) : null}
    </div>
  );
}

// Mods d'une sauvegarde compares au dossier du profil : manquants, inutilises, versions.
// modsVersion change a chaque rechargement du profil : l'analyse est alors refaite.
export function SavegamesModal({ profile, profiles, modsVersion, onClose, onExcludeFavorites, onReintegrate, onDelete }) {
  const [savegames, setSavegames] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  async function loadSavegames() {
    const list = await window.fs25.getSavegames();
    setSavegames(list);
    return list;
  }

  useEffect(() => {
    loadSavegames().then((list) => {
      const linked = list.find((s) => s.profile === profile);
      setSelectedId((current) => current || (linked || list[0] || {}).id || null);
    });
  }, [profile]);

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    setAnalysis(null);
    setError(null);

    window.fs25.analyzeSavegame(profile, selectedId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setAnalysis(result);
      } else {
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [profile, selectedId, modsVersion]);

  async function changeAssociation(value) {
    const target = value === AUTO_ASSOCIATION ? null : value === NO_ASSOCIATION ? "" : value;
    await window.fs25.setSavegameProfile(selectedId, target);
    await loadSavegames();
  }

  const linked = (savegames || []).filter((s) => s.profile === profile);
  const others = (savegames || []).filter((s) => s.profile !== profile);
  const selected = (savegames || []).find((s) => s.id === selectedId);
  const canExclude = profile !== DEFAULT_PROFILE;

  // favoris inutilises sans doute possible : ni nouveaux, ni actives dans une autre partie du profil
  const removableFavorites = analysis
    ? analysis.unused.filter((m) => m.status === "common-linked" && !m.isNew && m.usedBy.length === 0)
    : [];
  const unusedSize = analysis ? analysis.unused.reduce((sum, m) => sum + (m.size || 0), 0) : 0;

  return (
    <Modal
      title={t("savegames.title", { profile })}
      width={900}
      scrollable
      actions={<ActionButton onClick={onClose}>{t("common.close")}</ActionButton>}
    >
      <div className="hint" style={{ marginBottom: "14px" }}>
        {t("savegames.intro")}
      </div>

      {savegames === null ? (
        <div className="hint">{t("savegames.loading")}</div>
      ) : savegames.length === 0 ? (
        <div className="hint">{t("savegames.none")}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 2, minWidth: "320px" }}>
              <label className="field-label">{t("savegames.selected")}</label>
              <select
                className="text-input"
                style={{ width: "100%" }}
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {linked.length > 0 && (
                  <optgroup label={t("savegames.linkedGroup", { profile })}>
                    {linked.map((s) => (
                      <option key={s.id} value={s.id}>{savegameLabel(s)}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={t("savegames.otherGroup")}>
                  {others.map((s) => (
                    <option key={s.id} value={s.id}>
                      {savegameLabel(s)}{s.profile ? ` → ${s.profile}` : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {selected && (
              <div style={{ flex: 1, minWidth: "220px" }}>
                <label className="field-label">{t("savegames.association")}</label>
                <select
                  className="text-input"
                  style={{ width: "100%" }}
                  value={selected.isManual ? (selected.profile || NO_ASSOCIATION) : AUTO_ASSOCIATION}
                  onChange={(e) => changeAssociation(e.target.value)}
                >
                  <option value={AUTO_ASSOCIATION}>
                    {selected.bestMatch && selected.bestMatch.coverage >= 80
                      ? t("savegames.automaticWith", { profile: selected.bestMatch.profile })
                      : t("savegames.automaticNone")}
                  </option>
                  <option value={NO_ASSOCIATION}>{t("savegames.noProfile")}</option>
                  {[DEFAULT_PROFILE, ...profiles].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {linked.length === 0 && (
            <div className="hint" style={{ marginTop: "8px" }}>
              {t("savegames.noneLinked")}
            </div>
          )}

          {error && <div style={{ marginTop: "16px", color: "#d9534f" }}>{t("common.errorPrefix", { error })}</div>}

          {!analysis && !error && <div className="hint" style={{ marginTop: "16px" }}>{t("savegames.analyzing")}</div>}

          {analysis && (
            <>
              <div style={{ marginTop: "16px", fontSize: "13px", opacity: 0.85 }}>
                {t("savegames.summary", {
                  active: t("savegames.count.activeInGame", { count: analysis.savegame.modCount }),
                  inProfile: analysis.profileModCount
                })}
                {analysis.otherSavegames.length > 0 && ` · ${t("savegames.sharedWith", { savegames: analysis.otherSavegames.join(", ") })}`}
              </div>

              <h4 style={sectionTitle}>
                {analysis.missing.length === 0
                  ? `✅ ${t("savegames.noMissing")}`
                  : `❌ ${t("savegames.missing", { count: analysis.missing.length })}`}
              </h4>
              {analysis.missing.map((m) => (
                <MissingRow key={m.modName} mod={m} onReintegrate={onReintegrate} />
              ))}

              <h4 style={sectionTitle}>
                {analysis.unused.length === 0
                  ? `✅ ${t("savegames.noUnused")}`
                  : `📦 ${t("savegames.unused", { count: analysis.unused.length, size: formatSizeStats(unusedSize) })}`}
              </h4>
              {analysis.unused.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <span className="hint">
                    {t("savegames.unusedHint")}
                  </span>
                  {canExclude && removableFavorites.length > 0 && (
                    <ActionButton
                      style={{ ...smallButton, marginLeft: "auto", whiteSpace: "nowrap" }}
                      onClick={() => onExcludeFavorites(removableFavorites)}
                    >
                      {t("savegames.excludeUnused", { count: removableFavorites.length })}
                    </ActionButton>
                  )}
                </div>
              )}
              {analysis.unused.map((m) => (
                <UnusedRow
                  key={m.fileName}
                  mod={m}
                  canExclude={canExclude}
                  onExclude={onExcludeFavorites}
                  onDelete={onDelete}
                />
              ))}

              {analysis.versionMismatch.length > 0 && (
                <>
                  <h4 style={sectionTitle}>
                    🔄 {t("savegames.versionMismatch", { count: analysis.versionMismatch.length })}
                  </h4>
                  {analysis.versionMismatch.map((m) => (
                    <div key={m.fileName} style={row}>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span style={{ marginLeft: "auto", opacity: 0.85 }}>
                        {t("savegames.versionChange", { saved: m.savedVersion, installed: m.installedVersion })}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
