const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { writeJsonFile } = require('../utils');
const { resolveLanguage, setLanguage, t } = require('../locales/i18n');

// Profil des mods favoris : par defaut le dossier "mods" du jeu
const DEFAULT_PROFILE = "Default";

const LAUNCH_URL_PATTERN = /^(playnite|steam):\/\//i;

// Nom du dossier des mods par carte cree dans le dossier du jeu, selon la langue
const PROFILES_FOLDER_NAMES = {
    fr: "modsCartes",
    en: "modsByMap"
};

let settingsCache = null;
const changeListeners = [];

function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

function getDefaultGamePath() {
    return path.join(app.getPath('documents'), 'My Games', 'FarmingSimulator2025');
}

// Langue du systeme au premier lancement (francais si Windows est en francais, sinon anglais)
function getSystemLanguage() {
    try {
        return resolveLanguage(app.getLocale());
    } catch {
        return resolveLanguage("en");
    }
}

function isExistingDirectory(dir) {
    try {
        return fs.statSync(dir).isDirectory();
    } catch {
        return false;
    }
}

// Dossiers par defaut, deduits du dossier du jeu
function getDefaultModsPath(gamePath) {
    return path.join(gamePath, "mods");
}

// Un dossier deja present (quelle que soit sa langue) est garde : changer de langue ne doit pas
// faire "disparaitre" les profils. Sinon, nom dans la langue de l'application.
function getProfilesFolderName(gamePath, language) {
    const preferred = PROFILES_FOLDER_NAMES[language] || PROFILES_FOLDER_NAMES.en;
    const candidates = [preferred, ...Object.values(PROFILES_FOLDER_NAMES).filter((name) => name !== preferred)];

    return candidates.find((name) => isExistingDirectory(path.join(gamePath, name))) || preferred;
}

function getDefaultProfilesPath(gamePath, language = loadSettings().language) {
    return path.join(gamePath, getProfilesFolderName(gamePath, language));
}

// modsPath / profilesPath vides : dossiers par defaut du jeu
function loadSettings() {
    if (settingsCache) return settingsCache;

    let stored = null;
    try {
        stored = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf-8'));
    } catch {}

    settingsCache = {
        language: stored && stored.language ? resolveLanguage(stored.language) : getSystemLanguage(),
        gamePath: (stored && stored.gamePath) || getDefaultGamePath(),
        modsPath: (stored && stored.modsPath) || "",
        profilesPath: (stored && stored.profilesPath) || "",
        launchUrl: (stored && stored.launchUrl) || ""
    };

    setLanguage(settingsCache.language);
    return settingsCache;
}

// Reglages renvoyes a l'interface, avec les valeurs par defaut a afficher
function getSettingsForDisplay() {
    const settings = loadSettings();
    return {
        ...settings,
        defaultGamePath: getDefaultGamePath(),
        profilesFolderName: getProfilesFolderName(settings.gamePath, settings.language)
    };
}

// Appele quand les reglages changent (ex. vider les caches indexes par nom de profil)
function onSettingsChange(listener) {
    changeListeners.push(listener);
}

function saveSettings(settings) {
    writeJsonFile(getSettingsPath(), settings);
    settingsCache = settings;
    setLanguage(settings.language);
    for (const listener of changeListeners) {
        listener(settings);
    }
}

// Les favoris sont des liens physiques : Default et les profils doivent etre sur le meme disque
function isSameDrive(dirA, dirB) {
    return path.parse(path.resolve(dirA)).root.toLowerCase() === path.parse(path.resolve(dirB)).root.toLowerCase();
}

// Valide puis enregistre les reglages saisis dans l'interface
function updateSettings(input) {
    const language = resolveLanguage(input?.language || loadSettings().language);
    const gamePath = String(input?.gamePath || "").trim();
    const modsPath = String(input?.modsPath || "").trim();
    const profilesPath = String(input?.profilesPath || "").trim();
    const launchUrl = String(input?.launchUrl || "").trim();

    // messages dans la langue choisie
    setLanguage(language);

    let error = null;
    if (!gamePath || !isExistingDirectory(gamePath)) {
        error = t("errors.settings.gamePathNotFound");
    } else if (modsPath && !isExistingDirectory(modsPath)) {
        error = t("errors.settings.modsPathNotFound");
    } else if (profilesPath && !isExistingDirectory(profilesPath)) {
        error = t("errors.settings.profilesPathNotFound");
    } else if (launchUrl && !LAUNCH_URL_PATTERN.test(launchUrl)) {
        error = t("errors.settings.invalidLaunchUrl");
    }

    if (error) {
        setLanguage(loadSettings().language);
        return { success: false, error };
    }

    saveSettings({ language, gamePath, modsPath, profilesPath, launchUrl });

    const warnings = [];
    if (!fs.existsSync(path.join(gamePath, "gameSettings.xml"))) {
        warnings.push(t("errors.settings.noGameSettings"));
    }
    if (!isSameDrive(getModsFolder(DEFAULT_PROFILE), getModsCartesPath())) {
        warnings.push(t("errors.settings.differentDrives"));
    }

    return { success: true, warning: warnings.join(" ") || null };
}

function getBasePath() {
    return loadSettings().gamePath;
}

function getModsCartesPath() {
    const settings = loadSettings();
    return settings.profilesPath || getDefaultProfilesPath(settings.gamePath, settings.language);
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
    getSettingsForDisplay,
    onSettingsChange,
    updateSettings,
    getBasePath,
    getModsCartesPath,
    getModsFolder,
    hasCustomModsFolder
};
