// Sauvegardes du jeu : mods actives par partie, association a un profil, analyse du profil
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { writeJsonFile } = require('../utils');
const { DEFAULT_PROFILE, getBasePath, getModsFolder } = require('./settings');
const { readXmlAttribute, unescapeXml } = require('./game');
const { readExcludedModsFromProfile } = require('./profiles');
const { getMods } = require('./mods');
const { getModNameFromFile, getProfileModNames, findAvailability } = require('./modLocator');
const { t } = require('../locales/i18n');

const SAVEGAME_DIR_PATTERN = /^savegame\d+$/i;
// Fichiers de la partie qui referencent les mods des objets possedes (modName="...")
const OBJECT_FILES = ["vehicles.xml", "placeables.xml", "items.xml", "handTools.xml"];
// Part minimale des mods de la partie presents dans un profil pour l'y associer automatiquement
const AUTO_MATCH_THRESHOLD = 0.8;

const savegameCache = new Map();

function getAssociationsPath() {
    return path.join(app.getPath('userData'), 'savegame-profiles.json');
}

// Associations choisies a la main : { savegame2: "Witcombe" } ("" = aucun profil)
function readAssociations() {
    try {
        const data = JSON.parse(fs.readFileSync(getAssociationsPath(), 'utf-8'));
        return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch {
        return {};
    }
}

// Les DLC (pdlc_*) sont installes avec le jeu, jamais dans un dossier de mods
function isDlc(modName) {
    return modName.toLowerCase().startsWith("pdlc_");
}

function readTag(xml, tag) {
    const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? unescapeXml(match[1]) : null;
}

function parseCareerSavegame(id, filePath) {
    const xml = fs.readFileSync(filePath, 'utf-8');

    const mods = [];
    for (const match of xml.matchAll(/<mod\s[^>]*\/?>/g)) {
        const modName = readXmlAttribute(match[0], "modName");
        if (!modName || isDlc(modName)) continue;

        mods.push({
            modName,
            title: readXmlAttribute(match[0], "title") || modName,
            version: readXmlAttribute(match[0], "version") || "?",
            required: readXmlAttribute(match[0], "required") === "true"
        });
    }

    return {
        id,
        name: readTag(xml, "savegameName") || id,
        mapTitle: readTag(xml, "mapTitle") || "",
        saveDate: readTag(xml, "saveDate") || "",
        mods
    };
}

// Toutes les sauvegardes, relues seulement si careerSavegame.xml a change
function listSavegames() {
    const basePath = getBasePath();
    let entries = [];
    try {
        entries = fs.readdirSync(basePath).filter((name) => SAVEGAME_DIR_PATTERN.test(name));
    } catch {
        return [];
    }

    const savegames = [];

    for (const id of entries) {
        const filePath = path.join(basePath, id, "careerSavegame.xml");
        let stats;
        try {
            stats = fs.statSync(filePath);
        } catch {
            continue;
        }

        const cacheKey = `${filePath}|${stats.mtimeMs}`;
        let savegame = savegameCache.get(id);

        if (!savegame || savegame.cacheKey !== cacheKey) {
            try {
                savegame = { ...parseCareerSavegame(id, filePath), cacheKey, savedAtMs: stats.mtimeMs };
                savegameCache.set(id, savegame);
            } catch (err) {
                console.error("Erreur lecture sauvegarde:", id, err);
                continue;
            }
        }

        savegames.push(savegame);
    }

    return savegames.sort((a, b) => Number(a.id.replace(/\D/g, "")) - Number(b.id.replace(/\D/g, "")));
}

// Classement des profils candidats : part des mods de la partie presents, puis, a egalite,
// un vrai profil plutot que Default (qui contient tous les favoris), puis le profil le plus "cible"
function isBetterMatch(candidate, best) {
    if (!best) return true;
    if (candidate.coverage !== best.coverage) return candidate.coverage > best.coverage;

    const candidateIsDefault = candidate.profile === DEFAULT_PROFILE;
    const bestIsDefault = best.profile === DEFAULT_PROFILE;
    if (candidateIsDefault !== bestIsDefault) return bestIsDefault;

    return candidate.share > best.share;
}

// Profil dont le dossier contient la plus grande part des mods de la partie
function findBestProfile(savegame, profileModNames) {
    const wanted = new Set(savegame.mods.map((m) => m.modName.toLowerCase()));
    if (wanted.size === 0) return null;

    let best = null;
    for (const [profile, names] of Object.entries(profileModNames)) {
        let found = 0;
        for (const name of wanted) {
            if (names.has(name)) found++;
        }
        const candidate = {
            profile,
            coverage: found / wanted.size,
            share: found / Math.max(names.size, 1)
        };

        if (isBetterMatch(candidate, best)) {
            best = candidate;
        }
    }

    return best;
}

// Liste des sauvegardes avec leur profil (manuel, sinon automatique)
function getSavegameOverview() {
    const associations = readAssociations();
    const profileModNames = getProfileModNames();

    return listSavegames().map((savegame) => {
        const best = findBestProfile(savegame, profileModNames);
        const autoProfile = best && best.coverage >= AUTO_MATCH_THRESHOLD ? best.profile : null;
        const isManual = Object.prototype.hasOwnProperty.call(associations, savegame.id);
        const manualProfile = isManual ? associations[savegame.id] || null : null;
        const profile = isManual && (manualProfile === null || profileModNames[manualProfile])
            ? manualProfile
            : autoProfile;

        return {
            id: savegame.id,
            name: savegame.name,
            mapTitle: savegame.mapTitle,
            saveDate: savegame.saveDate,
            modCount: savegame.mods.length,
            profile,
            isManual,
            bestMatch: best ? { profile: best.profile, coverage: Math.round(best.coverage * 100) } : null
        };
    });
}

// profile : nom du profil, "" pour aucun, null pour revenir a l'association automatique
function setSavegameProfile(savegameId, profile) {
    const associations = readAssociations();

    if (profile === null || profile === undefined) {
        delete associations[savegameId];
    } else {
        associations[savegameId] = String(profile);
    }

    writeJsonFile(getAssociationsPath(), associations);
    return { success: true };
}

// Mods qui ont des objets dans la partie (vehicules, batiments, objets) : les retirer les supprimerait
function readModsWithObjects(savegameId) {
    const names = new Set();

    for (const file of OBJECT_FILES) {
        let xml;
        try {
            xml = fs.readFileSync(path.join(getBasePath(), savegameId, file), 'utf-8');
        } catch {
            continue;
        }

        for (const match of xml.matchAll(/modName="([^"]+)"/g)) {
            names.add(unescapeXml(match[1]).toLowerCase());
        }
    }

    return names;
}

