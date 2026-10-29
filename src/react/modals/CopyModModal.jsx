import React, { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { ActionButton } from "../components/Controls";
import { t } from "../../locales/i18n";

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
    .filter((target) => target.state === "different" && selected.includes(target.profile)).length;

  return (
    <Modal
      title={t("copyModal.title", { name: mod.name })}
      width={520}
      actions={
        <>
          <ActionButton onClick={onCancel}>{t("common.cancel")}</ActionButton>
          <ActionButton
            disabled={selected.length === 0}
            onClick={() => onCopy(selected, { replaceExisting: replaceCount > 0 })}
          >
            {t("copyModal.submit", { count: selected.length })}
          </ActionButton>
        </>
      }
    >
      <div className="hint" style={{ marginBottom: "14px" }}>
        {mod.isDirectory ? t("copyModal.hintFolder") : t("copyModal.hintZip")}
      </div>

      {targets === null ? (
        <div className="hint">{t("copyModal.loading")}</div>
      ) : targets.length === 0 ? (
        <div className="hint">{t("copyModal.noProfiles")}</div>
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
                {target.state === "same" && t("copyModal.alreadyPresent")}
                {target.state === "different" &&
                  (target.version
                    ? t("copyModal.otherVersionNumbered", { version: target.version })
                    : t("copyModal.otherVersion"))}
              </span>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
