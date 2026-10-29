// Points d'entree appeles par l'interface (via preload.js)
const { app, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { describeFsError } = require('./fsUtils');
const { t } = require('../locales/i18n');
const {
    LAUNCH_URL_PATTERN,
    loadSettings,
    getSettingsForDisplay,
    updateSettings,
    getBasePath,
    getModsFolder
} = require('./settings');
const { isGameRunning, getActiveProfileFromXML, setActiveProfile } = require('./game');
const { listProfiles, createProfile } = require('./profiles');
const { getModIcon } = require('./icons');
const {
    getMods,
    getExcludedMods,
    addExternalMod,
    getCopyTargets,
    copyModToProfiles,
    deleteMod
} = require('./mods');
const { addGithubMod, checkGithubUpdates, updateGithubMod } = require('./github');
const {
    getFavoriteUsage,
    repairLinks,
    removeLinks,
    toggleExcludedMod,
    excludeFavorites,
    promoteToCommon,
    promoteProfileVersion,
    relinkFavorite
} = require('./links');
const { getSavegameOverview, setSavegameProfile, analyzeSavegame } = require('./savegames');
const { getIconCacheStats, cleanIconCache } = require('./iconCleanup');

const failure = (err) => ({ success: false, error: err.message });

// Enregistre un canal : toute exception est journalisee puis convertie en reponse de repli
function handle(channel, fn, { label = channel, fallback = failure } = {}) {
    ipcMain.handle(channel, async (_event, ...args) => {
        try {
            return await fn(...args);
        } catch (err) {
            console.error(`Erreur ${label}:`, err);
            return fallback(err);
        }
    });
}

async function openPathResult(targetPath, missingMessage) {
    if (!fs.existsSync(targetPath)) {
        return { success: false, error: missingMessage };
    }

    const result = await shell.openPath(targetPath);
    return result ? { success: false, error: result } : { success: true };
}

async function openUrl(url, pattern, invalidMessage) {
    const cleanUrl = String(url || "").trim();

    if (!pattern.test(cleanUrl)) {
        return { success: false, error: invalidMessage };
    }

    await shell.openExternal(cleanUrl);
    return { success: true };
}

async function pickPath(options, resultKey) {
    const result = await dialog.showOpenDialog(options);

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
    }

    return { success: true, [resultKey]: result.filePaths[0] };
}

function registerIpcHandlers() {
    // Application et reglages
    handle("app:getVersion", () => app.getVersion());

    handle("fs25:getSettings", getSettingsForDisplay);

    // lu de facon synchrone par le preload : l'interface s'affiche directement dans la bonne langue
    ipcMain.on("fs25:getLanguageSync", (event) => {
        event.returnValue = loadSettings().language;
    });

    handle("fs25:saveSettings", updateSettings, { label: "saveSettings" });

    handle("fs25:pickFolder", (title, defaultPath) => pickPath({
        title: String(title || t("dialogs.pickFolder")),
        defaultPath: defaultPath || getBasePath(),
        properties: ["openDirectory"]
    }, "folderPath"), { label: "pickFolder" });

    handle("fs25:isGameRunning", isGameRunning);

    handle("fs25:getIconCacheStats", getIconCacheStats, { label: "getIconCacheStats" });
    handle("fs25:cleanIconCache", () => cleanIconCache({ ignoreGracePeriod: true }), { label: "cleanIconCache" });

    handle("fs25:launchGame", async () => {
        const url = String(loadSettings().launchUrl || "").trim();

        if (!url) {
            return { success: false, error: t("errors.noLaunchUrl") };
        }

        return openUrl(url, LAUNCH_URL_PATTERN, t("errors.invalidLaunchUrl"));
    }, { label: "launchGame" });

    // Profils
    handle("fs25:getProfiles", listProfiles, { label: "lecture profils", fallback: () => [] });
    handle("fs25:getActiveProfile", getActiveProfileFromXML);
    handle("fs25:setActiveProfile", setActiveProfile, { label: "changement profil actif" });
    handle("fs25:createProfile", createProfile, { label: "creation profil" });

    handle("fs25:openProfileFolder", (profile) =>
        openPathResult(getModsFolder(profile), t("errors.folderNotFound")), { label: "openProfileFolder" });

    // Mods
    handle("fs25:getMods", getMods, { label: "getMods", fallback: () => [] });
    handle("fs25:getModIcon", getModIcon, { label: "getModIcon", fallback: () => null });
    handle("fs25:getExcludedMods", getExcludedMods, { label: "getExcludedMods", fallback: () => [] });
    handle("fs25:deleteLocalMod", deleteMod, { label: "deleteLocalMod" });
    handle("fs25:getCopyTargets", getCopyTargets, { label: "getCopyTargets", fallback: () => [] });
    handle("fs25:copyModToProfiles", copyModToProfiles, { label: "copyModToProfiles" });

    handle("fs25:openModZip", (profile, fileName) =>
        openPathResult(path.join(getModsFolder(profile), fileName), t("errors.fileNotFound")), { label: "openModZip" });

    // Favoris
    handle("fs25:repairLinks", repairLinks, { label: "repairLinks" });
    handle("fs25:removeLinks", removeLinks, { label: "removeLinks" });
    handle("fs25:toggleExcludedMod", toggleExcludedMod, { label: "toggleExcludedMod" });
    handle("fs25:promoteToCommon", promoteToCommon, { label: "promoteToCommon" });
    handle("fs25:getFavoriteUsage", getFavoriteUsage, {
        label: "getFavoriteUsage",
        fallback: () => ({ linked: [], excluded: [] })
    });
    handle("fs25:promoteProfileVersion", promoteProfileVersion, {
        label: "promoteProfileVersion",
        fallback: (err) => ({ success: false, error: describeFsError(err) })
    });
    handle("fs25:relinkFavorite", relinkFavorite, {
        label: "relinkFavorite",
        fallback: (err) => ({ success: false, error: describeFsError(err) })
    });

    handle("fs25:excludeFavorites", excludeFavorites, { label: "excludeFavorites" });

    // Sauvegardes
    handle("fs25:getSavegames", getSavegameOverview, { label: "getSavegames", fallback: () => [] });
    handle("fs25:setSavegameProfile", setSavegameProfile, { label: "setSavegameProfile" });
    handle("fs25:analyzeSavegame", analyzeSavegame, { label: "analyzeSavegame" });

    // GitHub
    handle("fs25:addGithubMod", addGithubMod, { label: "addGithubMod" });
    handle("fs25:checkGithubUpdates", checkGithubUpdates, { label: "checkGithubUpdates" });
    handle("fs25:updateGithubMod", updateGithubMod, { label: "updateGithubMod" });
    handle("fs25:openGithubRepo", (repoUrl) =>
        openUrl(repoUrl, /^https:\/\/github\.com\/[^\/]+\/[^\/]+/i, t("errors.invalidGithubUrl")), { label: "openGithubRepo" });

    // Mods externes
    handle("fs25:pickExternalZip", () => pickPath({
        title: t("dialogs.pickExternalZip"),
        properties: ["openFile"],
        filters: [{ name: t("dialogs.zipFilter"), extensions: ["zip"] }]
    }, "filePath"), { label: "pickExternalZip" });

    handle("fs25:addExternalMod", addExternalMod, { label: "addExternalMod" });
    handle("fs25:openExternalUrl", (url) =>
        openUrl(url, /^https?:\/\//i, t("errors.invalidUrl")), { label: "openExternalUrl" });
}

module.exports = {
    registerIpcHandlers
};
