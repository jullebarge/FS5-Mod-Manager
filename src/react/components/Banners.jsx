import React from "react";
import { ActionButton } from "./Controls";
import { t } from "../../locales/i18n";

const MAX_LISTED = 10;

// Mods presents dans le profil alors qu'ils sont dans sa liste d'exclusion
export function ConflictBanner({ mods }) {
  if (mods.length === 0) return null;

  return (
    <div className="warning-banner">
      <div style={{ fontWeight: 700, marginBottom: "6px" }}>
        {t("banners.conflicts", { count: mods.length })}
      </div>

      <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
        {mods.slice(0, MAX_LISTED).map((m) => m.name).join(", ")}
        {mods.length > MAX_LISTED && " ..."}
      </div>
    </div>
  );
}

// Dependances declarees par les mods du profil (modDesc.xml) mais absentes du dossier,
// regroupees par dependance, avec l'action adaptee a l'endroit ou elle se trouve
export function DependencyBanner({ mods, onResolve }) {
  const byDependency = new Map();

  for (const mod of mods) {
    for (const dependency of mod.missingDependencies || []) {
      const key = dependency.modName.toLowerCase();
      if (!byDependency.has(key)) {
        byDependency.set(key, { ...dependency, requiredBy: [] });
      }
      byDependency.get(key).requiredBy.push(mod.name);
    }
  }

  if (byDependency.size === 0) return null;

  const dependencies = [...byDependency.values()];
  const smallButton = { padding: "4px 10px", fontSize: "12px" };

  return (
    <div className="warning-banner">
      <div style={{ fontWeight: 700, marginBottom: "8px" }}>
        {t("banners.missingDependencies", { count: dependencies.length })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
        {dependencies.slice(0, MAX_LISTED).map((dependency) => {
          const { availability } = dependency;

          return (
            <div
              key={dependency.modName}
              style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
            >
              <span style={{ fontWeight: 600 }}>{dependency.modName}</span>
              <span style={{ opacity: 0.85 }}>{t("banners.requiredBy", { mods: dependency.requiredBy.join(", ") })}</span>

              {availability.type === "excluded-favorite" && (
                <ActionButton style={smallButton} onClick={() => onResolve(dependency)}>
                  {t("banners.reintegrateFavorite")}
                </ActionButton>
              )}
              {availability.type === "favorite" && (
                <ActionButton style={smallButton} onClick={() => onResolve(dependency)}>
                  {t("banners.linkFavorite")}
                </ActionButton>
              )}
              {availability.type === "other-profile" && (
                <ActionButton style={smallButton} onClick={() => onResolve(dependency)}>
                  {t("banners.copyFrom", { profile: availability.profile })}
                </ActionButton>
              )}
              {availability.type === "none" && (
                <span style={{ opacity: 0.85 }}>{t("banners.dependencyNotFound")}</span>
              )}
            </div>
          );
        })}
        {dependencies.length > MAX_LISTED && <div>...</div>}
      </div>
    </div>
  );
}

// Favoris dont la copie du profil n'est plus le fichier de Default : deux sens de correction,
// le bouton recommande (version la plus recente) est mis en avant
export function OutOfSyncBanner({ mods, onPromote, onRelink }) {
  if (mods.length === 0) return null;

  const smallButton = { padding: "4px 10px", fontSize: "12px" };

  return (
    <div className="warning-banner">
      <div style={{ fontWeight: 700, marginBottom: "8px" }}>
        {t("banners.outOfSync", { count: mods.length })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
        {mods.slice(0, MAX_LISTED).map((m) => {
          const profileNewer = m.syncDirection === "profile-newer";

          return (
            <div
              key={m.fileName}
              style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
            >
              <span style={{ fontWeight: 600 }}>{m.name}</span>
              <span style={{ opacity: 0.85 }}>
                {t("banners.versions", { profileVersion: m.version, favoriteVersion: m.defaultVersion || "?" })}
                {profileNewer ? ` ${t("banners.profileNewer")}` : ""}
              </span>
              <ActionButton
                onClick={() => onPromote(m)}
                title={t("banners.keepProfileTooltip")}
                variant={profileNewer ? undefined : "muted"}
                style={smallButton}
              >
                ⬆ {t("banners.keepProfile")}
              </ActionButton>
              <ActionButton
                onClick={() => onRelink(m)}
                title={t("banners.useFavoriteTooltip")}
                variant={profileNewer ? "muted" : undefined}
                style={smallButton}
              >
                ⬇ {t("banners.useFavorite")}
              </ActionButton>
            </div>
          );
        })}
        {mods.length > MAX_LISTED && <div>...</div>}
      </div>
    </div>
  );
}
