import React, { useEffect, useRef, useState } from "react";

const colors = {
  bg: "#222222",
  panel: "#2b2b2b",
  panel2: "#303030",
  text: "#ffffff",
  button: "#A8B655",
  buttonText: "#222222",
  border: "#3a3a3a"
};

const PLAYNITE_URL = "playnite://playnite/start/11dd1871-0174-46f5-a27d-ef5d1095f121";

function Spinner({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      aria-label="Chargement"
      role="img"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="4"
      />
      <path
        d="M25 5 a20 20 0 0 1 20 20"
        fill="none"
        stroke="#A8B655"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 25 25"
          to="360 25 25"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

function GitHubIcon({ size = 20, opacity = 0.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ display: "block", opacity }}
    >
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.67 0 8.2c0 3.63 2.29 6.71 5.47 7.8.4.08.55-.18.55-.39 0-.19-.01-.82-.01-1.49-2.01.38-2.53-.5-2.69-.96-.09-.24-.48-.96-.82-1.15-.28-.15-.68-.53-.01-.54.63-.01 1.08.59 1.23.84.72 1.24 1.87.89 2.33.68.07-.54.28-.89.51-1.1-1.78-.21-3.64-.92-3.64-4.08 0-.9.31-1.64.82-2.22-.08-.21-.36-1.05.08-2.19 0 0 .67-.22 2.2.85.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.07 2.2-.85 2.2-.85.44 1.14.16 1.98.08 2.19.51.58.82 1.32.82 2.22 0 3.17-1.87 3.87-3.65 4.08.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.47.55.39A8.23 8.23 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z"
      />
    </svg>
  );
}

function StatCard({ label, value, icon, onClick, active, disabled }) {
	return (
	  <div
		onClick={disabled ? undefined : onClick}
		style={{
		  background: active ? "#3a3a3a" : colors.panel2,
		  border: active ? "1px solid #A8B655" : `1px solid ${colors.border}`,
		  borderRadius: "10px",
		  padding: "16px",
		  minWidth: "160px",
		  cursor: disabled ? "default" : onClick ? "pointer" : "default",
		  opacity: disabled ? 0.4 : 1,
		  transition: "all 0.2s"
		}}
	  >
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
		  <div>
			<div style={{ fontSize: "13px", opacity: 0.8 }}>{label}</div>
			<div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
		  </div>

          {icon && (
            <div
              style={{
                fontSize: "20px",
                opacity: 0.85,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff"
              }}
            >
              {icon}
            </div>
          )}
		</div>
	  </div>
	);
}

function ActionButton({ children, onClick, style = {}, disabled = false, title }) {
  const baseStyle = {
    background: colors.button,
    color: colors.buttonText,
    border: "none",
    fontWeight: 700,
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.2s"
  };

  const disabledStyle = disabled
    ? {
        background: "#555",
        color: "#aaa",
        opacity: 0.6,
        cursor: "not-allowed"
      }
    : {};

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
	  title={title}
      style={{
        ...baseStyle,
        ...style,
        ...disabledStyle
      }}
    >
      {children}
    </button>
  );
}

function Badge({
  children,
  background,
  color = "#fff",
  title,
  onClick,
  disabled = false
}) {
  const clickable = typeof onClick === "function" && !disabled;

  return (
    <span
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        if (clickable) onClick();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        background,
        color,
        cursor: clickable ? "pointer" : "default",
        opacity: disabled ? 0.55 : 1,
        userSelect: "none"
      }}
    >
      {children}
    </span>
  );
}

function getStatusIcon(status) {
  switch (status) {
    case "common-linked":
      return "⭐";
    case "common-excluded":
      return "🚫";
    case "local":
      return "📦";
    default:
      return "❓";
  }
}

function getStatusTooltip(status) {
  switch (status) {
    case "common-linked":
      return "Mod favori lié";
    case "common-excluded":
      return "Mod favori exclu";
    case "local":
      return "Mod local";
    default:
      return "Statut inconnu";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "common-linked":
      return "#A8B655";
    case "common-excluded":
      return "#d9534f";
    case "local":
      return "#cccccc";
    default:
      return "#999999";
  }
}

function formatSizeStats(bytes) {
  const mb = bytes / (1024 * 1024);

  if (mb >= 1024) {
    const gb = mb / 1024;
    return gb.toLocaleString("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + " Go";
  }

  return mb.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }) + " Mo";
}

