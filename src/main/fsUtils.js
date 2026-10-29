const fs = require('fs');
const { t } = require('../locales/i18n');

function sameFileName(a, b) {
    return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

// Windows ignore la casse des noms de fichiers : les listes (liens geres, exclusions) aussi
function includesFileName(list, fileName) {
    return list.some((item) => sameFileName(item, fileName));
}

// Message court pour l'utilisateur (les messages Node contiennent le chemin complet)
function describeFsError(err) {
    switch (err && err.code) {
        case "EBUSY":
        case "EPERM":
        case "EACCES":
            return t("errors.fs.busy");
        case "EISDIR":
        case "ERR_FS_EISDIR":
            return t("errors.fs.isDirectory");
        case "ENOENT":
            return t("errors.fs.notFound");
        default:
            return (err && err.message) || String(err);
    }
}

// Vrai si les deux chemins designent le meme fichier physique (hard link a jour)
function isSameFile(pathA, pathB) {
    try {
        const a = fs.statSync(pathA, { bigint: true });
        const b = fs.statSync(pathB, { bigint: true });
        return a.ino === b.ino && a.dev === b.dev;
    } catch {
        return false;
    }
}

const contentComparisonCache = new Map();
const COMPARE_CHUNK_SIZE = 1024 * 1024;

// Vrai si les deux fichiers ont exactement le meme contenu (lecture par blocs, arret a la
// premiere difference). Resultat garde en cache tant que les fichiers ne changent pas.
function haveSameContent(pathA, pathB) {
    let statsA;
    let statsB;
    try {
        statsA = fs.statSync(pathA, { bigint: true });
        statsB = fs.statSync(pathB, { bigint: true });
    } catch {
        return false;
    }

    if (statsA.size !== statsB.size) return false;

    const cacheKey = [statsA.ino, statsA.mtimeNs, statsB.ino, statsB.mtimeNs, statsA.size].join("|");
    if (contentComparisonCache.has(cacheKey)) {
        return contentComparisonCache.get(cacheKey);
    }

    let fdA = null;
    let fdB = null;
    let same = true;

    try {
        fdA = fs.openSync(pathA, "r");
        fdB = fs.openSync(pathB, "r");
        const bufferA = Buffer.alloc(COMPARE_CHUNK_SIZE);
        const bufferB = Buffer.alloc(COMPARE_CHUNK_SIZE);

        for (;;) {
            const readA = fs.readSync(fdA, bufferA, 0, COMPARE_CHUNK_SIZE, null);
            const readB = fs.readSync(fdB, bufferB, 0, COMPARE_CHUNK_SIZE, null);

            if (readA !== readB || !bufferA.subarray(0, readA).equals(bufferB.subarray(0, readB))) {
                same = false;
                break;
            }
            if (readA === 0) break;
        }
    } catch {
        same = false;
    } finally {
        if (fdA !== null) fs.closeSync(fdA);
        if (fdB !== null) fs.closeSync(fdB);
    }

    contentComparisonCache.set(cacheKey, same);
    return same;
}

module.exports = {
    sameFileName,
    includesFileName,
    describeFsError,
    isSameFile,
    haveSameContent
};
