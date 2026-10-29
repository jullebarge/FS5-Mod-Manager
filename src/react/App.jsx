import React, { useCallback, useEffect, useState } from "react";
import { DEFAULT_PROFILE } from "./theme";
import { setLanguage, t } from "../locales/i18n";
import { formatSizeStats, includesFileName } from "./utils";
import { useGameRunning, useProfileData, useToasts } from "./hooks";
import { GitHubIcon, Spinner } from "./components/Icons";
import { ActionButton, StatCard } from "./components/Controls";
import { ToastStack } from "./components/Toasts";
import { ContextMenu } from "./components/ContextMenu";
import { ModCard } from "./components/ModCard";
import { ConflictBanner, DependencyBanner, OutOfSyncBanner } from "./components/Banners";
import { CreateProfileModal } from "./modals/CreateProfileModal";
import { GithubModModal } from "./modals/GithubModModal";
import { ExternalModModal } from "./modals/ExternalModModal";
import { DeleteModModal } from "./modals/DeleteModModal";
import { SettingsModal } from "./modals/SettingsModal";
import { SavegamesModal } from "./modals/SavegamesModal";
import { CopyModModal } from "./modals/CopyModModal";

// Mods affiches selon le filtre actif (cartes de statistiques) et la recherche
function getDisplayedMods({ mods, defaultMods, excludedMods, filter, search, isDefaultProfile }) {
  let displayedMods = mods;

  if (!isDefaultProfile) {
    if (filter === "common") {
      displayedMods = mods.filter((m) => m.status === "common-linked");
    }

    if (filter === "local") {
      displayedMods = mods.filter((m) => m.status === "local" || m.status === "directory");
    }

    if (filter === "excluded") {
      // favoris exclus : ils ne sont que dans Default
      const presentInProfile = new Set(mods.map((m) => m.fileName.toLowerCase()));
      displayedMods = defaultMods
        .filter((m) => includesFileName(excludedMods, m.fileName))
        .filter((m) => !presentInProfile.has(m.fileName.toLowerCase()))
        .map((m) => ({ ...m, status: "common-excluded" }));
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

  return displayedMods;
}

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(DEFAULT_PROFILE);
  const [selectedProfile, setSelectedProfile] = useState(DEFAULT_PROFILE);
  const [settings, setSettings] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  // fenetre modale ouverte : "createProfile" | "github" | "external" | "settings" | "savegames" | null
  const [openModal, setOpenModal] = useState(null);
  const [modToDelete, setModToDelete] = useState(null);
  const [modToCopy, setModToCopy] = useState(null);
  // incremente pour forcer le rechargement complet (ex. apres changement du dossier du jeu)
  const [reloadToken, setReloadToken] = useState(0);

  const { toasts, showToast, showErrorList } = useToasts();
  const gameRunning = useGameRunning();
  const { mods, defaultMods, excludedMods, loadingMods, icons, reload, refreshInPlace, loadIcons } =
    useProfileData(selectedProfile, isInitialized, reloadToken, filter === "excluded");

  async function loadProfilesAndSettings() {
    const [p, active, s] = await Promise.all([
      window.fs25.getProfiles(),
      window.fs25.getActiveProfile(),
      window.fs25.getSettings()
    ]);

    setProfiles(p);
    setActiveProfile(active);
    setSelectedProfile(active);
    setLanguage(s.language);
    setSettings(s);
  }

  useEffect(() => {
    async function init() {
      await loadProfilesAndSettings();
      setIsInitialized(true);
    }

    init();
    window.fs25.getAppVersion().then(setAppVersion);
  }, []);

  // Les favoris exclus viennent de Default : leurs icones ne sont chargees que si on les affiche
  useEffect(() => {
    if (filter !== "excluded") return;

    loadIcons(defaultMods.filter((m) => includesFileName(excludedMods, m.fileName)));
  }, [filter, defaultMods, excludedMods]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        setContextMenu(null);
        setModToDelete(null);
        setModToCopy(null);
        setOpenModal((current) => (current === "settings" || current === "savegames" ? null : current));
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Affiche l'erreur d'une operation ; renvoie true si elle a reussi
  function checkResult(result) {
    if (!result.success) {
      showToast(t("common.errorPrefix", { error: result.error }), "error");
      return false;
    }
    return true;
  }

  async function handleChangeProfile() {
    const result = await window.fs25.setActiveProfile(selectedProfile);

    if (checkResult(result)) {
      setActiveProfile(selectedProfile);
      showToast(t("app.toast.activeProfileChanged", { profile: selectedProfile }));
    }
  }

  async function handleCreateProfile(name) {
    const cleanName = name.trim();
    if (!cleanName) return;

    const result = await window.fs25.createProfile(cleanName);

    if (checkResult(result)) {
      setProfiles(await window.fs25.getProfiles());
      setSelectedProfile(cleanName);
      setOpenModal(null);
      showToast(t("app.toast.profileCreated", { profile: cleanName }));
    }
  }

  async function handleRepairLinks() {
    if (selectedProfile === DEFAULT_PROFILE) return;

    showToast(t("app.toast.repairInProgress"));

    const result = await window.fs25.repairLinks(selectedProfile);
    if (!checkResult(result)) return;

    const resynced = result.resyncedCount > 0
      ? t("app.toast.repairResynced", { count: result.resyncedCount })
      : "";

    showToast(
      t("app.toast.repairDone", {
        linked: t("app.count.favoritesCopied", { count: result.linkedCount }),
        excluded: t("app.count.excludedSkipped", { count: result.skippedExcluded }),
        duplicates: t("app.count.duplicatesReplaced", { count: result.removedDuplicates })
      }) + resynced
    );
    if (result.keptNewerCount > 0) {
      showToast(
        t("app.toast.repairKeptNewer", { count: result.keptNewerCount }),
        "info",
        8000
      );
    }
    showErrorList(
      t("app.toast.repairErrors", { count: result.errors.length }),
      result.errors
    );

    setFilter("all");
    await refreshInPlace();
  }

  async function handleRemoveLinks() {
    if (selectedProfile === DEFAULT_PROFILE) return;

    showToast(t("app.toast.removeLinksInProgress"));

    const result = await window.fs25.removeLinks(selectedProfile);
    if (!checkResult(result)) return;

    showToast(t("app.toast.removeLinksDone", { count: result.removedCount }));
    showErrorList(
      t("app.toast.removeLinksErrors", { count: result.errors.length }),
      result.errors
    );

    setFilter("all");
    await refreshInPlace();
  }

  async function handleOpenProfileFolder() {
    checkResult(await window.fs25.openProfileFolder(selectedProfile));
  }

  async function handleRefreshProfile() {
    showToast(t("app.toast.refreshInProgress"));
    await reload();
    showToast(t("app.toast.refreshDone", { profile: selectedProfile }));
  }

  async function handleToggleExcluded(mod) {
    if (selectedProfile === DEFAULT_PROFILE) return;
    if (mod.status === "local" || mod.status === "directory") return;

    const result = await window.fs25.toggleExcludedMod(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    showToast(
      result.excluded
        ? t("app.toast.modExcluded", { name: mod.name })
        : t("app.toast.modReintegrated", { name: mod.name })
    );

    await refreshInPlace();
  }

  async function handleCopyMod(mod, targetProfiles, options) {
    setModToCopy(null);

    const result = await window.fs25.copyModToProfiles(selectedProfile, mod.fileName, targetProfiles, options);
    if (!checkResult(result)) return;

    if (result.copiedCount > 0) {
      const replaced = result.replacedCount > 0
        ? t("app.toast.copyReplaced", { count: result.replacedCount })
        : "";
      showToast(t("app.toast.copyDone", { name: mod.name, count: result.copiedCount }) + replaced, "success");
    }
    showErrorList(t("app.toast.copyErrors"), result.errors);
  }

  // Dependance manquante : reintegrer / lier le favori, ou copier depuis un autre profil
  async function handleResolveDependency(dependency) {
    const { availability } = dependency;
    let result;

    if (availability.type === "excluded-favorite") {
      result = await window.fs25.toggleExcludedMod(selectedProfile, availability.fileName);
    } else if (availability.type === "favorite") {
      result = await window.fs25.relinkFavorite(selectedProfile, availability.fileName);
    } else if (availability.type === "other-profile") {
      result = await window.fs25.copyModToProfiles(
        availability.profile,
        availability.fileName,
        [selectedProfile],
        {}
      );
      if (result.success && result.errors.length > 0) {
        result = { success: false, error: result.errors.join(", ") };
      }
    } else {
      return;
    }

    if (!checkResult(result)) return;

    showToast(t("app.toast.dependencyAdded", { name: dependency.modName }), "success");
    await refreshInPlace();
  }

  // Nettoyage depuis l'analyse des sauvegardes
  async function handleExcludeFavorites(modsToExclude) {
    const result = await window.fs25.excludeFavorites(
      selectedProfile,
      modsToExclude.map((m) => m.fileName)
    );
    if (!checkResult(result)) return;

    showToast(t("app.toast.favoritesExcluded", { count: result.excludedCount }), "success");
    showErrorList(t("app.toast.favoritesExcludeErrors"), result.errors);
    await refreshInPlace();
  }

  async function handleReintegrateMissing(missingMod) {
    await handleToggleExcluded({
      fileName: `${missingMod.modName}.zip`,
      name: missingMod.title,
      status: "common-excluded"
    });
  }

  async function handlePromoteToCommon(mod) {
    if (mod.status !== "local" || mod.isDirectory) return;

    const result = await window.fs25.promoteToCommon(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    showToast(t("app.toast.promotedToFavorite", { name: mod.name }), "success");
    await refreshInPlace();
  }

  async function handleDeleteMod(mod, options) {
    setModToDelete(null);

    const result = await window.fs25.deleteLocalMod(selectedProfile, mod.fileName, options);
    if (!checkResult(result)) return;

    if (result.removedFromProfiles > 0) {
      showToast(
        t("app.toast.deletedAndRemoved", { name: mod.name, count: result.removedFromProfiles }),
        "success"
      );
    } else {
      showToast(t("app.toast.deleted", { name: mod.name }), "success");
    }
    showErrorList(t("app.toast.deleteProfileErrors"), result.profileErrors);

    await refreshInPlace();
  }

  async function handlePromoteProfileVersion(mod) {
    const result = await window.fs25.promoteProfileVersion(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    showToast(
      t("app.toast.versionPromoted", { name: mod.name, version: mod.version, count: result.relinkedCount }),
      "success"
    );
    showErrorList(t("app.toast.linksNotUpdated"), result.errors);

    await refreshInPlace();
  }

  async function handleRelinkFavorite(mod) {
    const result = await window.fs25.relinkFavorite(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    showToast(t("app.toast.favoriteVersionRestored", { name: mod.name, version: mod.defaultVersion || "?" }), "success");
    await refreshInPlace();
  }

  async function handlePickFolder(title, defaultPath) {
    const result = await window.fs25.pickFolder(title, defaultPath);

    if (!result.success) {
      if (!result.canceled) {
        showToast(t("common.errorPrefix", { error: result.error }), "error");
      }
      return null;
    }

    return result.folderPath;
  }

  async function handleSaveSettings(form) {
    const result = await window.fs25.saveSettings(form);
    if (!checkResult(result)) return;

    setOpenModal(null);
    showToast(t("app.toast.settingsSaved"), "success");
    if (result.warning) {
      showToast(result.warning, "error", 10000);
    }

    setFilter("all");
    await loadProfilesAndSettings();
    setReloadToken((t) => t + 1);
  }

  const handleCardClick = useCallback((mod, event) => {
    setContextMenu({
      mod,
      selectedProfile,
      x: event.clientX,
      y: event.clientY
    });
  }, [selectedProfile]);

  async function handleAddGithubMod(repoUrl, includePrereleases) {
    const cleanUrl = repoUrl.trim();

    if (!cleanUrl) {
      showToast(t("app.toast.githubUrlRequired"), "error");
      return;
    }

    showToast(t("app.toast.githubDownloading"));

    const result = await window.fs25.addGithubMod(selectedProfile, cleanUrl, includePrereleases);
    if (!checkResult(result)) return;

    showToast(t("app.toast.githubDownloaded", { fileName: result.fileName, repo: result.repo }));
    setOpenModal(null);
    await refreshInPlace();
  }

  async function handleCheckGithubUpdates() {
    showToast(t("app.toast.githubChecking"));

    const result = await window.fs25.checkGithubUpdates(selectedProfile);
    if (!checkResult(result)) return;

    if (result.checkedCount === 0) {
      showToast(t("app.toast.githubNoneTracked"));
    } else if (result.updateCount > 0) {
      showToast(
        t("app.toast.githubUpdatesFound", {
          updates: t("app.count.updatesAvailable", { count: result.updateCount }),
          checked: t("app.count.modsChecked", { count: result.checkedCount })
        })
      );
    } else {
      showToast(t("app.toast.githubNoUpdate", { count: result.checkedCount }));
    }

    await refreshInPlace();
  }

  async function handleOpenGithubRepo(mod) {
    if (!mod.github?.repoUrl) return;
    checkResult(await window.fs25.openGithubRepo(mod.github.repoUrl));
  }

  async function handleUpdateGithubMod(mod) {
    if (!mod.github?.tracked || !mod.github?.updateAvailable) return;

    showToast(t("app.toast.githubUpdating", { name: mod.name }));

    const result = await window.fs25.updateGithubMod(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    if (result.targetProfile === DEFAULT_PROFILE) {
      showToast(
        t("app.toast.githubFavoriteUpdated", { name: mod.name, count: result.relinkedCount }),
        "success"
      );
      showErrorList(t("app.toast.linksNotUpdated"), result.relinkErrors);
    } else {
      showToast(t("app.toast.githubUpdated", { name: mod.name }), "success");
    }

    await refreshInPlace();
  }

  async function handleLaunchGame() {
    checkResult(await window.fs25.launchGame());
  }

  async function handlePickExternalZip() {
    const result = await window.fs25.pickExternalZip();

    if (!result.success) {
      if (!result.canceled) {
        showToast(t("common.errorPrefix", { error: result.error }), "error");
      }
      return null;
    }

    return result.filePath;
  }

  async function handleAddExternalMod(zipPath, url) {
    const cleanZipPath = zipPath.trim();
    const cleanUrl = url.trim();

    if (!cleanZipPath) {
      showToast(t("app.toast.zipRequired"), "error");
      return;
    }

    if (!cleanUrl) {
      showToast(t("app.toast.urlRequired"), "error");
      return;
    }

    const result = await window.fs25.addExternalMod(selectedProfile, cleanZipPath, cleanUrl);
    if (!checkResult(result)) return;

    showToast(t("app.toast.externalAdded", { fileName: result.fileName }), "success");
    setOpenModal(null);
    await refreshInPlace();
  }

  async function handleOpenExternalUrl(url) {
    checkResult(await window.fs25.openExternalUrl(url));
  }

  async function handleOpenModZip(mod) {
    // un favori (lie ou exclu) s'ouvre depuis son original dans Default
    const targetProfile =
      mod.status === "common-linked" || mod.status === "common-excluded"
        ? DEFAULT_PROFILE
        : selectedProfile;

    checkResult(await window.fs25.openModZip(targetProfile, mod.fileName));
  }

  const hasPendingChange = selectedProfile !== activeProfile;
  const isDefaultProfile = selectedProfile === DEFAULT_PROFILE;

  const commonMods = mods.filter((m) => m.status === "common-linked").length;
  const localMods = mods.filter((m) => m.status === "local" || m.status === "directory").length;
  const githubTrackedCount = mods.filter((m) => m.github?.tracked).length;
  const hasGithubTrackedMods = githubTrackedCount > 0;
  const externalModsCount = mods.filter((m) => m.external?.tracked).length;

  const totalSize = mods
    .filter((m) => m.status === "local")
    .reduce((sum, m) => sum + (m.size || 0), 0);

  const conflictingMods = mods.filter((m) => includesFileName(excludedMods, m.fileName));
  const outOfSyncFavorites = isDefaultProfile
    ? []
    : mods.filter((m) => m.status === "common-linked" && m.isOutOfSync);

  const displayedMods = getDisplayedMods({
    mods,
    defaultMods,
    excludedMods,
    filter,
    search,
    isDefaultProfile
  });

  return (
    <div className="app" key={settings?.language}>
      <div className="app-header">
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
              {t("app.activeProfile")} <strong>{activeProfile}</strong>
            </div>
            {gameRunning && (
              <div
                style={{ marginTop: "6px", fontSize: "13px", color: "#ffd28a" }}
                title={t("app.gameRunningTooltip")}
              >
                🎮 {t("app.gameRunning")}
              </div>
            )}
          </div>

          <div style={{ minWidth: "280px" }}>
            <label htmlFor="profile-select" className="field-label">
              {t("app.selectedProfile")}
            </label>
            <select
              id="profile-select"
              className="text-input text-input--panel"
              value={selectedProfile}
              onChange={(e) => {
                setSelectedProfile(e.target.value);
                setFilter("all");
              }}
              style={{ width: "100%" }}
            >
              <option value={DEFAULT_PROFILE}>{DEFAULT_PROFILE}</option>
              {profiles.map((profile) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>

            {hasPendingChange && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#cccccc" }}>
                {t("app.pendingChange")}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          <div className="button-row">
            <ActionButton
              onClick={handleChangeProfile}
              disabled={!hasPendingChange || gameRunning}
              title={gameRunning ? t("app.closeGameFirst") : undefined}
              icon="🔀"
            >
              {t("app.button.changeProfile")}
            </ActionButton>

            <ActionButton icon="➕" onClick={() => setOpenModal("createProfile")}>
              {t("app.button.createProfile")}
            </ActionButton>

            <ActionButton icon="📂" onClick={handleOpenProfileFolder}>
              {t("app.button.openFolder")}
            </ActionButton>

            <ActionButton icon="🔄" onClick={handleRefreshProfile}>
              {t("app.button.refresh")}
            </ActionButton>

            <ActionButton
              onClick={handleLaunchGame}
              disabled={!settings?.launchUrl}
              title={settings?.launchUrl ? settings.launchUrl : t("app.noLaunchUrl")}
              icon="▶️"
            >
              {t("app.button.launchGame")}
            </ActionButton>

            <ActionButton icon="⚙️" onClick={() => setOpenModal("settings")}>
              {t("app.button.settings")}
            </ActionButton>
          </div>

          <div className="button-row">
            <ActionButton icon="⭐" onClick={handleRepairLinks} disabled={isDefaultProfile}>
              {t("app.button.repairLinks")}
            </ActionButton>

            <ActionButton
              onClick={handleRemoveLinks}
              disabled={commonMods === 0 || isDefaultProfile}
              variant="danger"
              icon="🗑️"
            >
              {t("app.button.removeLinks")}
            </ActionButton>

            <ActionButton
              onClick={() => setOpenModal("savegames")}
              title={t("app.savegamesTooltip")}
              icon="🗂️"
            >
              {t("app.button.savegames")}
            </ActionButton>

            <ActionButton icon={<GitHubIcon size={14} opacity={1} />} onClick={() => setOpenModal("github")}>
              {t("app.button.addGithubMod")}
            </ActionButton>

            <ActionButton
              onClick={handleCheckGithubUpdates}
              disabled={!hasGithubTrackedMods}
              title={
                hasGithubTrackedMods
                  ? t("app.checkGithubTooltip")
                  : t("app.toast.githubNoneTracked")
              }
              icon="🔍"
            >
              {t("app.button.checkGithub")}
            </ActionButton>

            <ActionButton icon="🌍" onClick={() => setOpenModal("external")}>
              {t("app.button.addExternalMod")}
            </ActionButton>
          </div>
        </div>

        <ConflictBanner mods={conflictingMods} />

        <DependencyBanner mods={mods} onResolve={handleResolveDependency} />

        <OutOfSyncBanner
          mods={outOfSyncFavorites}
          onPromote={handlePromoteProfileVersion}
          onRelink={handleRelinkFavorite}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
          <StatCard
            label={t("app.stats.all")}
            icon="📁"
            value={mods.length}
            onClick={() => setFilter("all")}
            active={filter === "all"}
          />

          <StatCard
            label={t("app.stats.size")}
            value={formatSizeStats(totalSize)}
            icon="💾"
          />

          <StatCard
            label={t("app.stats.favorites")}
            icon="⭐"
            value={commonMods}
            onClick={!isDefaultProfile ? () => setFilter("common") : undefined}
            active={filter === "common"}
            disabled={isDefaultProfile}
          />

          <StatCard
            label={t("app.stats.local")}
            icon="📦"
            value={localMods}
            onClick={() => setFilter("local")}
            active={filter === "local"}
          />

          <StatCard
            label={t("app.stats.excluded")}
            icon="🚫"
            value={excludedMods.length}
            onClick={!isDefaultProfile ? () => setFilter("excluded") : undefined}
            active={filter === "excluded"}
            disabled={isDefaultProfile}
          />

          <StatCard
            label={t("app.stats.github")}
            icon={<GitHubIcon size={20} />}
            value={githubTrackedCount}
            onClick={() => setFilter("githubTracked")}
            active={filter === "githubTracked"}
          />

          <StatCard
            label={t("app.stats.external")}
            icon="🌍"
            value={externalModsCount}
            onClick={() => setFilter("external")}
            active={filter === "external"}
          />
        </div>

        <input
          type="text"
          className="text-input text-input--panel"
          placeholder={t("app.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "300px", marginTop: "10px" }}
        />
      </div>

      <div className="app-content">
        {loadingMods ? (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "50px" }}>
            <Spinner />
          </div>
        ) : displayedMods.length === 0 ? (
          <div style={{ opacity: 0.6 }}>
            {t("app.noMods")}
          </div>
        ) : (
          <div className="mod-grid">
            {displayedMods.map((mod) => (
              <ModCard
                key={`${mod.fileName}-${mod.status}`}
                mod={mod}
                icon={mod.iconKey ? icons[mod.iconKey] : null}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        )}
      </div>

      {openModal === "createProfile" && (
        <CreateProfileModal
          onCancel={() => setOpenModal(null)}
          onCreate={handleCreateProfile}
        />
      )}

      {openModal === "external" && (
        <ExternalModModal
          profile={selectedProfile}
          onCancel={() => setOpenModal(null)}
          onPickZip={handlePickExternalZip}
          onSubmit={handleAddExternalMod}
        />
      )}

      {openModal === "github" && (
        <GithubModModal
          profile={selectedProfile}
          onCancel={() => setOpenModal(null)}
          onSubmit={handleAddGithubMod}
        />
      )}

      {openModal === "settings" && (
        <SettingsModal
          settings={settings}
          onCancel={() => setOpenModal(null)}
          onPickFolder={handlePickFolder}
          onSave={handleSaveSettings}
        />
      )}

      {openModal === "savegames" && (
        <SavegamesModal
          profile={selectedProfile}
          profiles={profiles}
          modsVersion={mods}
          onClose={() => setOpenModal(null)}
          onExcludeFavorites={handleExcludeFavorites}
          onReintegrate={handleReintegrateMissing}
          onDelete={setModToDelete}
        />
      )}

      {modToCopy && (
        <CopyModModal
          mod={modToCopy}
          profile={selectedProfile}
          onCancel={() => setModToCopy(null)}
          onCopy={(targetProfiles, options) => handleCopyMod(modToCopy, targetProfiles, options)}
        />
      )}

      {modToDelete && (
        <DeleteModModal
          mod={modToDelete}
          isDefaultProfile={isDefaultProfile}
          onCancel={() => setModToDelete(null)}
          onConfirm={(options) => handleDeleteMod(modToDelete, options)}
        />
      )}

      <div className="app-footer">
        FS25 Mod Manager v{appVersion} • © JulLeBarge
      </div>

      <ToastStack toasts={toasts} />

      <ContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onPromote={handlePromoteToCommon}
        onDelete={setModToDelete}
        onPromoteProfileVersion={handlePromoteProfileVersion}
        onRelinkFavorite={handleRelinkFavorite}
        onCopyToProfiles={setModToCopy}
        onToggleExcluded={handleToggleExcluded}
        onOpenGithubRepo={handleOpenGithubRepo}
        onUpdateGithubMod={handleUpdateGithubMod}
        onOpenExternalUrl={handleOpenExternalUrl}
        onOpenModZip={handleOpenModZip}
      />
    </div>
  );
}