function formatSize(bytes) {
  if (!bytes) return "0 o";

  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  console.log(bytes);

  if (bytes >= gb) {
    return bytes.toLocaleString("fr-FR", {
      style: "unit",
      unit: "gigabyte",
      unitDisplay: "narrow",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  if (bytes >= mb) {
    return (bytes / mb).toLocaleString("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + " Mo";
  }

  if (bytes >= kb) {
    return (bytes / kb).toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) + " Ko";
  }

  return bytes.toLocaleString("fr-FR") + " o";
}

function Toast({ toast }) {
  const { text, type } = toast;

  let borderColor = "#A8B655";
  if (type === "error") borderColor = "#d9534f";

  return (
    <div
      style={{
        background: "#2a2a2a",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: "8px",
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        fontSize: "14px",
        minWidth: "250px",
        opacity: 0,
        transform: "translateY(20px) scale(0.95)",
        animation: "toastAnim 0.3s ease forwards"
      }}
    >
      {text}
    </div>
  );
}

function MenuItem({ children, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#3a3a3a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </div>
  );
}

function ContextMenu({
  menu,
  onClose,
  onPromote,
  onDelete,
  onToggleExcluded,
  onOpenGithubRepo,
  onUpdateGithubMod,
  onOpenExternalUrl,
  onOpenModZip
}) {
  if (!menu) return null;

  const { x, y, mod, selectedProfile  } = menu;

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
        style={{
          position: "fixed",
          top: y,
          left: x,
          background: "#2a2a2a",
          borderRadius: "8px",
          padding: "6px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          zIndex: 9999,
          minWidth: "230px"
        }}
      >
        {mod.status === "local" && selectedProfile !== "Default" && (
          <MenuItem
            onClick={() => {
              onPromote(mod);
              onClose();
            }}
          >
            📦 Passer en favori
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
          🗜 Ouvrir le zip
        </MenuItem>

        {(mod.status === "local" || mod.status === "common-linked") && (
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

function ModCard({
  mod,
  selectedProfile,
  onCardClick
}) {
  const [hover, setHover] = useState(false);
  const github = mod.github;
  const external = mod.external;

  return (
    <div
      style={{
        background: "#2b2b2b",
        border: hover ? "1px solid #A8B655" : "1px solid #3a3a3a",
        borderRadius: "12px",
        width: "220px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hover ? "scale(1.03)" : "scale(1)",
        boxShadow: hover ? "0 0 10px rgba(168,182,85,0.3)" : "none",
        position: "relative"
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
          color: getStatusColor(mod.status),
          zIndex: 2,
          opacity: 0.9
        }}
        title={getStatusTooltip(mod.status)}
      >
        {getStatusIcon(mod.status)}
      </div>

      {mod.icon ? (
        <img
          src={mod.icon}
          alt={mod.name}
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            objectFit: "contain",
            background: "#1a1a1a",
            display: "block"
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            background: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Spinner size={32} />
        </div>
      )}

      <div style={{ padding: "12px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px" }}>{mod.name}</div>
        <div style={{ fontSize: "12px", opacity: 0.7 }}>v{mod.version}</div>
        <div style={{ fontSize: "12px", opacity: 0.7 }}>{mod.author}</div>
        <div style={{ fontSize: "12px", opacity: 0.7 }}>
          {formatSize(mod.size || 0)}
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
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState("Default");
  const [selectedProfile, setSelectedProfile] = useState("Default");
  const [mods, setMods] = useState([]);
  const [defaultMods, setDefaultMods] = useState([]);
  const [excludedMods, setExcludedMods] = useState([]);
  const [loadingMods, setLoadingMods] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [filter, setFilter] = useState("all");
  const [contextMenu, setContextMenu] = useState(null);
  const [search, setSearch] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [githubIncludePrereleases, setGithubIncludePrereleases] = useState(false);
  const [githubUpdatingKey, setGithubUpdatingKey] = useState(null);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalZipPath, setExternalZipPath] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  
  const requestIdRef = useRef(0);

  function showToast(text, type = "info") {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, text, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  async function refreshProfileData(profile, requestId) {
    const list = await window.fs25.getMods(profile);
    const excluded = await window.fs25.getExcludedMods(profile);

    let defaultList = [];
    if (profile !== "Default") {
      defaultList = await window.fs25.getMods("Default");
    }

    if (requestId !== requestIdRef.current) return;

    setMods(list);
    setExcludedMods(excluded);
    setDefaultMods(defaultList);
    setLoadingMods(false);

    let modsToLoadIcons = [...list];

    if (filter === "excluded") {
      modsToLoadIcons.push(...defaultList);
    }

    modsToLoadIcons = modsToLoadIcons.filter(
      (mod, index, self) =>
        index === self.findIndex((m) => m.fileName === mod.fileName)
    );

    for (const mod of modsToLoadIcons) {
      if (requestId !== requestIdRef.current) return;
      if (mod.icon) continue;

      const icon = await window.fs25.getModIcon(mod);

      if (requestId !== requestIdRef.current) return;

      if (icon) {
        setMods((prev) =>
          prev.map((m) => (m.fileName === mod.fileName ? { ...m, icon } : m))
        );

        setDefaultMods((prev) =>
          prev.map((m) => (m.fileName === mod.fileName ? { ...m, icon } : m))
        );
      }
    }
  }

  useEffect(() => {
    async function init() {
      const p = await window.fs25.getProfiles();
      const active = await window.fs25.getActiveProfile();

      setProfiles(p);
      setActiveProfile(active);
      setSelectedProfile(active);
      setIsInitialized(true);
    }

    init();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);

    refreshProfileData(selectedProfile, requestId).catch((err) => {
      if (requestId === requestIdRef.current) {
        console.error("Erreur refreshProfileData:", err);
        setLoadingMods(false);
      }
    });
  }, [selectedProfile, isInitialized, filter]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
	  async function loadVersion() {
		const v = await window.fs25.getAppVersion();
		setAppVersion(v);
	  }
	  loadVersion();
	}, []);

  async function handleChangeProfile() {
    const result = await window.fs25.setActiveProfile(selectedProfile);

    if (result.success) {
      setActiveProfile(selectedProfile);
      showToast(`Profil actif mis à jour : ${selectedProfile}`);
    } else {
      showToast(`Erreur : ${result.error}`, "error");
    }
  }

  async function handleCreateProfile() {
    const cleanName = newProfileName.trim();
    if (!cleanName) return;

    const result = await window.fs25.createProfile(cleanName);

    if (result.success) {
      const updated = await window.fs25.getProfiles();
      setProfiles(updated);
      setSelectedProfile(cleanName);
      setShowCreateModal(false);
      setNewProfileName("");
      showToast(`Profil créé : ${cleanName}`);
    } else {
      showToast(`Erreur : ${result.error}`, "error");
    }
  }

  async function handleRepairLinks() {
    if (selectedProfile === "Default") return;

    showToast("Copie des mods favoris en cours...");

    const result = await window.fs25.repairLinks(selectedProfile);

    if (result.success) {
      showToast(
        `${result.linkedCount} favori(s) copiés, ${result.skippedExcluded} exclus ignorés, ${result.removedDuplicates} doublon(s) remplacé(s)`
      );

      setFilter("all");
      const requestId = ++requestIdRef.current;
      setLoadingMods(true);
      await refreshProfileData(selectedProfile, requestId);
    } else {
      showToast(`Erreur : ${result.error}`, "error");
    }
  }

  async function handleRemoveLinks() {
    if (selectedProfile === "Default") return;

    showToast("Suppression des mods favoris en cours...");

    const result = await window.fs25.removeLinks(selectedProfile);

    if (result.success) {
      showToast(`${result.removedCount} mod(s) favori(s) supprimé(s)`);
      setFilter("all");
      const requestId = ++requestIdRef.current;
      setLoadingMods(true);
      await refreshProfileData(selectedProfile, requestId);
    } else {
      showToast(`Erreur : ${result.error}`, "error");
    }
  }

  async function handleOpenProfileFolder() {
    const result = await window.fs25.openProfileFolder(selectedProfile);

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
    }
  }

  async function handleToggleExcluded(mod) {
    if (selectedProfile === "Default") return;
    if (mod.status === "local") return;

    const result = await window.fs25.toggleExcludedMod(
      selectedProfile,
      mod.fileName
    );

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
      return;
    }

    showToast(
      result.excluded
        ? `${mod.name} exclu du profil`
        : `${mod.name} réintégré dans le profil`
    );

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);
    await refreshProfileData(selectedProfile, requestId);
  }

  async function handleRefreshProfile() {
    showToast("Rafraîchissement en cours...");

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);
    await refreshProfileData(selectedProfile, requestId);

    showToast(`Profil ${selectedProfile} rafraîchi`);
  }

  async function handlePromoteToCommon(mod) {
    if (mod.status !== "local") return;

    const result = await window.fs25.promoteToCommon(
      selectedProfile,
      mod.fileName
    );

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
      return;
    }

    showToast(`${mod.name} ajouté aux mods favoris`, "success");

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);
    await refreshProfileData(selectedProfile, requestId);
  }

  async function handleDeleteLocalMod(mod) {
    const result = await window.fs25.deleteLocalMod(
      selectedProfile,
      mod.fileName
    );

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
      return;
    }

    showToast(`${mod.name} supprimé`, "success");

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);
    await refreshProfileData(selectedProfile, requestId);
  }

	function handleCardClick(mod, event) {
	  setContextMenu({
		mod,
		selectedProfile,
		x: event.clientX,
		y: event.clientY
	  });
	}

  async function handleAddGithubMod() {
    const cleanUrl = githubRepoUrl.trim();

    if (!cleanUrl) {
      showToast("Merci de saisir une URL GitHub", "error");
      return;
    }

    showToast("Téléchargement du mod GitHub en cours...");

    const result = await window.fs25.addGithubMod(
      selectedProfile,
      cleanUrl,
      githubIncludePrereleases
    );

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
      return;
    }

    showToast(`${result.fileName} téléchargé depuis ${result.repo}`);

    setShowGithubModal(false);
    setGithubRepoUrl("");
    setGithubIncludePrereleases(false);

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);
    await refreshProfileData(selectedProfile, requestId);
  }

  async function handleCheckGithubUpdates() {
    showToast("Vérification des mises à jour GitHub en cours...");

    const result = await window.fs25.checkGithubUpdates(selectedProfile);

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
      return;
    }

    if (result.checkedCount === 0) {
      showToast("Aucun mod GitHub suivi sur ce profil");
    } else if (result.updateCount > 0) {
      showToast(
        `${result.updateCount} mise(s) à jour disponible(s) sur ${result.checkedCount} mod(s) vérifié(s)`
      );
    } else {
      showToast(`Aucune mise à jour trouvée sur ${result.checkedCount} mod(s)`);
    }

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);
    await refreshProfileData(selectedProfile, requestId);
  }

  async function handleOpenGithubRepo(mod) {
    if (!mod.github?.repoUrl) return;

    const result = await window.fs25.openGithubRepo(mod.github.repoUrl);

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
    }
  }

  async function handleUpdateGithubMod(mod) {
    if (!mod.github?.tracked || !mod.github?.updateAvailable) return;

    const updateKey = `${selectedProfile}::${mod.fileName}`;
    setGithubUpdatingKey(updateKey);

    showToast(`Mise à jour de ${mod.name} en cours...`);

    const result = await window.fs25.updateGithubMod(selectedProfile, mod.fileName);

    setGithubUpdatingKey(null);

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
      return;
    }

    if (result.targetProfile === "Default" && selectedProfile !== "Default") {
      showToast(`${mod.name} mis à jour dans les favoris (Default)`, "success");
    } else {
      showToast(`${mod.name} mis à jour`, "success");
    }

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);
    await refreshProfileData(selectedProfile, requestId);
  }
  
  async function handleLaunchGame() {
    const result = await window.fs25.launchGame(PLAYNITE_URL);

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
    }
  }

  async function handlePickExternalZip() {
    const result = await window.fs25.pickExternalZip();

    if (!result.success) {
      if (!result.canceled) {
        showToast(`Erreur : ${result.error}`, "error");
      }
      return;
    }

    setExternalZipPath(result.filePath);
  }

  async function handleAddExternalMod() {
    const zipPath = externalZipPath.trim();
    const url = externalUrl.trim();

    if (!zipPath) {
      showToast("Merci de sélectionner un fichier ZIP", "error");
      return;
    }

    if (!url) {
      showToast("Merci de saisir une URL", "error");
      return;
    }

    const result = await window.fs25.addExternalMod(selectedProfile, zipPath, url);

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
      return;
    }

    showToast(`${result.fileName} ajouté comme mod externe`, "success");

    setShowExternalModal(false);
    setExternalZipPath("");
    setExternalUrl("");

    const requestId = ++requestIdRef.current;
    setLoadingMods(true);
    await refreshProfileData(selectedProfile, requestId);
  }

  async function handleOpenExternalUrl(url) {
    const result = await window.fs25.openExternalUrl(url);

    if (!result.success) {
      showToast(`Erreur : ${result.error}`, "error");
    }
  }

  async function handleOpenModZip(mod) {
  const targetProfile =
    mod.status === "common-linked" || mod.status === "common-excluded"
      ? "Default"
      : selectedProfile;

  const result = await window.fs25.openModZip(targetProfile, mod.fileName);

  if (!result.success) {
    showToast(`Erreur : ${result.error}`, "error");
  }
}
  
  const hasPendingChange = selectedProfile !== activeProfile;
  const isDefaultProfile = selectedProfile === "Default";

  const totalMods = mods.length;
  const commonMods = mods.filter((m) => m.status === "common-linked").length;
  const localMods = mods.filter((m) => m.status === "local").length;
  const excludedCount = excludedMods.length;
  const githubTrackedCount = mods.filter((m) => m.github?.tracked).length;
  const hasGithubTrackedMods = githubTrackedCount > 0;
  const githubUpdatesCount = mods.filter((m) => m.github?.updateAvailable).length;
  const externalModsCount = mods.filter((m) => m.external?.tracked).length

  const totalSize = mods
    .filter((m) => m.status === "local")
    .reduce((sum, m) => sum + (m.size || 0), 0);

  const presentInProfile = new Set(mods.map((m) => m.fileName));
  const conflictingMods = mods.filter((m) => excludedMods.includes(m.fileName));

  let displayedMods = mods;

  if (!isDefaultProfile) {
    if (filter === "common") {
      displayedMods = mods.filter((m) => m.status === "common-linked");
    }

    if (filter === "local") {
      displayedMods = mods.filter((m) => m.status === "local");
    }

    if (filter === "excluded") {
      displayedMods = defaultMods
        .filter((m) => excludedMods.includes(m.fileName))
        .filter((m) => !presentInProfile.has(m.fileName))
        .map((m) => ({
          ...m,
          status: "common-excluded"
        }));
    }
  }
   
   if (filter === "githubTracked") {
    displayedMods = mods.filter((m) => m.github?.tracked);
  }

  if (filter === "external") {
    displayedMods = mods.filter((m) => m.external?.tracked);
  }
  
	if (search.trim()) {
	  const s = search.toLowerCase();

	  displayedMods = displayedMods.filter(
		(m) =>
		  m.name.toLowerCase().includes(s) ||
		  m.fileName.toLowerCase().includes(s)
	  );
	}

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: colors.bg,
        color: colors.text,
        fontFamily: "Segoe UI, sans-serif"
      }}
    >
      <div
        style={{
          padding: "24px",
          borderBottom: "1px solid #3a3a3a",
          flexShrink: 0
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: "24px",
            marginBottom: "20px"
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "28px" }}>FS25 Mod Manager</h1>
            <div style={{ marginTop: "6px", opacity: 0.85 }}>
              Profil actif : <strong>{activeProfile}</strong>
            </div>
          </div>

          <div style={{ minWidth: "280px" }}>
            <label
              htmlFor="profile-select"
              style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}
            >
              Profil sélectionné
            </label>
            <select
              id="profile-select"
              value={selectedProfile}
              onChange={(e) => {
                setSelectedProfile(e.target.value);
                setFilter("all");
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${colors.border}`,
                background: colors.panel,
                color: colors.text,
                fontSize: "14px"
              }}
            >
              <option value="Default">Default</option>
              {profiles.map((profile) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>

            {hasPendingChange && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: "#cccccc"
                }}
              >
                Changement non appliqué
              </div>
            )}
          </div>
        </div>

		<div
		  style={{
			display: "flex",
			flexDirection: "column",
			gap: "12px",
			marginBottom: "20px"
		  }}
		>
		  {/* Ligne 1 */}
		  <div
			style={{
			  display: "flex",
			  gap: "12px",
			  flexWrap: "wrap",
			  alignItems: "center"
			}}
		  >
			<ActionButton
			  onClick={handleChangeProfile}
			  disabled={!hasPendingChange}
			>
			  Changer de profil
			</ActionButton>

			<ActionButton onClick={() => setShowCreateModal(true)}>
			  Créer un profil
			</ActionButton>

			<ActionButton onClick={handleOpenProfileFolder}>
			  Ouvrir le dossier
			</ActionButton>

			<ActionButton onClick={handleRefreshProfile}>
			  Rafraîchir
			</ActionButton>
			
			<ActionButton onClick={handleLaunchGame}>
			  Lancer le jeu
			</ActionButton>
		  </div>

		  {/* Ligne 2 */}
		  <div
			style={{
			  display: "flex",
			  gap: "12px",
			  flexWrap: "wrap",
			  alignItems: "center"
			}}
		  >
			<ActionButton
			  onClick={handleRepairLinks}
			  disabled={selectedProfile === "Default"}
			>
			  Copier les favoris dans le profil
			</ActionButton>

			<ActionButton
			  onClick={handleRemoveLinks}
			  disabled={commonMods === 0 || selectedProfile === "Default"}
			  style={{ background: "#d9534f", color: "#fff" }}
			>
			  Supprimer les favoris du profil
			</ActionButton>

			<ActionButton onClick={() => setShowGithubModal(true)}>
			  Ajouter un mod GitHub
			</ActionButton>

			<ActionButton
			  onClick={hasGithubTrackedMods ? handleCheckGithubUpdates : undefined}
			  disabled={!hasGithubTrackedMods}
			  title={
				hasGithubTrackedMods
				  ? "Vérifier les mises à jour des mods GitHub"
				  : "Aucun mod GitHub suivi sur ce profil"
			  }
			>
			  Vérifier les MAJ GitHub
			</ActionButton>

			<ActionButton onClick={() => setShowExternalModal(true)}>
			  Ajouter un mod externe
			</ActionButton>
		  </div>
		</div>
		
        {conflictingMods.length > 0 && (
         <div
		  style={{
			marginTop: "16px",
			marginBottom: "20px",
			padding: "12px 16px",
			background: "#4a3320",
			border: "1px solid #a86b2a",
			borderRadius: "8px",
			color: "#ffd28a"
		  }}
		>
		  <div style={{ fontWeight: 700, marginBottom: "6px" }}>
			{conflictingMods.length} mod(s) en conflit :
		  </div>

		  <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
			{conflictingMods.slice(0, 10).map(m => m.name).join(", ")}
			{conflictingMods.length > 10 && " ..."}
		  </div>
		</div>
        )}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "10px",
            flexWrap: "wrap"
          }}
        >
          <StatCard
            label="Tous les mods"
			icon="📁"
            value={totalMods}
            onClick={() => setFilter("all")}
            active={filter === "all"}
          />

          <StatCard
			label="Taille"
			value={formatSizeStats(totalSize)}
			icon="💾"
		  />

          <StatCard
            label="Favoris"
			icon="⭐"
            value={commonMods}
            onClick={!isDefaultProfile ? () => setFilter("common") : undefined}
            active={filter === "common"}
            disabled={isDefaultProfile}
          />

          <StatCard
            label="Locaux"
			icon="📦"
            value={localMods}
            onClick={() => setFilter("local")}
            active={filter === "local"}
          />

          <StatCard
            label="Exclus"
			icon="🚫"
            value={excludedCount}
            onClick={!isDefaultProfile ? () => setFilter("excluded") : undefined}
            active={filter === "excluded"}
            disabled={isDefaultProfile}
          />
		  
		  <StatCard
            label="Suivis GitHub"
            icon={<GitHubIcon size={20} />}
            value={githubTrackedCount}
            onClick={() => setFilter("githubTracked")}
            active={filter === "githubTracked"}
          />

         <StatCard
            label="Mods externes"
            icon="🌍"
            value={externalModsCount}
            onClick={() => setFilter("external")}
            active={filter === "external"}
          />
        </div>
		<input
		  type="text"
		  placeholder="Rechercher un mod..."
		  value={search}
		  onChange={(e) => setSearch(e.target.value)}
		  style={{
			width: "300px",
			padding: "10px 12px",
			borderRadius: "8px",
			border: `1px solid ${colors.border}`,
			background: colors.panel,
			color: colors.text,
			fontSize: "14px",
			marginTop: "10px"
		  }}
		/>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px"
        }}
      >
        {loadingMods ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "50px"
            }}
          >
            <Spinner />
          </div>
        ) : displayedMods.length === 0 ? (
          <div style={{ opacity: 0.6 }}>
            Aucun mod trouvé pour ce profil.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px"
            }}
          >
            {displayedMods.map((mod) => (
			<ModCard
			  key={`${mod.fileName}-${mod.status}`}
			  mod={mod}
			  selectedProfile={selectedProfile}
			  onCardClick={handleCardClick}
			/>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: "12px",
              padding: "24px",
              width: "340px",
              boxSizing: "border-box"
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              Créer un profil
            </h3>

            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="Nom du profil"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${colors.border}`,
                background: colors.panel2,
                color: colors.text,
                fontSize: "14px",
                boxSizing: "border-box",
                marginBottom: "16px"
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end"
              }}
            >
              <ActionButton onClick={() => setShowCreateModal(false)}>
                Annuler
              </ActionButton>
              <ActionButton onClick={handleCreateProfile}>Valider</ActionButton>
            </div>
          </div>
        </div>
      )}
	  
	  {showExternalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: "12px",
              padding: "24px",
              width: "520px",
              boxSizing: "border-box"
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              Ajouter un mod externe
            </h3>

            <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "12px" }}>
              Le ZIP sera copié dans le profil sélectionné :{" "}
              <strong>{selectedProfile}</strong>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <input
                type="text"
                value={externalZipPath}
                readOnly
                placeholder="Aucun ZIP sélectionné"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.border}`,
                  background: colors.panel2,
                  color: colors.text,
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />

              <ActionButton onClick={handlePickExternalZip}>
                Choisir un ZIP
              </ActionButton>
            </div>

            <input
              type="text"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${colors.border}`,
                background: colors.panel2,
                color: colors.text,
                fontSize: "14px",
                boxSizing: "border-box",
                marginBottom: "12px"
              }}
            />

            <div
              style={{
                fontSize: "12px",
                opacity: 0.7,
                lineHeight: "1.4",
                marginBottom: "16px"
              }}
            >
              Exemples : page KingMods, page de forum, page perso du mod.
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end"
              }}
            >
              <ActionButton
                onClick={() => {
                  setShowExternalModal(false);
                  setExternalZipPath("");
                  setExternalUrl("");
                }}
              >
                Annuler
              </ActionButton>

              <ActionButton onClick={handleAddExternalMod}>
                Ajouter
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {showGithubModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: "12px",
              padding: "24px",
              width: "460px",
              boxSizing: "border-box"
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              Ajouter un mod GitHub
            </h3>

            <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "10px" }}>
              Le ZIP du mod sera téléchargé dans le profil sélectionné :
              {" "}
              <strong>{selectedProfile}</strong>
            </div>

            <input
              type="text"
              value={githubRepoUrl}
              onChange={(e) => setGithubRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${colors.border}`,
                background: colors.panel2,
                color: colors.text,
                fontSize: "14px",
                boxSizing: "border-box",
                marginBottom: "14px"
              }}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                marginBottom: "14px",
                cursor: "pointer"
              }}
            >
              <input
                type="checkbox"
                checked={githubIncludePrereleases}
                onChange={(e) => setGithubIncludePrereleases(e.target.checked)}
              />
              Inclure les pre-releases
            </label>

            <div
              style={{
                fontSize: "12px",
                opacity: 0.7,
                lineHeight: "1.4",
                marginBottom: "16px"
              }}
            >
              Si cette option est décochée, seule la dernière release stable sera utilisée.
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end"
              }}
            >
              <ActionButton
                onClick={() => {
                  setShowGithubModal(false);
                  setGithubRepoUrl("");
                  setGithubIncludePrereleases(false);
                }}
              >
                Annuler
              </ActionButton>

              <ActionButton onClick={handleAddGithubMod}>
                Télécharger
              </ActionButton>
            </div>
          </div>
        </div>
      )}
	  
	<div
	  style={{
		position: "fixed",
		bottom: "10px",
		left: "20px",
		fontSize: "11px",
		opacity: 0.6
	  }}
	>
	  FS25 Mod Manager v{appVersion} • © JulLeBarge
	</div>
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 9999
        }}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>

      <style>
        {`
          @keyframes toastAnim {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>

	<ContextMenu
	  menu={contextMenu}
	  onClose={() => setContextMenu(null)}
	  onPromote={handlePromoteToCommon}
	  onDelete={handleDeleteLocalMod}
	  onToggleExcluded={handleToggleExcluded}
	  onOpenGithubRepo={handleOpenGithubRepo}
	  onUpdateGithubMod={handleUpdateGithubMod}
	  onOpenExternalUrl={handleOpenExternalUrl}
	  onOpenModZip={handleOpenModZip}
	/>
    </div>
  );
}