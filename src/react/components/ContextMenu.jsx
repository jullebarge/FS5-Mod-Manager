import React, { useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_PROFILE } from "../theme";

function MenuItem({ children, onClick }) {
  return (
    <div className="menu-item" onClick={onClick}>
      {children}
    </div>
  );
}

export function ContextMenu({
  menu,
  onClose,
  onPromote,
  onDelete,
  onToggleExcluded,
  onOpenGithubRepo,
  onUpdateGithubMod,
  onOpenExternalUrl,
  onOpenModZip,
  onPromoteProfileVersion,
  onRelinkFavorite,
  onCopyToProfiles
}) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  // une fois le menu mesure, on le recale pour qu'il reste entierement dans la fenetre
  useLayoutEffect(() => {
    if (!menu || !menuRef.current) {
      setPosition(null);
      return;
    }

    const margin = 8;
    const rect = menuRef.current.getBoundingClientRect();
    setPosition({
      left: Math.max(margin, Math.min(menu.x, window.innerWidth - rect.width - margin)),
      top: Math.max(margin, Math.min(menu.y, window.innerHeight - rect.height - margin))
    });
  }, [menu]);

  if (!menu) return null;

  const { x, y, mod, selectedProfile } = menu;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998
        }}
      />

      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: position ? position.top : y,
          left: position ? position.left : x,
          visibility: position ? "visible" : "hidden",
          background: "#2a2a2a",
          borderRadius: "8px",
          padding: "6px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          zIndex: 9999,
          minWidth: "230px"
        }}
      >
        {mod.status === "local" && selectedProfile !== DEFAULT_PROFILE && (
          <MenuItem
            onClick={() => {
              onPromote(mod);
              onClose();
            }}
          >
            📦 Passer en favori
          </MenuItem>
        )}

        {(mod.status === "local" || mod.status === "directory") && selectedProfile !== DEFAULT_PROFILE && (
          <MenuItem
            onClick={() => {
              onCopyToProfiles(mod);
              onClose();
            }}
          >
            📋 Copier vers un autre profil
          </MenuItem>
        )}

        {mod.status === "common-linked" && (
          <MenuItem
            onClick={() => {
              onToggleExcluded(mod);
              onClose();
            }}
          >
            🚫 Exclure du profil
          </MenuItem>
        )}

        {mod.status === "common-excluded" && (
          <MenuItem
            onClick={() => {
              onToggleExcluded(mod);
              onClose();
            }}
          >
            ✅ Réintégrer dans le profil
          </MenuItem>
        )}

        {mod.status === "common-linked" && mod.isOutOfSync && (
          <>
            <MenuItem
              onClick={() => {
                onPromoteProfileVersion(mod);
                onClose();
              }}
            >
              ⬆ Garder cette version (remonter dans les favoris)
            </MenuItem>
            <MenuItem
              onClick={() => {
                onRelinkFavorite(mod);
                onClose();
              }}
            >
              ⬇ Reprendre la version des favoris
            </MenuItem>
          </>
        )}

        {mod.github?.repoUrl && (
          <MenuItem
            onClick={() => {
              onOpenGithubRepo(mod);
              onClose();
            }}
          >
            🔗 Ouvrir le lien GitHub
          </MenuItem>
        )}

        {mod.github?.updateAvailable && (
          <MenuItem
            onClick={() => {
              onUpdateGithubMod(mod);
              onClose();
            }}
          >
            ⬆ Mettre à jour depuis GitHub
          </MenuItem>
        )}

        {mod.external?.url && (
          <MenuItem
            onClick={() => {
              onOpenExternalUrl(mod.external.url);
              onClose();
            }}
          >
            🌍 Ouvrir le lien externe
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            onOpenModZip(mod);
            onClose();
          }}
        >
          {mod.isDirectory ? "📁 Ouvrir le dossier" : "🗜 Ouvrir le zip"}
        </MenuItem>

        {(mod.status === "local" || mod.status === "common-linked" || mod.status === "directory") && (
          <MenuItem
            onClick={() => {
              onDelete(mod);
              onClose();
            }}
          >
            🗑 Supprimer
          </MenuItem>
        )}
      </div>
    </>
  );
}
