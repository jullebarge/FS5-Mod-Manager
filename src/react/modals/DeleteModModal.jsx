import React, { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";

// Dans Default, un mod peut etre un favori lie dans d'autres profils : on propose de l'y retirer aussi
export function DeleteModModal({ mod, isDefaultProfile, onCancel, onConfirm }) {
  const needsUsage = isDefaultProfile && !mod.isDirectory;
  const [usage, setUsage] = useState(null);
  const [removeFromProfiles, setRemoveFromProfiles] = useState(true);

  useEffect(() => {
    if (!needsUsage) return;

    let cancelled = false;
    window.fs25.getFavoriteUsage(mod.fileName).then((result) => {
      if (!cancelled) setUsage(result);
    });

    return () => {
      cancelled = true;
    };
  }, [mod.fileName, needsUsage]);

  const isLinkedElsewhere = !!usage && usage.linked.length > 0;

  return (
    <Modal
      title={`Supprimer ${mod.name} ?`}
      width={460}
      actions={
        <>
          <ActionButton onClick={onCancel}>Annuler</ActionButton>
          <ActionButton
            disabled={needsUsage && !usage}
            onClick={() => onConfirm({ removeFromProfiles: isLinkedElsewhere && removeFromProfiles })}
            variant="danger"
          >
            Supprimer
          </ActionButton>
        </>
      }
    >
      <div style={{ fontSize: "13px", opacity: 0.85, lineHeight: "1.5", marginBottom: "16px" }}>
        {mod.isDirectory ? "Le dossier" : "Le fichier"}{" "}
        <strong>{mod.fileName}</strong> sera déplacé dans la corbeille de Windows.
      </div>

      {mod.status === "common-linked" && (
        <div className="hint" style={{ marginBottom: "16px" }}>
          Le mod reste dans les favoris (Default) et reviendra à la prochaine copie des
          favoris. Pour le retirer durablement de ce profil, utilise plutôt « Exclure du profil ».
        </div>
      )}

      {needsUsage && !usage && (
        <div className="hint" style={{ marginBottom: "16px" }}>
          Recherche des profils qui utilisent ce favori...
        </div>
      )}

      {isLinkedElsewhere && (
        <div style={{ fontSize: "13px", lineHeight: "1.4", marginBottom: "16px" }}>
          <div style={{ marginBottom: "8px" }}>
            Ce favori est lié dans {usage.linked.length} profil(s) :{" "}
            <strong>{usage.linked.join(", ")}</strong>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={removeFromProfiles}
              onChange={(e) => setRemoveFromProfiles(e.target.checked)}
            />
            Le retirer aussi de ces profils
          </label>
        </div>
      )}

      {usage && usage.linked.length === 0 && (
        <div className="hint" style={{ marginBottom: "16px" }}>
          Aucun profil n'utilise ce mod comme favori.
        </div>
      )}
    </Modal>
  );
}
