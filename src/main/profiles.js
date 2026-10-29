const path = require('path');
const fs = require('fs');
const { readJsonFile, writeJsonFile } = require('../utils');
const { getModsCartesPath, getModsFolder, onSettingsChange } = require('./settings');

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

const excludedModsCache = new Map();
const EXCLUDED_CACHE_TTL = 30 * 1000;

// les caches indexes par nom de profil pointaient sur l'ancien dossier du jeu
onSettingsChange(() => excludedModsCache.clear());

function listProfiles() {
    return fs
        .readdirSync(getModsCartesPath())
        .filter((name) => {
            const fullPath = path.join(getModsCartesPath(), name);
            return fs.statSync(fullPath).isDirectory();
        });
}

function validateProfileName(name) {
    if (!name) {
        return "Nom de profil vide";
    }
    if (name.toLowerCase() === "default") {
        return "« Default » est réservé aux mods favoris";
    }
    if (/[<>:"/\\|?*\x00-\x1f]/.test(name)) {
        return "Le nom ne doit pas contenir < > : \" / \\ | ? *";
    }
    if (/^\.+$/.test(name) || /[. ]$/.test(name)) {
        return "Le nom ne doit pas finir par un point ou un espace";
    }
    if (WINDOWS_RESERVED_NAMES.test(name)) {
        return "Ce nom est réservé par Windows";
    }
    return null;
}

function createProfile(profileName) {
    const cleanName = (profileName || "").trim();
    const nameError = validateProfileName(cleanName);

    if (nameError) {
        return { success: false, error: nameError };
    }

    const newPath = path.join(getModsCartesPath(), cleanName);

    if (fs.existsSync(newPath)) {
        return { success: false, error: "Le profil existe deja" };
    }

    fs.mkdirSync(newPath, { recursive: true });
    return { success: true };
}

function getManagedLinksFile(profile) {
    return path.join(getModsFolder(profile), ".managed_links.json");
}

function readManagedLinks(profile) {
    return readJsonFile(getManagedLinksFile(profile), []);
}

function writeManagedLinks(profile, links) {
    writeJsonFile(getManagedLinksFile(profile), links);
}

function getExcludeFile(profile) {
    return path.join(getModsFolder(profile), "exclude_mods.txt");
}

function readExcludedModsFromProfile(profile) {
    const cached = excludedModsCache.get(profile);
    if (cached && Date.now() - cached.cachedAt < EXCLUDED_CACHE_TTL) {
        return cached.data;
    }

    const excludeFile = getExcludeFile(profile);

    let data = [];
    if (fs.existsSync(excludeFile)) {
        try {
            data = fs.readFileSync(excludeFile, "utf-8")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
        } catch {}
    }

    excludedModsCache.set(profile, { data, cachedAt: Date.now() });
    return data;
}

function writeExcludedModsToProfile(profile, mods) {
    fs.writeFileSync(getExcludeFile(profile), mods.join("\n"), "utf-8");
    excludedModsCache.set(profile, { data: mods, cachedAt: Date.now() });
}

module.exports = {
    listProfiles,
    validateProfileName,
    createProfile,
    readManagedLinks,
    writeManagedLinks,
    readExcludedModsFromProfile,
    writeExcludedModsToProfile
};
