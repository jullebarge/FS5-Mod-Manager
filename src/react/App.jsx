import React, { useCallback, useEffect, useState } from "react";
import { DEFAULT_PROFILE } from "./theme";
import { formatSizeStats, includesFileName } from "./utils";
import { useGameRunning, useProfileData, useToasts } from "./hooks";
import { GitHubIcon, Spinner } from "./components/Icons";
import { ActionButton, StatCard } from "./components/Controls";
import { ToastStack } from "./components/Toasts";
import { ContextMenu } from "./components/ContextMenu";
import { ModCard } from "./components/ModCard";
import { ConflictBanner, OutOfSyncBanner } from "./components/Banners";
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
  const { mods, defaultMods, excludedMods, loadingMods, icons, reload, loadIcons } =
    useProfileData(selectedProfile, isInitialized, reloadToken);

  async function loadProfilesAndSettings() {
    const [p, active, s] = await Promise.all([
      window.fs25.getProfiles(),
      window.fs25.getActiveProfile(),
      window.fs25.getSettings()
    ]);

    setProfiles(p);
    setActiveProfile(active);
    setSelectedProfile(active);
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
      showToast(`Erreur : ${result.error}`, "error");
      return false;
    }
    return true;
  }

  async function handleChangeProfile() {
    const result = await window.fs25.setActiveProfile(selectedProfile);

    if (checkResult(result)) {
      setActiveProfile(selectedProfile);
      showToast(`Profil actif mis à jour : ${selectedProfile}`);
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
      showToast(`Profil créé : ${cleanName}`);
    }
  }

  async function handleRepairLinks() {
    if (selectedProfile === DEFAULT_PROFILE) return;

    showToast("Copie des mods favoris en cours...");

    const result = await window.fs25.repairLinks(selectedProfile);
    if (!checkResult(result)) return;

    const resynced = result.resyncedCount > 0
      ? `, ${result.resyncedCount} resynchronisé(s)`
      : "";

    showToast(
      `${result.linkedCount} favori(s) copiés, ${result.skippedExcluded} exclus ignorés, ${result.removedDuplicates} doublon(s) remplacé(s)${resynced}`
    );
    if (result.keptNewerCount > 0) {
      showToast(
        `${result.keptNewerCount} favori(s) plus récent(s) dans le profil conservé(s) : utilise « Garder cette version » pour les remonter dans les favoris`,
        "info",
        8000
      );
    }
    showErrorList(
      `${result.errors.length} favori(s) non traité(s) (jeu lancé ?)`,
      result.errors
    );

    setFilter("all");
    await reload();
  }

  async function handleRemoveLinks() {
    if (selectedProfile === DEFAULT_PROFILE) return;

    showToast("Suppression des mods favoris en cours...");

    const result = await window.fs25.removeLinks(selectedProfile);
    if (!checkResult(result)) return;

    showToast(`${result.removedCount} mod(s) favori(s) supprimé(s)`);
    showErrorList(
      `${result.errors.length} favori(s) non supprimé(s) (jeu lancé ?)`,
      result.errors
    );

    setFilter("all");
    await reload();
  }

  async function handleOpenProfileFolder() {
    checkResult(await window.fs25.openProfileFolder(selectedProfile));
  }

  async function handleRefreshProfile() {
    showToast("Rafraîchissement en cours...");
    await reload();
    showToast(`Profil ${selectedProfile} rafraîchi`);
  }

  async function handleToggleExcluded(mod) {
    if (selectedProfile === DEFAULT_PROFILE) return;
    if (mod.status === "local" || mod.status === "directory") return;

    const result = await window.fs25.toggleExcludedMod(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    showToast(
      result.excluded
        ? `${mod.name} exclu du profil`
        : `${mod.name} réintégré dans le profil`
    );

    await reload();
  }

  async function handleCopyMod(mod, targetProfiles, options) {
    setModToCopy(null);

    const result = await window.fs25.copyModToProfiles(selectedProfile, mod.fileName, targetProfiles, options);
    if (!checkResult(result)) return;

    if (result.copiedCount > 0) {
      const replaced = result.replacedCount > 0 ? ` (${result.replacedCount} version(s) remplacée(s))` : "";
      showToast(`${mod.name} copié dans ${result.copiedCount} profil(s)${replaced}`, "success");
    }
    showErrorList("Copie impossible", result.errors);
  }

  // Nettoyage depuis l'analyse des sauvegardes
  async function handleExcludeFavorites(modsToExclude) {
    const result = await window.fs25.excludeFavorites(
      selectedProfile,
      modsToExclude.map((m) => m.fileName)
    );
    if (!checkResult(result)) return;

    showToast(`${result.excludedCount} favori(s) exclu(s) du profil`, "success");
    showErrorList("Favoris non exclus", result.errors);
    await reload();
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

    showToast(`${mod.name} ajouté aux mods favoris`, "success");
    await reload();
  }

  async function handleDeleteMod(mod, options) {
    setModToDelete(null);

    const result = await window.fs25.deleteLocalMod(selectedProfile, mod.fileName, options);
    if (!checkResult(result)) return;

    if (result.removedFromProfiles > 0) {
      showToast(
        `${mod.name} déplacé dans la corbeille et retiré de ${result.removedFromProfiles} profil(s)`,
        "success"
      );
    } else {
      showToast(`${mod.name} déplacé dans la corbeille`, "success");
    }
    showErrorList("Non retiré de certains profils", result.profileErrors);

    await reload();
  }

  async function handlePromoteProfileVersion(mod) {
    const result = await window.fs25.promoteProfileVersion(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    showToast(
      `${mod.name} v${mod.version} remonté dans les favoris et relié dans ${result.relinkedCount} profil(s)`,
      "success"
    );
    showErrorList("Liens non mis à jour", result.errors);

    await reload();
  }

  async function handleRelinkFavorite(mod) {
    const result = await window.fs25.relinkFavorite(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    showToast(`${mod.name} : version des favoris reprise (v${mod.defaultVersion || "?"})`, "success");
    await reload();
  }

  async function handlePickGameFolder() {
    const result = await window.fs25.pickGameFolder();

    if (!result.success) {
      if (!result.canceled) {
        showToast(`Erreur : ${result.error}`, "error");
      }
      return null;
    }

    return result.folderPath;
  }

  async function handleSaveSettings(form) {
    const result = await window.fs25.saveSettings(form);
    if (!checkResult(result)) return;

    setOpenModal(null);
    showToast("Réglages enregistrés", "success");
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
      showToast("Merci de saisir une URL GitHub", "error");
      return;
    }

    showToast("Téléchargement du mod GitHub en cours...");

    const result = await window.fs25.addGithubMod(selectedProfile, cleanUrl, includePrereleases);
    if (!checkResult(result)) return;

    showToast(`${result.fileName} téléchargé depuis ${result.repo}`);
    setOpenModal(null);
    await reload();
  }

  async function handleCheckGithubUpdates() {
    showToast("Vérification des mises à jour GitHub en cours...");

    const result = await window.fs25.checkGithubUpdates(selectedProfile);
    if (!checkResult(result)) return;

    if (result.checkedCount === 0) {
      showToast("Aucun mod GitHub suivi sur ce profil");
    } else if (result.updateCount > 0) {
      showToast(
        `${result.updateCount} mise(s) à jour disponible(s) sur ${result.checkedCount} mod(s) vérifié(s)`
      );
    } else {
      showToast(`Aucune mise à jour trouvée sur ${result.checkedCount} mod(s)`);
    }

    await reload();
  }

  async function handleOpenGithubRepo(mod) {
    if (!mod.github?.repoUrl) return;
    checkResult(await window.fs25.openGithubRepo(mod.github.repoUrl));
  }

  async function handleUpdateGithubMod(mod) {
    if (!mod.github?.tracked || !mod.github?.updateAvailable) return;

    showToast(`Mise à jour de ${mod.name} en cours...`);

    const result = await window.fs25.updateGithubMod(selectedProfile, mod.fileName);
    if (!checkResult(result)) return;

    if (result.targetProfile === DEFAULT_PROFILE) {
      showToast(
        `${mod.name} mis à jour dans les favoris (Default) et ${result.relinkedCount} profil(s)`,
        "success"
      );
      showErrorList("Liens non mis à jour", result.relinkErrors);
    } else {
      showToast(`${mod.name} mis à jour`, "success");
    }

    await reload();
  }

  async function handleLaunchGame() {
    checkResult(await window.fs25.launchGame());
  }

  async function handlePickExternalZip() {
    const result = await window.fs25.pickExternalZip();

    if (!result.success) {
      if (!result.canceled) {
        showToast(`Erreur : ${result.error}`, "error");
      }
      return null;
    }

    return result.filePath;
  }

  async function handleAddExternalMod(zipPath, url) {
    const cleanZipPath = zipPath.trim();
    const cleanUrl = url.trim();

    if (!cleanZipPath) {
      showToast("Merci de sélectionner un fichier ZIP", "error");
      return;
    }

    if (!cleanUrl) {
      showToast("Merci de saisir une URL", "error");
      return;
    }

    const result = await window.fs25.addExternalMod(selectedProfile, cleanZipPath, cleanUrl);
    if (!checkResult(result)) return;

    showToast(`${result.fileName} ajouté comme mod externe`, "success");
    setOpenModal(null);
    await reload();
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
    <div className="app">
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
              Profil actif : <strong>{activeProfile}</strong>
            </div>
            {gameRunning && (
              <div
                style={{ marginTop: "6px", fontSize: "13px", color: "#ffd28a" }}
                title="Le jeu réécrit gameSettings.xml en quittant et verrouille les mods chargés"
              >
                🎮 FS25 est lancé : changement de profil désactivé, certaines opérations sur les mods peuvent échouer
              </div>
            )}
          </div>

          <div style={{ minWidth: "280px" }}>
            <label htmlFor="profile-select" className="field-label">
              Profil sélectionné
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
                Changement non appliqué
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          <div className="button-row">
            <ActionButton
              onClick={handleChangeProfile}
              disabled={!hasPendingChange || gameRunning}
              title={gameRunning ? "Ferme FS25 avant de changer de profil" : undefined}
            >
              Changer de profil
            </ActionButton>

            <ActionButton onClick={() => setOpenModal("createProfile")}>
              Créer un profil
            </ActionButton>

            <ActionButton onClick={handleOpenProfileFolder}>
              Ouvrir le dossier
            </ActionButton>

            <ActionButton onClick={handleRefreshProfile}>
              Rafraîchir
            </ActionButton>

            <ActionButton
              onClick={handleLaunchGame}
              disabled={!settings?.launchUrl}
              title={settings?.launchUrl ? settings.launchUrl : "Aucune URL de lancement : voir Réglages"}
            >
              Lancer le jeu
            </ActionButton>

            <ActionButton onClick={() => setOpenModal("settings")}>
              ⚙ Réglages
            </ActionButton>
          </div>

          <div className="button-row">
            <ActionButton onClick={handleRepairLinks} disabled={isDefaultProfile}>
              Copier les favoris dans le profil
            </ActionButton>

            <ActionButton
              onClick={handleRemoveLinks}
              disabled={commonMods === 0 || isDefaultProfile}
              variant="danger"
            >
              Supprimer les favoris du profil
            </ActionButton>

            <ActionButton
              onClick={() => setOpenModal("savegames")}
              title="Mods manquants ou inutilisés par les parties qui utilisent ce profil"
            >
              🗂 Analyser les sauvegardes
            </ActionButton>

            <ActionButton onClick={() => setOpenModal("github")}>
              Ajouter un mod GitHub
            </ActionButton>

            <ActionButton
              onClick={handleCheckGithubUpdates}
              disabled={!hasGithubTrackedMods}
              title={
                hasGithubTrackedMods
                  ? "Vérifier les mises à jour des mods GitHub"
                  : "Aucun mod GitHub suivi sur ce profil"
              }
            >
              Vérifier les MAJ GitHub
            </ActionButton>

            <ActionButton onClick={() => setOpenModal("external")}>
              Ajouter un mod externe
            </ActionButton>
          </div>
        </div>

        <ConflictBanner mods={conflictingMods} />

        <OutOfSyncBanner
          mods={outOfSyncFavorites}
          onPromote={handlePromoteProfileVersion}
          onRelink={handleRelinkFavorite}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
          <StatCard
            label="Tous les mods"
            icon="📁"
            value={mods.length}
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
            value={excludedMods.length}
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
          className="text-input text-input--panel"
          placeholder="Rechercher un mod..."
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
            Aucun mod trouvé pour ce profil.
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
          onPickFolder={handlePickGameFolder}
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
