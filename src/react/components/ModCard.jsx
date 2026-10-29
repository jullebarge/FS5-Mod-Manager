import React, { memo } from "react";
import { Spinner } from "./Icons";
import { Badge } from "./Controls";
import { formatSize, getStatusDisplay } from "../utils";
import { t } from "../../locales/i18n";

// icon : undefined = en cours de chargement, null = pas d'icone
export const ModCard = memo(function ModCard({
  mod,
  icon,
  onCardClick
}) {
  const github = mod.github;
  const external = mod.external;
  const statusDisplay = getStatusDisplay(mod.status);

  return (
    <div
      className="mod-card"
      onClick={(e) => onCardClick(mod, e)}
      title={t("card.openActions")}
    >
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "rgba(0,0,0,0.6)",
          borderRadius: "6px",
          padding: "4px 6px",
          fontSize: "12px",
          color: statusDisplay.color,
          zIndex: 2,
          opacity: 0.9
        }}
        title={statusDisplay.tooltip}
      >
        {statusDisplay.icon}
      </div>

      {icon ? (
        <img
          src={icon}
          alt={mod.name}
          className="mod-card-image"
          loading="lazy"
          decoding="async"
          style={{ objectFit: "contain", display: "block" }}
        />
      ) : (
        <div
          className="mod-card-image"
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {icon === undefined ? (
            <Spinner size={32} />
          ) : (
            <span style={{ fontSize: "48px", opacity: 0.3 }}>🧩</span>
          )}
        </div>
      )}

      <div style={{ padding: "12px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px" }}>{mod.name}</div>
        <div className="mod-card-meta">v{mod.version}</div>
        <div className="mod-card-meta">{mod.author}</div>
        <div className="mod-card-meta">
          {mod.isDirectory ? t("card.folder") : formatSize(mod.size || 0)}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginTop: "8px"
          }}
        >
          {github?.tracked && (
            <Badge background="#444" title={t("card.githubTooltip")}>
              GitHub
            </Badge>
          )}

          {external?.tracked && (
            <Badge background="#355c7d" title={t("card.externalTooltip")}>
              {t("card.external")}
            </Badge>
          )}

          {github?.includePrereleases && (
            <Badge
              background="#5b3d1f"
              title={t("card.prereleaseTooltip")}
            >
              pre-release
            </Badge>
          )}

          {github?.lastError && (
            <Badge background="#8b2f2f" title={github.lastError}>
              {t("card.githubError")}
            </Badge>
          )}

          {github?.updateAvailable && !github?.lastError && (
            <Badge
              background="#a86b2a"
              title={t("card.updateAvailableTooltip")}
            >
              {t("card.updateAvailable")}
            </Badge>
          )}

          {mod.sharedWith?.length > 0 && (
            <Badge
              background="#2e6f73"
              title={t("card.sharedTooltip", { profiles: mod.sharedWith.join(", ") })}
            >
              {t("card.shared", { count: mod.sharedWith.length + 1 })}
            </Badge>
          )}

          {mod.missingDependencies?.length > 0 && (
            <Badge
              background="#8b2f2f"
              title={t("card.missingDependencyTooltip", { mods: mod.missingDependencies.map((d) => d.modName).join(", ") })}
            >
              {t("card.missingDependency")}
            </Badge>
          )}

          {mod.isDuplicateCopy && (
            <Badge
              background="#555"
              title={t("card.duplicateCopyTooltip")}
            >
              {t("card.duplicateCopy")}
            </Badge>
          )}

          {mod.isOutOfSync && (
            <Badge
              background={mod.syncDirection === "profile-newer" ? "#2f6b3a" : "#a86b2a"}
              title={t("card.favoriteVersionTooltip", { version: mod.defaultVersion || "?" })}
            >
              {mod.syncDirection === "profile-newer" ? t("card.newerThanFavorite") : t("card.outOfSync")}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});
