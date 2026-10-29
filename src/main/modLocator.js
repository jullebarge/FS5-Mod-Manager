// Retrouver un mod par son nom (modName = nom du zip sans extension, ou du dossier) dans
// Default et dans les profils : sert aux sauvegardes et aux dependances
const fs = require('fs');
const { DEFAULT_PROFILE, getModsFolder } = require('./settings');
const { listProfiles } = require('./profiles');
const { includesFileName } = require('./fsUtils');

function getModNameFromFile(fileName) {
    return fileName.replace(/\.zip$/i, "");
}

// Mods d'un dossier : nom en minuscules -> nom du fichier (zip ou dossier)
function readModNames(folder) {
    try {
        return new Map(
            fs.readdirSync(folder, { withFileTypes: true })
                .filter((entry) => entry.isDirectory() || entry.name.toLowerCase().endsWith(".zip"))
                .map((entry) => [getModNameFromFile(entry.name).toLowerCase(), entry.name])
        );
    } catch {
        return new Map();
    }
}

// { Default: Map, profil: Map, ... }
function getProfileModNames() {
    const result = { [DEFAULT_PROFILE]: readModNames(getModsFolder(DEFAULT_PROFILE)) };

    let profiles = [];
    try {
        profiles = listProfiles();
    } catch {}

    for (const profile of profiles) {
        result[profile] = readModNames(getModsFolder(profile));
    }

    return result;
}

// Ou trouver un mod absent du profil :
//   excluded-favorite / favorite : dans Default (exclu ou simplement pas encore lie)
//   other-profile : copie locale dans un autre profil (profile + fileName)
//   none : introuvable
function findAvailability(modName, profile, excludedMods, profileModNames) {
    const lower = modName.toLowerCase();
    const defaultFile = profileModNames[DEFAULT_PROFILE].get(lower);

    if (profile !== DEFAULT_PROFILE && defaultFile) {
        const excluded = includesFileName(excludedMods, defaultFile) || includesFileName(excludedMods, modName);
        return { type: excluded ? "excluded-favorite" : "favorite", fileName: defaultFile };
    }

    const otherProfile = Object.keys(profileModNames)
        .find((name) => name !== profile && name !== DEFAULT_PROFILE && profileModNames[name].has(lower));

    return otherProfile
        ? { type: "other-profile", profile: otherProfile, fileName: profileModNames[otherProfile].get(lower) }
        : { type: "none" };
}

module.exports = {
    getModNameFromFile,
    readModNames,
    getProfileModNames,
    findAvailability
};