function analyzeSavegame(profile, savegameId) {
    const savegames = listSavegames();
    const savegame = savegames.find((s) => s.id === savegameId);

    if (!savegame) {
        return { success: false, error: t("errors.savegameNotFound") };
    }

    const profileModNames = getProfileModNames();
    const excludedMods = profile === DEFAULT_PROFILE ? [] : readExcludedModsFromProfile(profile);
    const modsWithObjects = readModsWithObjects(savegameId);
    const profileMods = getMods(profile);
    const installedByName = new Map(profileMods.map((m) => [getModNameFromFile(m.fileName).toLowerCase(), m]));
    const savedByName = new Map(savegame.mods.map((m) => [m.modName.toLowerCase(), m]));

    // autres parties du meme profil : un mod inutilise ici peut leur servir
    const otherSavegames = getSavegameOverview()
        .filter((s) => s.profile === profile && s.id !== savegameId)
        .map((s) => savegames.find((full) => full.id === s.id))
        .filter(Boolean);

    const missing = savegame.mods
        .filter((m) => !installedByName.has(m.modName.toLowerCase()))
        .map((m) => ({
            ...m,
            hasObjects: modsWithObjects.has(m.modName.toLowerCase()),
            availability: findAvailability(m.modName, profile, excludedMods, profileModNames)
        }));

    const unused = profileMods
        .filter((m) => !savedByName.has(getModNameFromFile(m.fileName).toLowerCase()))
        .map((m) => {
            const lower = getModNameFromFile(m.fileName).toLowerCase();
            let modifiedAtMs = 0;
            try {
                modifiedAtMs = fs.statSync(m.fullPath).mtimeMs;
            } catch {}

            return {
                fileName: m.fileName,
                name: m.name,
                version: m.version,
                status: m.status,
                size: m.size,
                isDirectory: m.isDirectory,
                // ajoute apres la derniere sauvegarde : la partie ne l'a pas encore vu
                isNew: modifiedAtMs > savegame.savedAtMs,
                usedBy: otherSavegames
                    .filter((other) => other.mods.some((om) => om.modName.toLowerCase() === lower))
                    .map((other) => other.name)
            };
        });

    const versionMismatch = profileMods
        .map((m) => ({ mod: m, saved: savedByName.get(getModNameFromFile(m.fileName).toLowerCase()) }))
        .filter(({ mod, saved }) => saved && saved.version !== "?" && mod.version !== "?" && saved.version !== mod.version)
        .map(({ mod, saved }) => ({
            fileName: mod.fileName,
            name: mod.name,
            installedVersion: mod.version,
            savedVersion: saved.version
        }));

    return {
        success: true,
        savegame: {
            id: savegame.id,
            name: savegame.name,
            mapTitle: savegame.mapTitle,
            saveDate: savegame.saveDate,
            modCount: savegame.mods.length
        },
        profileModCount: profileMods.length,
        otherSavegames: otherSavegames.map((s) => s.name),
        missing,
        unused,
        versionMismatch
    };
}

module.exports = {
    getSavegameOverview,
    setSavegameProfile,
    analyzeSavegame
};
