const fs = require('fs');

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
            return "fichier utilisé ou protégé";
        case "EISDIR":
        case "ERR_FS_EISDIR":
            return "un dossier porte ce nom";
        case "ENOENT":
            return "fichier introuvable";
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

module.exports = {
    sameFileName,
    includesFileName,
    describeFsError,
    isSameFile
};
