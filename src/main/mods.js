// Liste des mods d'un profil, ajout de mods externes, copie entre profils, suppression
const { shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { withZip } = require('../zipReader');
const { DEFAULT_PROFILE, getModsFolder } = require('./settings');
const { includesFileName, describeFsError, haveSameContent } = require('./fsUtils');
const { listProfiles, readManagedLinks, readExcludedModsFromProfile } = require('./profiles');
const { getModCacheKey, readModInfo, readZipModVersion } = require('./modInfo');
const { makeIconKey, getIconUrl, hasCachedIcon } = require('./icons');
const { githubRegistry, externalRegistry, matchesEntry } = require('./registry');
const { buildGithubMeta } = require('./github');
const { getFavoriteSyncState, removeFavoriteFromProfiles } = require('./links');

function buildExternalMeta(entry) {
    if (!entry) return null;

    return {
        tracked: true,
        url: entry.url,
        sourceLabel: entry.sourceLabel || "Externe"
    };
}

// Fichiers de mods d'un dossier : zips, et dossiers contenant un modDesc.xml
function listModFiles(folder) {
    return fs.readdirSync(folder)
        .map((file) => {
            const fullPath = path.join(folder, file);
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    // un mod dossier n'est valide qu'avec un modDesc.xml (statSync echoue sinon)
                    const modDescStats = fs.statSync(path.join(fullPath, "modDesc.xml"));
                    return { file, fullPath, stats, isDirectory: true, versionKey: `dir|${modDescStats.mtimeMs}` };
                }
                if (!file.toLowerCase().endsWith(".zip")) {
                    return null;
                }
                return { file, fullPath, stats, isDirectory: false, versionKey: `${stats.size}|${stats.mtimeMs}` };
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

function getModStatus(profile, isDirectory, isExcluded, isManagedCommon) {
    if (isDirectory) return "directory";
    if (profile === DEFAULT_PROFILE) return "local";
    if (isExcluded) return "common-excluded";
    if (isManagedCommon) return "common-linked";
    return "local";
}

function getMods(profile) {
    const folder = getModsFolder(profile);

    if (!fs.existsSync(folder)) return [];

    const isDefault = profile === DEFAULT_PROFILE;
    const githubEntries = githubRegistry.read();
    const externalEntries = externalRegistry.read();
    const excludedMods = isDefault ? [] : readExcludedModsFromProfile(profile);
    const managedLinks = isDefault ? [] : readManagedLinks(profile);
    const defaultFolder = getModsFolder(DEFAULT_PROFILE);

    return listModFiles(folder).map(({ file, fullPath, stats, isDirectory, versionKey }) => {
        const cacheKey = getModCacheKey(file, versionKey);
        const modInfo = readModInfo(file, fullPath, isDirectory, cacheKey);
        const iconFilename = modInfo.iconFilename || null;
        const iconKey = iconFilename ? makeIconKey(cacheKey, iconFilename) : null;

        const isManagedCommon = !isDefault && includesFileName(managedLinks, file);
        const isExcluded = !isDefault && includesFileName(excludedMods, file);
        const status = getModStatus(profile, isDirectory, isExcluded, isManagedCommon);

        let syncState = { outOfSync: false, isDuplicateCopy: false, direction: null, defaultVersion: null };
        if (isManagedCommon && !isDirectory) {
            syncState = getFavoriteSyncState(fullPath, path.join(defaultFolder, file), file);
        }

        return {
            fileName: file,
            name: modInfo.name,
            version: modInfo.version,
            author: modInfo.author,
            iconFilename,
            iconKey,
            // icone deja convertie : l'interface l'affiche directement, sans appel a getModIcon
            iconUrl: iconKey && hasCachedIcon(iconKey) ? getIconUrl(iconKey) : null,
            size: isDirectory ? 0 : stats.size,
            isSymlink: isManagedCommon,
            isDirectory,
            isOutOfSync: syncState.outOfSync,
            isDuplicateCopy: syncState.isDuplicateCopy,
            syncDirection: syncState.direction,
            defaultVersion: syncState.defaultVersion,
            status,
            fullPath,
            github: buildGithubMeta(githubRegistry.findForDisplayedMod(githubEntries, profile, file, status)),
            external: buildExternalMeta(externalRegistry.findForDisplayedMod(externalEntries, profile, file, status))
        };
    });
}

function getExcludedMods(profile) {
    if (!profile || profile === DEFAULT_PROFILE || profile === "...") {
        return [];
    }
    return readExcludedModsFromProfile(profile);
}

async function copyLocalZipToProfile(sourceZipPath, destinationPath) {
    if (!fs.existsSync(sourceZipPath)) {
        throw new Error("Le fichier ZIP sélectionné est introuvable");
    }

    if (!sourceZipPath.toLowerCase().endsWith(".zip")) {
        throw new Error("Le fichier sélectionné doit être un ZIP");
    }

    const hasModDesc = withZip(sourceZipPath, (zip) => !!zip.getEntry("modDesc.xml"));

    if (!hasModDesc) {
        throw new Error("Le ZIP sélectionné ne semble pas être un mod FS valide");
    }

    if (fs.existsSync(destinationPath)) {
        throw new Error(`Un fichier du meme nom existe deja dans le profil : ${path.basename(destinationPath)}`);
    }

    await fs.promises.copyFile(sourceZipPath, destinationPath, fs.constants.COPYFILE_EXCL);
}

async function addExternalMod(profile, zipPath, url) {
    const targetProfile = String(profile || "").trim();
    const sourceZipPath = String(zipPath || "").trim();
    const pageUrl = String(url || "").trim();

    if (!targetProfile) {
        return { success: false, error: "Profil invalide" };
    }

    if (!sourceZipPath) {
        return { success: false, error: "Aucun ZIP sélectionné" };
    }

    if (!pageUrl) {
        return { success: false, error: "Merci de saisir une URL" };
    }

    const targetFolder = getModsFolder(targetProfile);

    if (!fs.existsSync(targetFolder)) {
        return { success: false, error: "Dossier du profil introuvable" };
    }

    const fileName = path.basename(sourceZipPath);

    await copyLocalZipToProfile(sourceZipPath, path.join(targetFolder, fileName));

    externalRegistry.upsert({
        profile: targetProfile,
        fileName,
        url: pageUrl,
        sourceLabel: "Externe",
        addedAt: new Date().toISOString()
    });

    return { success: true, fileName };
}

// Un zip deja present avec exactement le meme contenu n'a pas besoin d'etre recopie
// (un mod dossier deja present est toujours considere comme une autre version)
function isIdenticalModFile(sourcePath, targetPath) {
    return !fs.statSync(sourcePath).isDirectory() && haveSameContent(sourcePath, targetPath);
}

// Profils (hors Default et profil source) vers lesquels copier un mod local, avec ce qu'ils contiennent deja
function getCopyTargets(sourceProfile, fileName) {
    const sourcePath = path.join(getModsFolder(sourceProfile), fileName);

    return listProfiles()
        .filter((profile) => profile !== sourceProfile)
        .map((profile) => {
            const targetPath = path.join(getModsFolder(profile), fileName);

            if (!fs.existsSync(targetPath)) {
                return { profile, state: "absent" };
            }
            if (isIdenticalModFile(sourcePath, targetPath)) {
                return { profile, state: "same" };
            }

            let version = null;
            try {
                const stats = fs.statSync(targetPath);
                version = stats.isDirectory() ? null : readZipModVersion(fileName, targetPath, stats);
            } catch {}

            return { profile, state: "different", version };
        });
}

// Reporte le suivi GitHub / externe du mod dans le profil cible
function copyTrackingEntries(sourceProfile, targetProfile, fileName) {
    for (const registry of [githubRegistry, externalRegistry]) {
        const entry = registry.read().find((item) => matchesEntry(item, sourceProfile, fileName));
        if (entry) {
            registry.upsert({ ...entry, profile: targetProfile });
        }
    }
}

// Copie un mod local (zip ou dossier) dans d'autres profils : vraie copie independante,
// sans lien ni favori. replaceExisting : remplace une autre version deja presente
// (envoyee a la corbeille).
async function copyModToProfiles(sourceProfile, fileName, targetProfiles, options = {}) {
    if (!sourceProfile || sourceProfile === DEFAULT_PROFILE) {
        return { success: false, error: "Pour partager un mod de Default, utilise les favoris" };
    }

    const sourcePath = path.join(getModsFolder(sourceProfile), fileName);
    if (!fs.existsSync(sourcePath)) {
        return { success: false, error: "Mod introuvable dans le profil" };
    }

    const isDirectory = fs.statSync(sourcePath).isDirectory();
    const knownProfiles = listProfiles();
    const result = { success: true, copiedCount: 0, alreadyCount: 0, replacedCount: 0, errors: [] };

    for (const targetProfile of targetProfiles || []) {
        if (targetProfile === sourceProfile || !knownProfiles.includes(targetProfile)) {
            result.errors.push(`${targetProfile} : profil invalide`);
            continue;
        }

        const targetPath = path.join(getModsFolder(targetProfile), fileName);

        try {
            if (fs.existsSync(targetPath)) {
                if (isIdenticalModFile(sourcePath, targetPath)) {
                    result.alreadyCount++;
                    copyTrackingEntries(sourceProfile, targetProfile, fileName);
                    continue;
                }
                if (!options.replaceExisting) {
                    result.errors.push(`${targetProfile} : une autre version est déjà présente`);
                    continue;
                }

                await shell.trashItem(targetPath);
                result.replacedCount++;
            }

            if (isDirectory) {
                await fs.promises.cp(sourcePath, targetPath, { recursive: true, errorOnExist: true, force: false });
            } else {
                // copie asynchrone : un gros mod ne bloque pas le reste de l'application
                await fs.promises.copyFile(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
            }

            copyTrackingEntries(sourceProfile, targetProfile, fileName);
            result.copiedCount++;
        } catch (err) {
            result.errors.push(`${targetProfile} : ${describeFsError(err)}`);
        }
    }

    return result;
}

async function deleteMod(profile, fileName, options = {}) {
    const filePath = path.join(getModsFolder(profile), fileName);

    if (!fs.existsSync(filePath)) {
        return { success: false, error: "Fichier introuvable" };
    }

    // corbeille Windows plutot que suppression definitive (fichiers et mods dossiers)
    await shell.trashItem(filePath);
    githubRegistry.remove(profile, fileName);
    externalRegistry.remove(profile, fileName);

    const cleanup = profile === DEFAULT_PROFILE && options.removeFromProfiles
        ? removeFavoriteFromProfiles(fileName)
        : { removedCount: 0, errors: [] };

    return {
        success: true,
        removedFromProfiles: cleanup.removedCount,
        profileErrors: cleanup.errors
    };
}

module.exports = {
    listModFiles,
    getMods,
    getExcludedMods,
    addExternalMod,
    getCopyTargets,
    copyModToProfiles,
    deleteMod
};
