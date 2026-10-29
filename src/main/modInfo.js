const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { writeJsonFile, getModInfo, getModInfoFromDirectory } = require('../utils');
const { withZip } = require('../zipReader');

// Cache persistant des infos de mods (nom, version, auteur, icone).
// La cle contient taille + date de modification : une entree n'est jamais perimee,
// et un favori lie dans un profil partage la meme entree que son original dans Default.
const MOD_INFO_CACHE_VERSION = 1;
const MOD_INFO_CACHE_MAX_AGE = 90 * 24 * 60 * 60 * 1000;
const MOD_INFO_CACHE_TOUCH_INTERVAL = 24 * 60 * 60 * 1000;
let modInfoCache = null;
let modInfoCacheSaveTimer = null;

function getModInfoCachePath() {
    return path.join(app.getPath('userData'), 'mod-info-cache.json');
}

function loadModInfoCache() {
    if (modInfoCache) return modInfoCache;

    modInfoCache = new Map();

    try {
        const raw = JSON.parse(fs.readFileSync(getModInfoCachePath(), 'utf-8'));

        if (raw && raw.version === MOD_INFO_CACHE_VERSION && raw.entries) {
            const minSeenAt = Date.now() - MOD_INFO_CACHE_MAX_AGE;

            for (const [key, value] of Object.entries(raw.entries)) {
                if (value && value.data && value.seenAt >= minSeenAt) {
                    modInfoCache.set(key, value);
                }
            }
        }
    } catch {}

    return modInfoCache;
}

function saveModInfoCache() {
    if (modInfoCacheSaveTimer) {
        clearTimeout(modInfoCacheSaveTimer);
        modInfoCacheSaveTimer = null;
    }

    if (!modInfoCache) return;

    try {
        const payload = {
            version: MOD_INFO_CACHE_VERSION,
            entries: Object.fromEntries(modInfoCache)
        };
        writeJsonFile(getModInfoCachePath(), payload, false);
    } catch (err) {
        console.error("Erreur sauvegarde cache mods:", err);
    }
}

function scheduleModInfoCacheSave() {
    if (modInfoCacheSaveTimer) return;
    modInfoCacheSaveTimer = setTimeout(saveModInfoCache, 2000);
}

// Sauvegarde immediate si une ecriture differee est en attente (fermeture de l'appli)
function flushModInfoCache() {
    if (modInfoCacheSaveTimer) {
        saveModInfoCache();
    }
}

function getModCacheKey(fileName, versionKey) {
    return `${fileName.toLowerCase()}|${versionKey}`;
}

function getCachedModInfo(cacheKey) {
    const cached = loadModInfoCache().get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.seenAt > MOD_INFO_CACHE_TOUCH_INTERVAL) {
        cached.seenAt = Date.now();
        scheduleModInfoCacheSave();
    }

    return cached.data;
}

function setCachedModInfo(cacheKey, data) {
    loadModInfoCache().set(cacheKey, {
        data,
        seenAt: Date.now()
    });
    scheduleModInfoCacheSave();
}

function readModInfo(file, fullPath, isDirectory, cacheKey) {
    let modInfo = getCachedModInfo(cacheKey);
    if (modInfo) return modInfo;

    try {
        modInfo = isDirectory
            ? getModInfoFromDirectory(fullPath, file)
            : withZip(fullPath, (zip) => getModInfo(zip, file));
        setCachedModInfo(cacheKey, modInfo);
    } catch (err) {
        console.error(isDirectory ? "Erreur lecture mod dossier:" : "Erreur lecture mod:", file, err);
        modInfo = { name: file, version: "?", author: "?" };
    }

    return modInfo;
}

function readZipModVersion(file, fullPath, stats) {
    const cacheKey = getModCacheKey(file, `${stats.size}|${stats.mtimeMs}`);
    return readModInfo(file, fullPath, false, cacheKey).version;
}

module.exports = {
    flushModInfoCache,
    getModCacheKey,
    readModInfo,
    readZipModVersion
};
