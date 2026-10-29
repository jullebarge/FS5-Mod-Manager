import React, { memo } from "react";
import { Spinner } from "./Icons";
import { Badge } from "./Controls";
import { formatSize, getStatusDisplay } from "../utils";

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
      title="Cliquer pour ouvrir les actions"
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
          {mod.isDirectory ? "Dossier" : formatSize(mod.size || 0)}
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
            <Badge background="#444" title="Mod suivi via GitHub">
              GitHub
            </Badge>
          )}

          {external?.tracked && (
            <Badge background="#355c7d" title="Mod externe suivi">
              Externe
            </Badge>
          )}

          {github?.includePrereleases && (
            <Badge
              background="#5b3d1f"
              title="Le suivi utilise aussi les pre-releases"
            >
              pre-release
            </Badge>
          )}

          {github?.lastError && (
            <Badge background="#8b2f2f" title={github.lastError}>
              Erreur GitHub
            </Badge>
          )}

          {github?.updateAvailable && !github?.lastError && (
            <Badge
              background="#a86b2a"
              title="Une mise à jour GitHub est disponible"
            >
              MAJ dispo
            </Badge>
          )}

          {mod.missingDependencies?.length > 0 && (
            <Badge
              background="#8b2f2f"
              title={`Mods requis absents de ce profil : ${mod.missingDependencies.map((d) => d.modName).join(", ")}`}
            >
              Dépendance manquante
            </Badge>
          )}

          {mod.isDuplicateCopy && (
            <Badge
              background="#555"
              title="Fichier identique au favori, mais copié au lieu d'être lié : « Copier les favoris » le remplace par un lien et libère la place"
            >
              Copie
            </Badge>
          )}

          {mod.isOutOfSync && (
            <Badge
              background={mod.syncDirection === "profile-newer" ? "#2f6b3a" : "#a86b2a"}
              title={`Version des favoris : v${mod.defaultVersion || "?"}`}
            >
              {mod.syncDirection === "profile-newer" ? "Plus récent que le favori" : "Désynchro"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});
