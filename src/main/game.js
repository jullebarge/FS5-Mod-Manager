const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { DEFAULT_PROFILE, getBasePath, getModsCartesPath, getModsFolder, hasCustomModsFolder } = require('./settings');

const MODS_OVERRIDE_PATTERN = /<modsDirectoryOverride\b[^>]*?(?:\/>|>\s*<\/modsDirectoryOverride>)/;
const GAME_PROCESS_PREFIX = "farmingsimulator2025";

function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function unescapeXml(value) {
    return String(value)
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function readXmlAttribute(tag, name) {
    const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
    return match ? unescapeXml(match[1]) : null;
}

function getGameSettingsPath() {
    return path.join(getBasePath(), "gameSettings.xml");
}

// Vrai si FS25 (lanceur ou jeu) tourne : le jeu reecrit gameSettings.xml en quittant
// et verrouille les mods qu'il a charges.
function isGameRunning() {
    return new Promise((resolve) => {
        execFile(
            "tasklist",
            ["/FO", "CSV", "/NH", "/FI", "IMAGENAME eq FarmingSimulator2025*"],
            { windowsHide: true },
            (error, stdout) => {
                if (error) {
                    resolve(false);
                    return;
                }

                resolve(String(stdout)
                    .split(/\r?\n/)
                    .some((line) => line.replace(/^"/, "").toLowerCase().startsWith(GAME_PROCESS_PREFIX)));
            });
    });
}

function getActiveProfileFromXML() {
    const gameSettingsPath = getGameSettingsPath();

    if (!fs.existsSync(gameSettingsPath)) {
        return DEFAULT_PROFILE;
    }

    const xml = fs.readFileSync(gameSettingsPath, "utf-8");

    // les attributs sont lus dans la balise elle-meme, quel que soit leur ordre
    const tagMatch = xml.match(MODS_OVERRIDE_PATTERN);

    if (!tagMatch || readXmlAttribute(tagMatch[0], "active") !== "true") {
        return DEFAULT_PROFILE;
    }

    const fullPath = readXmlAttribute(tagMatch[0], "directory");

    if (!fullPath) {
        return DEFAULT_PROFILE;
    }

    // redirection vers le dossier des favoris (s'il n'est pas le dossier "mods" du jeu)
    if (path.resolve(fullPath).toLowerCase() === path.resolve(getModsFolder(DEFAULT_PROFILE)).toLowerCase()) {
        return DEFAULT_PROFILE;
    }

    // seul le nom du dossier sert de nom de profil
    const normalizedPath = fullPath.replace(/[\\/]+$/, '');
    return path.basename(normalizedPath);
}

async function setActiveProfile(profileName) {
    if (await isGameRunning()) {
        return {
            success: false,
            error: "FS25 est lancé : il écraserait ce changement en quittant. Ferme le jeu puis réessaie."
        };
    }

    const xmlPath = getGameSettingsPath();
    let content = fs.readFileSync(xmlPath, 'utf-8');

    if (!MODS_OVERRIDE_PATTERN.test(content)) {
        return {
            success: false,
            error: "Balise <modsDirectoryOverride> introuvable dans gameSettings.xml"
        };
    }

    // Default avec le dossier "mods" du jeu : pas de redirection ; sinon le jeu est redirige
    // vers le dossier du profil (ou vers le dossier des favoris s'il a ete deplace)
    let targetDir = null;

    if (profileName !== DEFAULT_PROFILE) {
        targetDir = path.join(getModsCartesPath(), profileName);
    } else if (hasCustomModsFolder()) {
        targetDir = getModsFolder(DEFAULT_PROFILE);
    }

    let newTag = '<modsDirectoryOverride active="false" directory="" />';

    if (targetDir) {
        if (!fs.existsSync(targetDir)) {
            return { success: false, error: "Dossier du profil introuvable" };
        }

        const targetPath = targetDir.replace(/\\/g, "/");
        newTag = `<modsDirectoryOverride active="true" directory="${escapeXml(targetPath)}" />`;
    }

    content = content.replace(MODS_OVERRIDE_PATTERN, newTag);

    fs.writeFileSync(xmlPath, content, 'utf-8');
    return { success: true };
}

module.exports = {
    readXmlAttribute,
    unescapeXml,
    isGameRunning,
    getActiveProfileFromXML,
    setActiveProfile
};
