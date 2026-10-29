import React, { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";

// Copie d'un mod local vers d'autres profils, sans en faire un favori
export function CopyModModal({ mod, profile, onCancel, onCopy }) {
  const [targets, setTargets] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    let cancelled = false;

    window.fs25.getCopyTargets(profile, mod.fileName).then((list) => {
      if (!cancelled) setTargets(list);
    });

    return () => {
      cancelled = true;
    };
  }, [profile, mod.fileName]);

  function toggle(targetProfile) {
    setSelected((prev) =>
      prev.includes(targetProfile)
        ? prev.filter((p) => p !== targetProfile)
        : [...prev, targetProfile]
    );
  }

  const replaceCount = (targets || [])
    .filter((t) => t.state === "different" && selected.includes(t.profile)).length;

  return (
    <Modal
      title={`Copier ${mod.name} vers d'autres profils`}
      width={520}
      actions={
        <>
          <ActionButton onClick={onCancel}>Annuler</ActionButton>
          <ActionButton
            disabled={selected.length === 0}
            onClick={() => onCopy(selected, { replaceExisting: replaceCount > 0 })}
          >
            Copier vers {selected.length} profil(s)
          </ActionButton>
        </>
      }
    >
      <div className="hint" style={{ marginBottom: "14px" }}>
        {mod.isDirectory ? "Le dossier du mod" : "Le zip du mod"} sera copié dans chaque profil coché :
        une copie indépendante, qui reste un mod local de ce profil.
      </div>

      {targets === null ? (
        <div className="hint">Lecture des profils...</div>
      ) : targets.length === 0 ? (
        <div className="hint">Aucun autre profil.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {targets.map((target) => (
            <label
              key={target.profile}
              className="checkbox-label"
              style={{ fontSize: "14px", opacity: target.state === "same" ? 0.6 : 1 }}
            >
              <input
                type="checkbox"
                disabled={target.state === "same"}
                checked={target.state === "same" || selected.includes(target.profile)}
                onChange={() => toggle(target.profile)}
              />
              <span style={{ fontWeight: 600 }}>{target.profile}</span>
              <span className="hint">
                {target.state === "same" && "déjà présent (fichier identique)"}
                {target.state === "different" &&
                  `une autre version est présente${target.version ? ` (v${target.version})` : ""} : elle sera remplacée (corbeille)`}
              </span>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
