const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { writeJsonFile } = require('../utils');

// Profil des mods favoris : par defaut le dossier "mods" du jeu
const DEFAULT_PROFILE = "Default";

const LAUNCH_URL_PATTERN = /^(playnite|steam):\/\//i;

let settingsCache = null;
const changeListeners = [];

function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

function getDefaultGamePath() {
    return path.join(app.getPath('documents'), 'My Games', 'FarmingSimulator2025');
}

// Dossiers par defaut, deduits du dossier du jeu
function getDefaultModsPath(gamePath) {
    return path.join(gamePath, "mods");
}

function getDefaultProfilesPath(gamePath) {
    return path.join(gamePath, "modsCartes");
}

// modsPath / profilesPath vides : dossiers par defaut du jeu
function loadSettings() {
    if (settingsCache) return settingsCache;

    let stored = null;
    try {
        stored = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf-8'));
    } catch {}

    settingsCache = {
        gamePath: (stored && stored.gamePath) || getDefaultGamePath(),
        modsPath: (stored && stored.modsPath) || "",
        profilesPath: (stored && stored.profilesPath) || "",
        launchUrl: (stored && stored.launchUrl) || ""
    };

    return settingsCache;
}

// Appele quand les reglages changent (ex. vider les caches indexes par nom de profil)
function onSettingsChange(listener) {
    changeListeners.push(listener);
}

function saveSettings(settings) {
    writeJsonFile(getSettingsPath(), settings);
    settingsCache = settings;
    for (const listener of changeListeners) {
        listener(settings);
    }
}

function isExistingDirectory(dir) {
    try {
        return fs.statSync(dir).isDirectory();
    } catch {
        return false;
    }
}

// Les favoris sont des liens physiques : Default et les profils doivent etre sur le meme disque
function isSameDrive(dirA, dirB) {
    return path.parse(path.resolve(dirA)).root.toLowerCase() === path.parse(path.resolve(dirB)).root.toLowerCase();
}

// Valide puis enregistre les reglages saisis dans l'interface
function updateSettings(input) {
    const gamePath = String(input?.gamePath || "").trim();
    const modsPath = String(input?.modsPath || "").trim();
    const profilesPath = String(input?.profilesPath || "").trim();
    const launchUrl = String(input?.launchUrl || "").trim();

    if (!gamePath || !isExistingDirectory(gamePath)) {
        return { success: false, error: "Dossier du jeu introuvable" };
    }
    if (modsPath && !isExistingDirectory(modsPath)) {
        return { success: false, error: "Dossier des mods favoris introuvable" };
    }
    if (profilesPath && !isExistingDirectory(profilesPath)) {
        return { success: false, error: "Dossier des mods par carte introuvable" };
    }
    if (launchUrl && !LAUNCH_URL_PATTERN.test(launchUrl)) {
        return { success: false, error: "L'URL de lancement doit commencer par playnite:// ou steam://" };
    }

    saveSettings({ gamePath, modsPath, profilesPath, launchUrl });

    const warnings = [];
    if (!fs.existsSync(path.join(gamePath, "gameSettings.xml"))) {
        warnings.push("gameSettings.xml introuvable dans le dossier du jeu : est-ce bien le dossier FarmingSimulator2025 ?");
    }
    if (!isSameDrive(getModsFolder(DEFAULT_PROFILE), getModsCartesPath())) {
        warnings.push("Les mods favoris et les mods par carte sont sur des disques différents : les favoris ne pourront pas être liés dans les profils.");
    }

    return { success: true, warning: warnings.join(" ") || null };
}

function getBasePath() {
    return loadSettings().gamePath;
}

function getModsCartesPath() {
    const settings = loadSettings();
    return settings.profilesPath || getDefaultProfilesPath(settings.gamePath);
}

function getModsFolder(profileName) {
    if (!profileName || profileName === DEFAULT_PROFILE || profileName === "...") {
        const settings = loadSettings();
        return settings.modsPath || getDefaultModsPath(settings.gamePath);
    }

    return path.join(getModsCartesPath(), profileName);
}

// Vrai si les favoris ne sont pas dans le dossier "mods" du jeu : le jeu doit alors y etre redirige
function hasCustomModsFolder() {
    const settings = loadSettings();
    return !!settings.modsPath &&
        path.resolve(settings.modsPath).toLowerCase() !== path.resolve(getDefaultModsPath(settings.gamePath)).toLowerCase();
}

module.exports = {
    DEFAULT_PROFILE,
    LAUNCH_URL_PATTERN,
    getDefaultGamePath,
    getDefaultModsPath,
    getDefaultProfilesPath,
    loadSettings,
    onSettingsChange,
    updateSettings,
    getBasePath,
    getModsCartesPath,
    getModsFolder,
    hasCustomModsFolder
};
