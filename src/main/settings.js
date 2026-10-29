const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { writeJsonFile } = require('../utils');

// Profil des mods favoris : le dossier "mods" du jeu
const DEFAULT_PROFILE = "Default";

// URL de lancement utilisee avant l'ecran de reglages : reprise si aucun settings.json n'existe
const LEGACY_LAUNCH_URL = "playnite://playnite/start/11dd1871-0174-46f5-a27d-ef5d1095f121";
const LAUNCH_URL_PATTERN = /^(playnite|steam):\/\//i;

let settingsCache = null;
const changeListeners = [];

function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

function getDefaultGamePath() {
    return path.join(app.getPath('documents'), 'My Games', 'FarmingSimulator2025');
}

function loadSettings() {
    if (settingsCache) return settingsCache;

    let stored = null;
    try {
        stored = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf-8'));
    } catch {}

    settingsCache = {
        gamePath: (stored && stored.gamePath) || getDefaultGamePath(),
        launchUrl: stored ? (stored.launchUrl || "") : LEGACY_LAUNCH_URL
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

// Valide puis enregistre les reglages saisis dans l'interface
function updateSettings(input) {
    const gamePath = String(input?.gamePath || "").trim();
    const launchUrl = String(input?.launchUrl || "").trim();

    if (!gamePath || !fs.existsSync(gamePath) || !fs.statSync(gamePath).isDirectory()) {
        return { success: false, error: "Dossier du jeu introuvable" };
    }
    if (launchUrl && !LAUNCH_URL_PATTERN.test(launchUrl)) {
        return { success: false, error: "L'URL de lancement doit commencer par playnite:// ou steam://" };
    }

    saveSettings({ gamePath, launchUrl });

    return {
        success: true,
        warning: fs.existsSync(path.join(gamePath, "gameSettings.xml"))
            ? null
            : "gameSettings.xml introuvable dans ce dossier : est-ce bien le dossier FarmingSimulator2025 ?"
    };
}

function getBasePath() {
    return loadSettings().gamePath;
}

function getModsCartesPath() {
    return path.join(getBasePath(), "modsCartes");
}

function getModsFolder(profileName) {
    if (!profileName || profileName === DEFAULT_PROFILE || profileName === "...") {
        return path.join(getBasePath(), "mods");
    }

    return path.join(getModsCartesPath(), profileName);
}

module.exports = {
    DEFAULT_PROFILE,
    LAUNCH_URL_PATTERN,
    getDefaultGamePath,
    loadSettings,
    onSettingsChange,
    updateSettings,
    getBasePath,
    getModsCartesPath,
    getModsFolder
};
