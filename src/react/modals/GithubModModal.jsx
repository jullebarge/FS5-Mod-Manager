import React, { useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";

export function GithubModModal({ profile, onCancel, onSubmit }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [includePrereleases, setIncludePrereleases] = useState(false);

  return (
    <Modal
      title="Ajouter un mod GitHub"
      width={460}
      actions={
        <>
          <ActionButton onClick={onCancel}>Annuler</ActionButton>
          <ActionButton onClick={() => onSubmit(repoUrl, includePrereleases)}>
            Télécharger
          </ActionButton>
        </>
      }
    >
      <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "10px" }}>
        Le ZIP du mod sera téléchargé dans le profil sélectionné :{" "}
        <strong>{profile}</strong>
      </div>

      <input
        type="text"
        className="text-input"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="https://github.com/owner/repo"
        style={{ width: "100%", marginBottom: "14px" }}
      />

      <label className="checkbox-label" style={{ fontSize: "14px", marginBottom: "14px" }}>
        <input
          type="checkbox"
          checked={includePrereleases}
          onChange={(e) => setIncludePrereleases(e.target.checked)}
        />
        Inclure les pre-releases
      </label>

      <div className="hint" style={{ marginBottom: "16px" }}>
        Si cette option est décochée, seule la dernière release stable sera utilisée.
      </div>
    </Modal>
  );
}
