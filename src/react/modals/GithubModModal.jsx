import React, { useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";
import { t } from "../../locales/i18n";

export function GithubModModal({ profile, onCancel, onSubmit }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [includePrereleases, setIncludePrereleases] = useState(false);

  return (
    <Modal
      title={t("githubModal.title")}
      width={460}
      actions={
        <>
          <ActionButton onClick={onCancel}>{t("common.cancel")}</ActionButton>
          <ActionButton onClick={() => onSubmit(repoUrl, includePrereleases)}>
            {t("githubModal.download")}
          </ActionButton>
        </>
      }
    >
      <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "10px" }}>
        {t("githubModal.target")}{" "}
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
        {t("githubModal.includePrereleases")}
      </label>

      <div className="hint" style={{ marginBottom: "16px" }}>
        {t("githubModal.prereleasesHint")}
      </div>
    </Modal>
  );
}
