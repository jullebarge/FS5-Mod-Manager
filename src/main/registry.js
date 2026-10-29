const { app } = require('electron');
const path = require('path');
const { readJsonFile, writeJsonFile, ensureDir } = require('../utils');
const { sameFileName } = require('./fsUtils');
const { DEFAULT_PROFILE } = require('./settings');

const REGISTRY_CACHE_TTL = 30 * 1000;

// Les appelants modifient le registre avant de l'ecrire : on leur donne une copie du cache
function copyRegistry(data) {
    return data.map((entry) => ({ ...entry }));
}

function matchesEntry(item, profile, fileName) {
    return item.profile === profile && sameFileName(item.fileName, fileName);
}

// Registre JSON des mods suivis (GitHub, externes), une entree par profil + fichier
function createRegistry(fileName) {
    let cache = { data: [], cachedAt: 0 };

    function getPath() {
        const dir = app.getPath("userData");
        ensureDir(dir);
        return path.join(dir, fileName);
    }

    function read() {
        if (Date.now() - cache.cachedAt < REGISTRY_CACHE_TTL && cache.data.length > 0) {
            return copyRegistry(cache.data);
        }
        const data = readJsonFile(getPath(), []);
        cache = { data, cachedAt: Date.now() };
        return copyRegistry(data);
    }

    function write(data) {
        writeJsonFile(getPath(), data);
        cache = { data, cachedAt: Date.now() };
    }

    function upsert(entry) {
        const registry = read();
        const index = registry.findIndex((item) => matchesEntry(item, entry.profile, entry.fileName));

        if (index >= 0) {
            registry[index] = { ...registry[index], ...entry };
        } else {
            registry.push(entry);
        }

        write(registry);
    }

    function remove(profile, fileName) {
        write(read().filter((item) => !matchesEntry(item, profile, fileName)));
    }

    // Un mod local est suivi dans son profil, un favori (lie ou exclu) l'est dans Default
    function findForDisplayedMod(registry, profile, fileName, status) {
        if (profile === DEFAULT_PROFILE || status === "local") {
            return registry.find((item) => matchesEntry(item, profile, fileName)) || null;
        }

        if (status === "common-linked" || status === "common-excluded") {
            return registry.find((item) => matchesEntry(item, DEFAULT_PROFILE, fileName)) || null;
        }

        return null;
    }

    // Deplace l'entree d'un mod promu en favori vers Default
    function moveToDefault(profile, fileName) {
        const registry = read();
        const entry = registry.find((item) => matchesEntry(item, profile, fileName));

        if (entry) {
            entry.profile = DEFAULT_PROFILE;
            write(registry);
        }
    }

    return { read, write, upsert, remove, findForDisplayedMod, moveToDefault };
}

const githubRegistry = createRegistry("github-mods.json");
const externalRegistry = createRegistry("external-mods.json");

module.exports = {
    matchesEntry,
    githubRegistry,
    externalRegistry
};
