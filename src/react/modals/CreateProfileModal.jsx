import React, { useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";
import { t } from "../../locales/i18n";

export function CreateProfileModal({ onCancel, onCreate }) {
  const [name, setName] = useState("");

  return (
    <Modal
      title={t("createProfile.title")}
      width={340}
      actions={
        <>
          <ActionButton onClick={onCancel}>{t("common.cancel")}</ActionButton>
          <ActionButton onClick={() => onCreate(name)}>{t("common.confirm")}</ActionButton>
        </>
      }
    >
      <input
        type="text"
        className="text-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("createProfile.placeholder")}
        style={{ width: "100%", marginBottom: "16px" }}
      />
    </Modal>
  );
}
