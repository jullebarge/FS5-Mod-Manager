// Nettoyage du cache d'icones : supprime les PNG qui ne correspondent plus a aucun mod present
// (mod supprime ou mis a jour, ancien format de cle). Une icone supprimee par erreur serait
// simplement reconvertie au prochain affichage.
const path = require('path');
const fs = require('fs');
const { DEFAULT_PROFILE, getModsFolder } = require('./settings');
const { listProfiles } = require('./profiles');
const { listModFiles } = require('./mods');
const { getModCacheKey, readModInfo } = require('./modInfo');
const { getIconCacheDir, makeIconKey } = require('./icons');

const ICON_FILE_PATTERN = /^[0-9a-f]{32}\.png$/;
// fichiers temporaires de texconv laisses par une conversion interrompue
const TEMP_FILE_PATTERN = /^source_[0-9a-f]+\.png$/;
// une icone recente n'est jamais supprimee automatiquement (mod retire puis remis, conversion en cours)
const GRACE_PERIOD = 2 * 24 * 60 * 60 * 1000;
const TEMP_GRACE_PERIOD = 60 * 60 * 1000;
const STARTUP_DELAY = 60 * 1000;

// Cles des icones de tous les mods presents (Default et tous les profils).
// Leve une erreur si un dossier ne peut pas etre lu : sans liste complete, on ne supprime rien.
function collectUsedIconKeys() {
    const folders = [getModsFolder(DEFAULT_PROFILE), ...listProfiles().map((p) => getModsFolder(p))];
    const keys = new Set();

    for (const folder of folders) {
        for (const { file, fullPath, isDirectory, versionKey } of listModFiles(folder)) {
            const cacheKey = getModCacheKey(file, versionKey);
            const modInfo = readModInfo(file, fullPath, isDirectory, cacheKey);
            if (modInfo.iconFilename) {
                keys.add(makeIconKey(cacheKey, modInfo.iconFilename));
            }
        }
    }

    return keys;
}

async function listCacheFiles() {
    const dir = getIconCacheDir();
    const names = await fs.promises.readdir(dir);
    const files = [];

    for (const name of names) {
        if (!ICON_FILE_PATTERN.test(name) && !TEMP_FILE_PATTERN.test(name)) continue;

        try {
            const stats = await fs.promises.stat(path.join(dir, name));
            files.push({ name, size: stats.size, mtimeMs: stats.mtimeMs });
        } catch {}
    }

    return files;
}

// Fichiers du cache a supprimer. ignoreGracePeriod : nettoyage demande explicitement
function findUnusedFiles(files, usedKeys, ignoreGracePeriod) {
    const now = Date.now();

    return files.filter((file) => {
        if (TEMP_FILE_PATTERN.test(file.name)) {
            return now - file.mtimeMs > TEMP_GRACE_PERIOD;
        }
        if (usedKeys.has(file.name.slice(0, 32))) {
            return false;
        }
        return ignoreGracePeriod || now - file.mtimeMs > GRACE_PERIOD;
    });
}

function sumSizes(files) {
    return files.reduce((sum, file) => sum + file.size, 0);
}

async function getIconCacheStats() {
    const files = await listCacheFiles();
    const unused = findUnusedFiles(files, collectUsedIconKeys(), true);

    return {
        success: true,
        fileCount: files.length,
        totalBytes: sumSizes(files),
        unusedCount: unused.length,
        unusedBytes: sumSizes(unused)
    };
}

async function cleanIconCache({ ignoreGracePeriod = false } = {}) {
    const usedKeys = collectUsedIconKeys();

    // aucun mod trouve (dossier du jeu mal configure ?) : on ne touche a rien
    if (usedKeys.size === 0) {
        return { success: true, removedCount: 0, removedBytes: 0 };
    }

    const files = await listCacheFiles();
    const unused = findUnusedFiles(files, usedKeys, ignoreGracePeriod);
    const dir = getIconCacheDir();

    let removedCount = 0;
    let removedBytes = 0;

    for (const file of unused) {
        try {
            await fs.promises.unlink(path.join(dir, file.name));
            removedCount++;
            removedBytes += file.size;
        } catch {}
    }

    return { success: true, removedCount, removedBytes };
}

// Nettoyage automatique, une minute apres le demarrage pour ne pas ralentir l'ouverture
function scheduleIconCacheCleanup() {
    const timer = setTimeout(async () => {
        try {
            const result = await cleanIconCache();
            if (result.removedCount > 0) {
                console.log(`Cache d'icones : ${result.removedCount} icone(s) inutilisee(s) supprimee(s), ${Math.round(result.removedBytes / 1048576)} Mo liberes`);
            }
        } catch (err) {
            console.error("Erreur nettoyage cache icones:", err);
        }
    }, STARTUP_DELAY);

    // le minuteur ne doit pas, a lui seul, garder le processus en vie
    timer.unref();
}

module.exports = {
    collectUsedIconKeys,
    getIconCacheStats,
    cleanIconCache,
    scheduleIconCacheCleanup
};
