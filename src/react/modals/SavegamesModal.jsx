import React, { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton, Badge } from "../components/Controls";
import { DEFAULT_PROFILE } from "../theme";
import { formatSize, formatSizeStats, getStatusDisplay } from "../utils";

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
      {mod.required && <Badge background="#8b2f2f">requis</Badge>}
      {mod.hasObjects && (
        <Badge background="#a86b2a" title="Des véhicules ou bâtiments de ce mod sont dans la partie">
          objets dans la partie
        </Badge>
      )}
      <span style={{ marginLeft: "auto", opacity: 0.85 }}>
        {availability.type === "excluded-favorite" && "Favori exclu de ce profil"}
        {availability.type === "favorite" && "Dans les favoris : « Copier les favoris » le liera"}
        {availability.type === "other-profile" && `Présent dans le profil ${availability.profile}`}
        {availability.type === "none" && "Introuvable dans tes dossiers"}
      </span>
      {availability.type === "excluded-favorite" && (
        <ActionButton style={smallButton} onClick={() => onReintegrate(mod)}>
          Réintégrer
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
        <Badge background="#355c7d" title="Ajouté après la dernière sauvegarde : la partie ne l'a pas encore proposé">
          nouveau
        </Badge>
      )}
      {mod.usedBy.length > 0 && (
        <Badge background="#2f6b3a" title="Activé dans une autre partie qui utilise ce profil">
          utilisé par {mod.usedBy.join(", ")}
        </Badge>
      )}
      <span style={{ marginLeft: "auto", opacity: 0.7 }}>
        {mod.isDirectory ? "Dossier" : formatSize(mod.size)}
      </span>
      {isFavorite && canExclude ? (
        <ActionButton style={smallButton} onClick={() => onExclude([mod])}>
          Exclure
        </ActionButton>
      ) : !isFavorite ? (
        <ActionButton style={smallButton} variant="danger" onClick={() => onDelete(mod)}>
          Corbeille
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
      title={`Sauvegardes et mods du profil ${profile}`}
      width={900}
      scrollable
      actions={<ActionButton onClick={onClose}>Fermer</ActionButton>}
    >
      <div className="hint" style={{ marginBottom: "14px" }}>
        Compare les mods activés dans une partie (careerSavegame.xml) avec le dossier de ce profil.
      </div>

      {savegames === null ? (
        <div className="hint">Lecture des sauvegardes...</div>
      ) : savegames.length === 0 ? (
        <div className="hint">Aucune sauvegarde trouvée dans le dossier du jeu.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 2, minWidth: "320px" }}>
              <label className="field-label">Sauvegarde analysée</label>
              <select
                className="text-input"
                style={{ width: "100%" }}
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {linked.length > 0 && (
                  <optgroup label={`Associées au profil ${profile}`}>
                    {linked.map((s) => (
                      <option key={s.id} value={s.id}>{savegameLabel(s)}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Autres sauvegardes">
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
                <label className="field-label">Profil associé à cette sauvegarde</label>
                <select
                  className="text-input"
                  style={{ width: "100%" }}
                  value={selected.isManual ? (selected.profile || NO_ASSOCIATION) : AUTO_ASSOCIATION}
                  onChange={(e) => changeAssociation(e.target.value)}
                >
                  <option value={AUTO_ASSOCIATION}>
                    Automatique{selected.bestMatch && selected.bestMatch.coverage >= 80
                      ? ` (${selected.bestMatch.profile})`
                      : " (aucun)"}
                  </option>
                  <option value={NO_ASSOCIATION}>Aucun profil</option>
                  {[DEFAULT_PROFILE, ...profiles].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {linked.length === 0 && (
            <div className="hint" style={{ marginTop: "8px" }}>
              Aucune sauvegarde n'est associée à ce profil : choisis-en une, puis associe-la si besoin.
            </div>
          )}

          {error && <div style={{ marginTop: "16px", color: "#d9534f" }}>Erreur : {error}</div>}

          {!analysis && !error && <div className="hint" style={{ marginTop: "16px" }}>Analyse en cours...</div>}

          {analysis && (
            <>
              <div style={{ marginTop: "16px", fontSize: "13px", opacity: 0.85 }}>
                {analysis.savegame.modCount} mod(s) activé(s) dans la partie · {analysis.profileModCount} dans le profil
                {analysis.otherSavegames.length > 0 && ` · profil partagé avec : ${analysis.otherSavegames.join(", ")}`}
              </div>

              <h4 style={sectionTitle}>
                {analysis.missing.length === 0
                  ? "✅ Aucun mod manquant"
                  : `❌ ${analysis.missing.length} mod(s) manquant(s) dans le profil`}
              </h4>
              {analysis.missing.map((m) => (
                <MissingRow key={m.modName} mod={m} onReintegrate={onReintegrate} />
              ))}

              <h4 style={sectionTitle}>
                {analysis.unused.length === 0
                  ? "✅ Aucun mod inutilisé"
                  : `📦 ${analysis.unused.length} mod(s) du profil non activé(s) dans la partie (${formatSizeStats(unusedSize)})`}
              </h4>
              {analysis.unused.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <span className="hint">
                    Le jeu ne les charge pas pour cette partie. Les mods « nouveau » n'ont pas encore été proposés par le jeu.
                  </span>
                  {canExclude && removableFavorites.length > 0 && (
                    <ActionButton
                      style={{ ...smallButton, marginLeft: "auto", whiteSpace: "nowrap" }}
                      onClick={() => onExcludeFavorites(removableFavorites)}
                    >
                      Exclure les {removableFavorites.length} favori(s) inutilisé(s)
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
                    🔄 {analysis.versionMismatch.length} mod(s) dans une autre version que lors de la dernière sauvegarde
                  </h4>
                  {analysis.versionMismatch.map((m) => (
                    <div key={m.fileName} style={row}>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      <span style={{ marginLeft: "auto", opacity: 0.85 }}>
                        partie v{m.savedVersion} → installé v{m.installedVersion}
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
