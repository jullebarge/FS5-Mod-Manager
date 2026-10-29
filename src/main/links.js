// Mods favoris : liens physiques (hard links) entre Default et les profils
const { shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { DEFAULT_PROFILE, getModsFolder } = require('./settings');
const { sameFileName, includesFileName, describeFsError, isSameFile, haveSameContent } = require('./fsUtils');
const {
    listProfiles,
    readManagedLinks,
    writeManagedLinks,
    readExcludedModsFromProfile,
    writeExcludedModsToProfile
} = require('./profiles');
const { readZipModVersion } = require('./modInfo');
const { githubRegistry, externalRegistry } = require('./registry');
const { t } = require('../locales/i18n');

function getDefaultFolder() {
    return getModsFolder(DEFAULT_PROFILE);
}

function rejectDefault(profile) {
    if (!profile || profile === DEFAULT_PROFILE) {
        return { success: false, error: t("errors.notOnDefault") };
    }
    return null;
}

// Compare deux versions de mod ("1.2.0.1"...) : >0 si a est plus recente, 0 si egales ou illisibles
function compareModVersions(a, b) {
    const partsA = String(a || "").match(/\d+/g);
    const partsB = String(b || "").match(/\d+/g);
    if (!partsA || !partsB) return 0;

    const length = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < length; i++) {
        const diff = Number(partsA[i] || 0) - Number(partsB[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

// Etat d'un favori lie dans un profil par rapport a son original dans Default.
// direction : "profile-newer" quand le profil a une version plus recente (MAJ faite par le jeu),
// "default-newer" sinon. A version egale, la date de modification departage.
function getFavoriteSyncState(profilePath, defaultPath, fileName) {
    const state = { outOfSync: false, isDuplicateCopy: false, direction: null, defaultVersion: null };

    // cas courant : le lien est a jour (meme fichier physique), verifie avec un seul stat par fichier
    let profileStats;
    let defaultStats;
    try {
        const profileId = fs.statSync(profilePath, { bigint: true });
        const defaultId = fs.statSync(defaultPath, { bigint: true });
        if (profileId.ino === defaultId.ino && profileId.dev === defaultId.dev) {
            return state;
        }

        profileStats = fs.statSync(profilePath);
        defaultStats = fs.statSync(defaultPath);
    } catch {
        return state;
    }

    // meme taille, meme date (a la seconde, selon l'outil de copie) et meme contenu : copie identique
    // du favori, copiee au lieu d'etre liee, pas une autre version. "Copier les favoris" la remplacera
    // par un lien. Le contenu n'est compare que pour ces rares candidats.
    if (profileStats.size === defaultStats.size &&
        Math.floor(profileStats.mtimeMs / 1000) === Math.floor(defaultStats.mtimeMs / 1000) &&
        haveSameContent(profilePath, defaultPath)) {
        state.isDuplicateCopy = true;
        return state;
    }

    const profileVersion = readZipModVersion(fileName, profilePath, profileStats);
    const defaultVersion = readZipModVersion(fileName, defaultPath, defaultStats);

    let comparison = compareModVersions(profileVersion, defaultVersion);
    if (comparison === 0) {
        comparison = profileStats.mtimeMs - defaultStats.mtimeMs;
    }

    state.outOfSync = true;
    state.direction = comparison > 0 ? "profile-newer" : "default-newer";
    state.defaultVersion = defaultVersion;
    return state;
}

// Profils qui lient (ou excluent) un favori de Default
function getFavoriteUsage(fileName) {
    const usage = { linked: [], excluded: [] };

    let profiles = [];
    try {
        profiles = listProfiles();
    } catch {
        return usage;
    }

    for (const profile of profiles) {
        if (includesFileName(readManagedLinks(profile), fileName)) {
            usage.linked.push(profile);
        }
        if (includesFileName(readExcludedModsFromProfile(profile), fileName)) {
            usage.excluded.push(profile);
        }
    }

    return usage;
}

// Retire un favori supprime de Default de tous les profils : lien physique, liens geres, exclusions
function removeFavoriteFromProfiles(fileName) {
    const result = { removedCount: 0, errors: [] };
    const usage = getFavoriteUsage(fileName);

    for (const profile of usage.linked) {
        const managed = readManagedLinks(profile);
        const entry = managed.find((f) => sameFileName(f, fileName));

        try {
            fs.rmSync(path.join(getModsFolder(profile), entry), { force: true });
            writeManagedLinks(profile, managed.filter((f) => f !== entry));
            result.removedCount++;
        } catch (err) {
            result.errors.push(`${profile} : ${describeFsError(err)}`);
        }
    }

    for (const profile of usage.excluded) {
        try {
            writeExcludedModsToProfile(
                profile,
                readExcludedModsFromProfile(profile).filter((f) => !sameFileName(f, fileName))
            );
        } catch (err) {
            result.errors.push(`${profile} : ${describeFsError(err)}`);
        }
    }

    return result;
}

// Apres remplacement d'un favori dans Default, recree son lien physique dans chaque profil
// qui le gere (sinon le profil garde l'ancienne version), et suit un eventuel changement de nom.
function relinkFavoriteInProfiles(oldFileName, newFileName) {
    const sourcePath = path.join(getDefaultFolder(), newFileName);
    const renamed = !sameFileName(oldFileName, newFileName);
    const result = { relinkedCount: 0, errors: [] };

    let profiles = [];
    try {
        profiles = listProfiles();
    } catch (err) {
        result.errors.push(err.message);
        return result;
    }

    for (const profile of profiles) {
        const profileDir = getModsFolder(profile);

        if (renamed) {
            const excluded = [...readExcludedModsFromProfile(profile)];
            const excludedIndex = excluded.findIndex((f) => sameFileName(f, oldFileName));
            if (excludedIndex >= 0) {
                excluded[excludedIndex] = newFileName;
                try {
                    writeExcludedModsToProfile(profile, excluded);
                } catch (err) {
                    result.errors.push(`${profile} : ${describeFsError(err)}`);
                }
            }
        }

        const managed = readManagedLinks(profile);
        const index = managed.findIndex((f) => sameFileName(f, oldFileName));
        if (index < 0) continue;

        const oldPath = path.join(profileDir, managed[index]);
        const newPath = path.join(profileDir, newFileName);

        try {
            if (fs.existsSync(oldPath)) {
                fs.rmSync(oldPath, { force: true });
            }
            if (fs.existsSync(newPath) && !isSameFile(sourcePath, newPath)) {
                fs.rmSync(newPath, { force: true });
            }
            if (!fs.existsSync(newPath)) {
                fs.linkSync(sourcePath, newPath);
            }
            result.relinkedCount++;
        } catch (err) {
            result.errors.push(`${profile} : ${describeFsError(err)}`);
        }

        // si l'ancien lien n'a pas pu etre retire il reste gere, sinon on suit le nouveau nom
        // (un lien manquant sera recree par "Copier les favoris")
        if (!fs.existsSync(oldPath) || !renamed) {
            managed[index] = newFileName;
        }

        try {
            writeManagedLinks(profile, managed);
        } catch (err) {
            result.errors.push(`${profile} : ${describeFsError(err)}`);
        }
    }

    return result;
}

// "Copier les favoris dans le profil"
function repairLinks(profile) {
    const refused = rejectDefault(profile);
    if (refused) return refused;

    const profileDir = getModsFolder(profile);
    const defaultDir = getDefaultFolder();

    const excludedMods = readExcludedModsFromProfile(profile);

    if (!fs.existsSync(profileDir) || !fs.existsSync(defaultDir)) {
        return { success: false, error: t("errors.profileOrDefaultNotFound") };
    }

    // anciens liens gérés par l'app
    const previousManaged = readManagedLinks(profile);

    const defaultEntries = fs.readdirSync(defaultDir)
        .filter((file) => file.toLowerCase().endsWith(".zip"));
    const wanted = defaultEntries.filter((file) => !includesFileName(excludedMods, file));
    const skippedExcluded = defaultEntries.length - wanted.length;

    // Chaque fichier est traite independamment : une erreur (mod verrouille par le jeu...)
    // n'interrompt pas la copie, et .managed_links.json reflete toujours l'etat reel.
    const newManaged = [];
    const errors = [];
    let linkedCount = 0;
    let resyncedCount = 0;
    let keptNewerCount = 0;
    let removedDuplicates = 0;

    // 1. Retirer les anciens liens gérés qui ne sont plus des favoris à lier
    for (const file of previousManaged) {
        if (includesFileName(wanted, file)) continue;

        try {
            fs.rmSync(path.join(profileDir, file), { force: true });
        } catch (err) {
            errors.push(`${file} : ${describeFsError(err)}`);
            newManaged.push(file);
        }
    }

    // 2. Lier les favoris non exclus (les liens déjà à jour ne sont pas touchés)
    for (const file of wanted) {
        const sourcePath = path.join(defaultDir, file);
        const targetPath = path.join(profileDir, file);
        const wasManaged = includesFileName(previousManaged, file);

        try {
            if (fs.existsSync(targetPath)) {
                if (isSameFile(sourcePath, targetPath)) {
                    newManaged.push(file);
                    linkedCount++;
                    continue;
                }

                // favori mis à jour par le jeu dans ce profil : on ne l'écrase pas avec l'ancienne version
                if (wasManaged && getFavoriteSyncState(targetPath, sourcePath, file).direction === "profile-newer") {
                    newManaged.push(file);
                    keptNewerCount++;
                    continue;
                }

                // lien périmé, ou fichier local du même nom : on le remplace
                fs.rmSync(targetPath, { force: true });
                if (wasManaged) {
                    resyncedCount++;
                } else {
                    removedDuplicates++;
                }
            }

            // hard link (pas besoin d'admin, meme volume)
            fs.linkSync(sourcePath, targetPath);

            newManaged.push(file);
            linkedCount++;
        } catch (err) {
            errors.push(`${file} : ${describeFsError(err)}`);
            // un ancien lien qui n'a pas pu être retiré reste géré
            if (wasManaged && fs.existsSync(targetPath)) {
                newManaged.push(file);
            }
        }
    }

    writeManagedLinks(profile, newManaged);

    return {
        success: true,
        linkedCount,
        resyncedCount,
        keptNewerCount,
        skippedExcluded,
        removedDuplicates,
        errors
    };
}

// "Supprimer les favoris du profil"
function removeLinks(profile) {
    const refused = rejectDefault(profile);
    if (refused) return refused;

    const profileDir = getModsFolder(profile);

    if (!fs.existsSync(profileDir)) {
        return { success: false, error: t("errors.profileFolderNotFound") };
    }

    const managed = readManagedLinks(profile);
    const remaining = [];
    const errors = [];
    let removedCount = 0;

    for (const file of managed) {
        const fullPath = path.join(profileDir, file);
        try {
            if (fs.existsSync(fullPath)) {
                fs.rmSync(fullPath, { force: true });
                removedCount++;
            }
        } catch (err) {
            // lien toujours présent (fichier verrouillé...) : il reste géré
            errors.push(`${file} : ${describeFsError(err)}`);
            remaining.push(file);
        }
    }

    writeManagedLinks(profile, remaining);

    return { success: true, removedCount, errors };
}

// Exclut un favori du profil, ou le reintegre
function toggleExcludedMod(profile, fileName) {
    const refused = rejectDefault(profile);
    if (refused) return refused;

    const sourcePath = path.join(getDefaultFolder(), fileName);
    const targetPath = path.join(getModsFolder(profile), fileName);

    let excludedMods = readExcludedModsFromProfile(profile);
    let managedLinks = readManagedLinks(profile);

    if (!includesFileName(excludedMods, fileName)) {
        // copie : le tableau lu vient du cache et ne doit pas etre modifie avant l'ecriture
        excludedMods = [...excludedMods, fileName];

        if (includesFileName(managedLinks, fileName) && fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { force: true });
        }

        managedLinks = managedLinks.filter((m) => !sameFileName(m, fileName));

        writeExcludedModsToProfile(profile, excludedMods);
        writeManagedLinks(profile, managedLinks);

        return { success: true, excluded: true };
    }

    excludedMods = excludedMods.filter((m) => !sameFileName(m, fileName));

    if (!fs.existsSync(sourcePath)) {
        return { success: false, error: t("errors.favoriteNotInDefault") };
    }

    // s'il n'existe pas deja dans le profil, on recrée le hard link
    if (!fs.existsSync(targetPath)) {
        fs.linkSync(sourcePath, targetPath);
    }

    if (!includesFileName(managedLinks, fileName)) {
        managedLinks.push(fileName);
    }

    writeExcludedModsToProfile(profile, excludedMods);
    writeManagedLinks(profile, managedLinks);

    return { success: true, excluded: false };
}

// Exclut plusieurs favoris lies d'un coup (nettoyage depuis l'analyse des sauvegardes)
function excludeFavorites(profile, fileNames) {
    const refused = rejectDefault(profile);
    if (refused) return refused;

    const errors = [];
    let excludedCount = 0;

    for (const fileName of fileNames || []) {
        if (includesFileName(readExcludedModsFromProfile(profile), fileName)) continue;

        try {
            const result = toggleExcludedMod(profile, fileName);
            if (result.success) {
                excludedCount++;
            } else {
                errors.push(`${fileName} : ${result.error}`);
            }
        } catch (err) {
            errors.push(`${fileName} : ${describeFsError(err)}`);
        }
    }

    return { success: true, excludedCount, errors };
}

// Passe un mod local du profil en favori : deplace dans Default puis relie dans le profil
function promoteToCommon(profile, fileName) {
    const refused = rejectDefault(profile);
    if (refused) return refused;

    const profilePath = path.join(getModsFolder(profile), fileName);
    const defaultPath = path.join(getDefaultFolder(), fileName);

    if (!fs.existsSync(profilePath)) {
        return { success: false, error: t("errors.localModNotFound") };
    }

    // éviter d'écraser un mod existant dans Default
    if (fs.existsSync(defaultPath)) {
        return { success: false, error: t("errors.alreadyInFavorites") };
    }

    fs.renameSync(profilePath, defaultPath);
    fs.linkSync(defaultPath, profilePath);

    const managed = readManagedLinks(profile);
    if (!includesFileName(managed, fileName)) {
        managed.push(fileName);
        writeManagedLinks(profile, managed);
    }

    githubRegistry.moveToDefault(profile, fileName);
    externalRegistry.moveToDefault(profile, fileName);

    return { success: true };
}

// Remonte dans Default la version d'un favori mise a jour dans un profil (MAJ faite par le jeu),
// puis relie tous les profils qui l'utilisent a cette version.
function promoteProfileVersion(profile, fileName) {
    const refused = rejectDefault(profile);
    if (refused) return refused;

    const profilePath = path.join(getModsFolder(profile), fileName);
    const defaultPath = path.join(getDefaultFolder(), fileName);
    const tempPath = `${defaultPath}.sync-tmp`;

    if (!fs.existsSync(profilePath)) {
        return { success: false, error: t("errors.modNotInProfile") };
    }
    if (!fs.existsSync(defaultPath)) {
        return { success: false, error: t("errors.favoriteNotInDefault") };
    }
    if (!includesFileName(readManagedLinks(profile), fileName)) {
        return { success: false, error: t("errors.notALinkedFavorite") };
    }
    if (isSameFile(profilePath, defaultPath)) {
        return { success: true, relinkedCount: 0, errors: [] };
    }

    // lien temporaire puis remplacement : Default n'est jamais sans fichier
    try {
        fs.rmSync(tempPath, { force: true });
        fs.linkSync(profilePath, tempPath);
        fs.renameSync(tempPath, defaultPath);
    } catch (err) {
        try {
            fs.rmSync(tempPath, { force: true });
        } catch {}
        throw err;
    }

    const relink = relinkFavoriteInProfiles(fileName, fileName);

    return {
        success: true,
        relinkedCount: relink.relinkedCount,
        errors: relink.errors
    };
}

// Remplace la copie d'un favori dans un profil par la version de Default
async function relinkFavorite(profile, fileName) {
    const refused = rejectDefault(profile);
    if (refused) return refused;

    const profilePath = path.join(getModsFolder(profile), fileName);
    const defaultPath = path.join(getDefaultFolder(), fileName);

    if (!fs.existsSync(defaultPath)) {
        return { success: false, error: t("errors.favoriteNotInDefault") };
    }

    if (fs.existsSync(profilePath) && !isSameFile(profilePath, defaultPath)) {
        // la copie du profil n'existe peut-etre nulle part ailleurs : corbeille
        await shell.trashItem(profilePath);
    }
    if (!fs.existsSync(profilePath)) {
        fs.linkSync(defaultPath, profilePath);
    }

    const managed = readManagedLinks(profile);
    if (!includesFileName(managed, fileName)) {
        managed.push(fileName);
        writeManagedLinks(profile, managed);
    }

    return { success: true };
}

module.exports = {
    getFavoriteSyncState,
    getFavoriteUsage,
    removeFavoriteFromProfiles,
    relinkFavoriteInProfiles,
    repairLinks,
    removeLinks,
    toggleExcludedMod,
    excludeFavorites,
    promoteToCommon,
    promoteProfileVersion,
    relinkFavorite
};
