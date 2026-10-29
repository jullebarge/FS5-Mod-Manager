import React, { useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";

export function CreateProfileModal({ onCancel, onCreate }) {
  const [name, setName] = useState("");

  return (
    <Modal
      title="Créer un profil"
      width={340}
      actions={
        <>
          <ActionButton onClick={onCancel}>Annuler</ActionButton>
          <ActionButton onClick={() => onCreate(name)}>Valider</ActionButton>
        </>
      }
    >
      <input
        type="text"
        className="text-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du profil"
        style={{ width: "100%", marginBottom: "16px" }}
      />
    </Modal>
  );
}
