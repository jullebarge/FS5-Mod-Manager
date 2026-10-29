const {
    app,
    BrowserWindow,
    ipcMain,
	shell,
	dialog
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const execFile = require('child_process').execFile;
const https = require('https');
const {
    readJsonFile,
    writeJsonFile,
    ensureDir,
    getModInfo,
    getModInfoFromDirectory
} = require('./utils');
const { withZip } = require('./zipReader');

const basePath = "C:/Users/Julien/Documents/My Games/FarmingSimulator2025";

const modsCartesPath = path.join(basePath, "modsCartes");
const conversionLocks = new Map();

// Cache persistant des infos de mods (nom, version, auteur, icone).
// La cle contient taille + date de modification : une entree n'est jamais perimee,
// et un favori lie dans un profil partage la meme entree que son original dans Default.
const MOD_INFO_CACHE_VERSION = 1;
const MOD_INFO_CACHE_MAX_AGE = 90 * 24 * 60 * 60 * 1000;
const MOD_INFO_CACHE_TOUCH_INTERVAL = 24 * 60 * 60 * 1000;
let modInfoCache = null;
let modInfoCacheSaveTimer = null;

const iconCache = new Map();
const ICON_CACHE_TTL = 30 * 60 * 1000;

const registryCache = {
    github: { data: [], cachedAt: 0 },
    external: { data: [], cachedAt: 0 }
};
const excludedModsCache = new Map();
const REGISTRY_CACHE_TTL = 30 * 1000;

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

function getIconPath() {
    if (!app.isPackaged) {
        return path.join(app.getAppPath(), 'src', 'assets', 'icon.ico');
    }

    return path.join(process.resourcesPath, 'assets', 'icon.ico');
}

function getModsFolder(profileName) {
    if (!profileName || profileName === "Default" || profileName === "...") {
        return path.join(basePath, "mods");
    }

    return path.join(modsCartesPath, profileName);
}

function getTexconvPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "texconv.exe");
  } else {
    return path.join(app.getAppPath(), 'assets', 'texconv.exe');
  }
}

function getIconCacheDir() {
    const dir = path.join(app.getPath('userData'), 'icon-cache');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }
    return dir;
}

// La cle d'icone derive de la cle du cache des mods : une MAJ du mod donne une nouvelle icone.
function makeIconKey(modCacheKey, iconFilename) {
    return crypto
        .createHash('md5')
        .update(`${modCacheKey}|${iconFilename}|256`)
        .digest('hex');
}

function toPngDataUrl(buffer) {
    return `data:image/png;base64,${buffer.toString('base64')}`;
}

function readCachedIconFile(iconKey) {
    const pngPath = path.join(getIconCacheDir(), `${iconKey}.png`);

    try {
        return toPngDataUrl(fs.readFileSync(pngPath));
    } catch {
        return null;
    }
}

function readZipModIcon(fullPath, iconFile) {
    return withZip(fullPath, (zip) => {
        const baseName = iconFile.replace(/\.[^/.]+$/, "");

        let entry = zip.getEntry(baseName + ".dds");

        if (!entry) {
            entry = zip.getEntry(iconFile);
        }

        if (!entry) {
            entry = zip.getEntries().find(e =>
                    !e.isDirectory &&
                    e.entryName.toLowerCase().endsWith(baseName.toLowerCase() + ".dds"));
        }

        return entry ? zip.readEntry(entry) : null;
    });
}

function readDirectoryModIcon(fullPath, iconFile) {
    const baseName = iconFile.replace(/\.[^/.]+$/, "");

    let iconPath = path.join(fullPath, baseName + ".dds");
    if (!fs.existsSync(iconPath)) {
        iconPath = path.join(fullPath, iconFile);
    }
    if (!fs.existsSync(iconPath)) {
        const dirFiles = fs.readdirSync(fullPath);
        const found = dirFiles.find(f =>
            !fs.statSync(path.join(fullPath, f)).isDirectory() &&
            f.toLowerCase().endsWith(baseName.toLowerCase() + ".dds"));
        if (found) {
            iconPath = path.join(fullPath, found);
        }
    }

    if (!fs.existsSync(iconPath)) return null;

    return fs.readFileSync(iconPath);
}

function getActiveProfileFromXML() {
    const gameSettingsPath = path.join(basePath, "gameSettings.xml");

    if (!fs.existsSync(gameSettingsPath)) {
        return "Default";
    }

    const xml = fs.readFileSync(gameSettingsPath, "utf-8");

    const activeMatch = xml.match(/modsDirectoryOverride active="(true|false)"/);

    if (!activeMatch || activeMatch[1] === "false") {
        return "Default";
    }

    const dirMatch = xml.match(/directory="([^"]+)"/);

    if (!dirMatch) {
        return "Default";
    }

    const fullPath = dirMatch[1];

    // 🔥 récupère juste le nom du dossier
    const normalizedPath = fullPath.replace(/[\\/]+$/, '');
    const profileName = path.basename(normalizedPath);

    return profileName;
}

async function convertDdsToPngWithTexconv(ddsBuffer, iconKey) {
    try {
        const texconvPath = getTexconvPath();
		//console.log("texconv path =", texconvPath);

        if (!fs.existsSync(texconvPath)) {
            //console.error("texconv.exe introuvable :", texconvPath);
            return null;
        }

        const cacheDir = getIconCacheDir();
        const finalPngPath = path.join(cacheDir, `${iconKey}.png`);

        // 1. Le cache disque est verifie par l'appelant, avant meme d'ouvrir le zip

        // 2. Si une conversion est deja en cours pour cette image, on attend son resultat
        if (conversionLocks.has(finalPngPath)) {
            return await conversionLocks.get(finalPngPath);
        }

        // 3. On cree une promesse de conversion unique
        const conversionPromise = (async() => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs25dds-'));
            const uniqueId = crypto.randomBytes(6).toString('hex');

            const ddsPath = path.join(tempDir, `source_${uniqueId}.dds`);
            const tempPngPath = path.join(cacheDir, `source_${uniqueId}.png`);

            try {
                fs.writeFileSync(ddsPath, ddsBuffer);

                await new Promise((resolve, reject) => {
                    execFile(
                        texconvPath,
                        [
                            '-ft', 'png',
                            '-f', 'R8G8B8A8_UNORM_SRGB',
                            '-srgb',
                            '-w', '256',
                            '-h', '256',
                            '-y',
                            '-o', cacheDir,
                            ddsPath
                        ], {
                        windowsHide: true
                    },
                        (error) => {
                        if (error)
                            reject(error);
                        else
                            resolve();
                    });
                });

                if (!fs.existsSync(tempPngPath)) {
                    console.error("PNG non genere :", tempPngPath);
                    return null;
                }

                // 4. Copie vers le cache final (plus fiable que rename)
                fs.copyFileSync(tempPngPath, finalPngPath);

                return toPngDataUrl(fs.readFileSync(finalPngPath));
            } catch (err) {
                console.error("Erreur conversion texconv :", err);
                return null;
            } finally {
                // nettoyage
                try {
                    if (fs.existsSync(tempPngPath))
                        fs.unlinkSync(tempPngPath);
                } catch {}

                try {
                    if (fs.existsSync(ddsPath))
                        fs.unlinkSync(ddsPath);
                } catch {}

                try {
                    if (fs.existsSync(tempDir))
                        fs.rmSync(tempDir, {
                            recursive: true,
                            force: true
                        });
                } catch {}
            }
        })();

        // 5. On pose le lock avant de lancer reellement
        conversionLocks.set(finalPngPath, conversionPromise);

        const result = await conversionPromise;

        // 6. On retire le lock une fois termine
        conversionLocks.delete(finalPngPath);

        return result;
    } catch (err) {
        console.error("Erreur conversion texconv :", err);
        return null;
    }
}

function getManagedLinksFile(profile) {
  return path.join(getModsFolder(profile), ".managed_links.json");
}

function readManagedLinks(profile) {
  const file = getManagedLinksFile(profile);
  return readJsonFile(file, []);
}

function writeManagedLinks(profile, links) {
  const file = getManagedLinksFile(profile);
  writeJsonFile(file, links);
}

function readExcludedModsFromProfile(profile) {
  const cached = excludedModsCache.get(profile);
  if (cached && Date.now() - cached.cachedAt < REGISTRY_CACHE_TTL) {
    return cached.data;
  }

  const profileDir = getModsFolder(profile);
  const excludeFile = path.join(profileDir, "exclude_mods.txt");

  let data = [];
  if (fs.existsSync(excludeFile)) {
    try {
      data = fs.readFileSync(excludeFile, "utf-8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {}
  }

  excludedModsCache.set(profile, { data, cachedAt: Date.now() });
  return data;
}

function writeExcludedModsToProfile(profile, mods) {
  const profileDir = getModsFolder(profile);
  const excludeFile = path.join(profileDir, "exclude_mods.txt");
  fs.writeFileSync(excludeFile, mods.join("\n"), "utf-8");
  excludedModsCache.set(profile, { data: mods, cachedAt: Date.now() });
}

function parseGitHubRepoUrl(repoUrl) {
    const cleanUrl = (repoUrl || "").trim();

    const match = cleanUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/?#]+?)(?:\.git)?(?:\/|$)/i);

    if (!match) {
        throw new Error("URL GitHub invalide. Format attendu : https://github.com/owner/repo");
    }

    return {
        owner: match[1],
        repo: match[2]
    };
}

function githubRequestJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                "User-Agent": "FS25-Mod-Manager",
                "Accept": "application/vnd.github+json"
            }
        }, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    if (res.statusCode && res.statusCode >= 400) {
                        let message = `Erreur GitHub (${res.statusCode})`;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed && parsed.message) {
                                message = `Erreur GitHub : ${parsed.message}`;
                            }
                        } catch {}

                        reject(new Error(message));
                        return;
                    }

                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on("error", reject);
    });
}

async function fetchLatestGitHubRelease(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    return await githubRequestJson(url);
}

async function fetchGitHubReleases(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
    return await githubRequestJson(url);
}

async function fetchGitHubReleaseForInstall(owner, repo, includePrereleases) {
    if (!includePrereleases) {
        return await fetchLatestGitHubRelease(owner, repo);
    }

    const releases = await fetchGitHubReleases(owner, repo);
    const release = Array.isArray(releases)
        ? releases.find((r) => r && !r.draft)
        : null;

    if (!release) {
        throw new Error("Aucune release exploitable trouvee sur ce depot");
    }

    return release;
}

function isProbablySourceZip(assetName) {
    const name = (assetName || "").toLowerCase();

    return (
        name.includes("source") ||
        name.includes("sources") ||
        name.includes("-src") ||
        name.includes("_src") ||
        name.endsWith(".src.zip")
    );
}

function selectGithubModAsset(release) {
    if (!release || !Array.isArray(release.assets) || release.assets.length === 0) {
        throw new Error("Cette release ne contient aucun asset");
    }

    const zipAssets = release.assets.filter((asset) =>
        asset &&
        asset.name &&
        asset.browser_download_url &&
        asset.name.toLowerCase().endsWith(".zip")
    );

    if (zipAssets.length === 0) {
        throw new Error("Aucun fichier ZIP trouve dans la release");
    }

    const nonSourceZipAssets = zipAssets.filter((asset) => !isProbablySourceZip(asset.name));

    if (nonSourceZipAssets.length === 1) {
        return nonSourceZipAssets[0];
    }

    if (nonSourceZipAssets.length > 1) {
        const fs25ZipAssets = nonSourceZipAssets.filter((asset) =>
            /^fs25_.*\.zip$/i.test(asset.name)
        );

        if (fs25ZipAssets.length === 1) {
            return fs25ZipAssets[0];
        }

        throw new Error("Plusieurs ZIP valides ont ete trouves dans la release");
    }

    if (zipAssets.length === 1) {
        return zipAssets[0];
    }

    const fs25ZipAssets = zipAssets.filter((asset) =>
        /^fs25_.*\.zip$/i.test(asset.name)
    );

    if (fs25ZipAssets.length === 1) {
        return fs25ZipAssets[0];
    }

    throw new Error("Impossible de determiner automatiquement quel ZIP correspond au mod");
}

function getGithubRegistryPath() {
    const dir = app.getPath("userData");
    ensureDir(dir);
    return path.join(dir, "github-mods.json");
}

function readGithubRegistry() {
    if (Date.now() - registryCache.github.cachedAt < REGISTRY_CACHE_TTL && registryCache.github.data.length > 0) {
        return registryCache.github.data;
    }
    const data = readJsonFile(getGithubRegistryPath(), []);
    registryCache.github = { data, cachedAt: Date.now() };
    return data;
}

function writeGithubRegistry(data) {
    writeJsonFile(getGithubRegistryPath(), data);
    registryCache.github = { data, cachedAt: Date.now() };
}

function sameFileName(a, b) {
    return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function upsertGithubRegistryEntry(entry) {
    const registry = readGithubRegistry();

    const index = registry.findIndex(
        (item) => item.profile === entry.profile && sameFileName(item.fileName, entry.fileName)
    );

    if (index >= 0) {
        registry[index] = {
            ...registry[index],
            ...entry
        };
    } else {
        registry.push(entry);
    }

    writeGithubRegistry(registry);
}

function removeGithubRegistryEntry(profile, fileName) {
    const registry = readGithubRegistry().filter(
        (item) => !(item.profile === profile && sameFileName(item.fileName, fileName))
    );

    writeGithubRegistry(registry);
}

function findTrackedGithubEntryForDisplayedMod(displayedProfile, fileName) {
    const registry = readGithubRegistry();

    let entry = registry.find(
        (item) => item.profile === displayedProfile && sameFileName(item.fileName, fileName)
    );

    if (entry) {
        return entry;
    }

    if (displayedProfile !== "Default") {
        entry = registry.find(
            (item) => item.profile === "Default" && sameFileName(item.fileName, fileName)
        );

        if (entry) {
            return entry;
        }
    }

    return null;
}

function getTrackedEntryForDisplayedMod(registry, profile, fileName, status) {
    if (profile === "Default" || status === "local") {
        return registry.find(
            (item) => item.profile === profile && sameFileName(item.fileName, fileName)
        ) || null;
    }

    if (status === "common-linked" || status === "common-excluded") {
        return registry.find(
            (item) => item.profile === "Default" && sameFileName(item.fileName, fileName)
        ) || null;
    }

    return null;
}

function buildGithubMeta(entry) {
    if (!entry) {
        return null;
    }

    return {
        tracked: true,
        repoUrl: entry.repoUrl,
        repo: `${entry.owner}/${entry.repo}`,
        includePrereleases: !!entry.includePrereleases,
        updateAvailable: !!entry.updateAvailable,
        lastCheckedAt: entry.lastCheckedAt || null,
        lastError: entry.lastError || null,
        installedReleaseTag: entry.installedReleaseTag || null,
        latestReleaseTag: entry.latestReleaseTag || null
    };
}

function getTrackedEntriesForProfile(profile) {
    const registry = readGithubRegistry();

    if (profile === "Default") {
        return registry.filter((item) => item.profile === "Default");
    }

    const managedLinks = readManagedLinks(profile);

    return registry.filter(
        (item) =>
            item.profile === profile ||
            (item.profile === "Default" && managedLinks.includes(item.fileName))
    );
}

function getExternalRegistryPath() {
    const dir = app.getPath("userData");
    ensureDir(dir);
    return path.join(dir, "external-mods.json");
}

function readExternalRegistry() {
    if (Date.now() - registryCache.external.cachedAt < REGISTRY_CACHE_TTL && registryCache.external.data.length > 0) {
        return registryCache.external.data;
    }
    const data = readJsonFile(getExternalRegistryPath(), []);
    registryCache.external = { data, cachedAt: Date.now() };
    return data;
}

function writeExternalRegistry(data) {
    writeJsonFile(getExternalRegistryPath(), data);
    registryCache.external = { data, cachedAt: Date.now() };
}

function upsertExternalRegistryEntry(entry) {
    const registry = readExternalRegistry();

    const index = registry.findIndex(
        (item) => item.profile === entry.profile && sameFileName(item.fileName, entry.fileName)
    );

    if (index >= 0) {
        registry[index] = {
            ...registry[index],
            ...entry
        };
    } else {
        registry.push(entry);
    }

    writeExternalRegistry(registry);
}

function removeExternalRegistryEntry(profile, fileName) {
    const registry = readExternalRegistry().filter(
        (item) => !(item.profile === profile && sameFileName(item.fileName, fileName))
    );

    writeExternalRegistry(registry);
}

function getTrackedExternalEntryForDisplayedMod(registry, profile, fileName, status) {
    if (profile === "Default" || status === "local") {
        return registry.find(
            (item) => item.profile === profile && sameFileName(item.fileName, fileName)
        ) || null;
    }

    if (status === "common-linked" || status === "common-excluded") {
        return registry.find(
            (item) => item.profile === "Default" && sameFileName(item.fileName, fileName)
        ) || null;
    }

    return null;
}

function buildExternalMeta(entry) {
    if (!entry) return null;

    return {
        tracked: true,
        url: entry.url,
        sourceLabel: entry.sourceLabel || "Externe"
    };
}

function copyLocalZipToProfile(sourceZipPath, destinationPath) {
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

    fs.copyFileSync(sourceZipPath, destinationPath);
}

function downloadFile(url, destinationPath) {
    return new Promise((resolve, reject) => {
        const tempPath = destinationPath + ".download";

        const request = https.get(url, {
            headers: {
                "User-Agent": "FS25-Mod-Manager",
                "Accept": "application/octet-stream"
            }
        }, (response) => {
            // redirection
            if (
                response.statusCode &&
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                response.resume();
                downloadFile(response.headers.location, destinationPath)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (!response.statusCode || response.statusCode >= 400) {
                reject(new Error(`Echec du telechargement (${response.statusCode || "?"})`));
                return;
            }

            const fileStream = fs.createWriteStream(tempPath);

            response.pipe(fileStream);

            fileStream.on("finish", () => {
                fileStream.close(() => {
                    try {
                        // verification minimale : le zip doit etre lisible
                        const hasModDesc = withZip(tempPath, (zip) => !!zip.getEntry("modDesc.xml"));

                        if (!hasModDesc) {
                            fs.rmSync(tempPath, { force: true });
                            reject(new Error("Le fichier telecharge ne semble pas etre un mod FS valide (modDesc.xml introuvable)"));
                            return;
                        }

                        if (fs.existsSync(destinationPath)) {
							fs.rmSync(destinationPath, { force: true });
						}

						fs.renameSync(tempPath, destinationPath);
						resolve();
                    } catch (err) {
                        try {
                            fs.rmSync(tempPath, { force: true });
                        } catch {}
                        reject(new Error("Le fichier telecharge n'est pas un ZIP valide"));
                    }
                });
            });

            fileStream.on("error", (err) => {
                try {
                    fs.rmSync(tempPath, { force: true });
                } catch {}
                reject(err);
            });
        });

        request.on("error", (err) => {
            try {
                fs.rmSync(tempPath, { force: true });
            } catch {}
            reject(err);
        });
    });
}

function createWindow() {
    const iconPath = getIconPath();

    const mainWindow = new BrowserWindow({
        width: 1500,
        height: 1200,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
        }
    });

	mainWindow.setMenu(null);
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
}

app.whenReady().then(() => {
    ipcMain.handle('fs25:getProfiles', async() => {
        try {
            return fs
            .readdirSync(modsCartesPath)
            .filter((name) => {
                const fullPath = path.join(modsCartesPath, name);
                return fs.statSync(fullPath).isDirectory();
            });
        } catch (err) {
            console.error("Erreur lecture profils:", err);
            return [];
        }
    });

    ipcMain.handle('fs25:getActiveProfile', async() => {
        const profile = getActiveProfileFromXML();
        //console.log("ACTIVE PROFILE =", profile);
        return profile;
    });

    ipcMain.handle('fs25:setActiveProfile', async(_event, profileName) => {
        try {
            const xmlPath = path.join(basePath, "gameSettings.xml");
            let content = fs.readFileSync(xmlPath, 'utf-8');

            if (profileName === "Default") {
                content = content.replace(
                        /<modsDirectoryOverride\s+active="[^"]*"\s+directory="[^"]*"\s*\/>/,
                        '<modsDirectoryOverride active="false" directory="" />');
            } else {
                const profilePath = path.join(basePath, "modsCartes", profileName).replace(/\\/g, "/");

                content = content.replace(
                        /<modsDirectoryOverride\s+active="[^"]*"\s+directory="[^"]*"\s*\/>/,
`<modsDirectoryOverride active="true" directory="${profilePath}" />`);
            }

            fs.writeFileSync(xmlPath, content, 'utf-8');
            return {
                success: true
            };
        } catch (err) {
            console.error("Erreur changement profil actif:", err);
            return {
                success: false,
                error: err.message
            };
        }
    });

    ipcMain.handle('fs25:createProfile', async(_event, profileName) => {
        try {
            const cleanName = (profileName || "").trim();

            if (!cleanName) {
                return {
                    success: false,
                    error: "Nom de profil vide"
                };
            }

            const newPath = path.join(modsCartesPath, cleanName);

            if (fs.existsSync(newPath)) {
                return {
                    success: false,
                    error: "Le profil existe deja"
                };
            }

            fs.mkdirSync(newPath);
            return {
                success: true
            };
        } catch (err) {
            console.error("Erreur creation profil:", err);
            return {
                success: false,
                error: err.message
            };
        }
    });

    ipcMain.handle('fs25:addGithubMod', async (_event, profile, repoUrl, includePrereleases = false) => {
        try {
            const targetProfile = (profile || "").trim();

            if (!targetProfile) {
                return { success: false, error: "Profil invalide" };
            }

            const targetFolder = getModsFolder(targetProfile);

            if (!fs.existsSync(targetFolder)) {
                return { success: false, error: "Dossier du profil introuvable" };
            }

            const { owner, repo } = parseGitHubRepoUrl(repoUrl);

            const release = await fetchGitHubReleaseForInstall(owner, repo, includePrereleases);
            const asset = selectGithubModAsset(release);

            const destinationPath = path.join(targetFolder, asset.name);

            if (fs.existsSync(destinationPath)) {
                return {
                    success: false,
                    error: `Un fichier du meme nom existe deja dans le profil : ${asset.name}`
                };
            }

            await downloadFile(asset.browser_download_url, destinationPath);

            const now = new Date().toISOString();

            upsertGithubRegistryEntry({
                profile: targetProfile,
                fileName: asset.name,
                repoUrl: `https://github.com/${owner}/${repo}`,
                owner,
                repo,
                includePrereleases: !!includePrereleases,
                installedReleaseId: release.id,
                installedReleaseTag: release.tag_name || release.name || "",
                installedAssetId: asset.id,
                installedAssetName: asset.name,
                lastCheckedAt: now,
                latestReleaseId: release.id,
                latestReleaseTag: release.tag_name || release.name || "",
                latestAssetId: asset.id,
                latestAssetName: asset.name,
                updateAvailable: false,
                lastError: null
            });

            return {
                success: true,
                fileName: asset.name,
                releaseName: release.name || release.tag_name || "release",
                repo: `${owner}/${repo}`
            };
        } catch (err) {
            console.error("Erreur addGithubMod:", err);
            return {
                success: false,
                error: err.message
            };
        }
    });

    ipcMain.handle('fs25:checkGithubUpdates', async (_event, profile) => {
        try {
            const entries = getTrackedEntriesForProfile(profile);

            if (entries.length === 0) {
                return {
                    success: true,
                    checkedCount: 0,
                    updateCount: 0,
                    errorCount: 0
                };
            }

            const registry = readGithubRegistry();
            let checkedCount = 0;
            let updateCount = 0;
            let errorCount = 0;

            for (const entry of entries) {
                const index = registry.findIndex(
                    (item) =>
                        item.profile === entry.profile &&
                        sameFileName(item.fileName, entry.fileName)
                );

                if (index < 0) {
                    continue;
                }

                try {
                    const release = await fetchGitHubReleaseForInstall(
                        entry.owner,
                        entry.repo,
                        !!entry.includePrereleases
                    );

                    const asset = selectGithubModAsset(release);

                    registry[index] = {
                        ...registry[index],
                        lastCheckedAt: new Date().toISOString(),
                        latestReleaseId: release.id,
                        latestReleaseTag: release.tag_name || release.name || "",
                        latestAssetId: asset.id,
                        latestAssetName: asset.name,
                        updateAvailable:
                            registry[index].installedReleaseId !== release.id ||
                            registry[index].installedAssetId !== asset.id,
                        lastError: null
                    };

                    checkedCount++;

                    if (registry[index].updateAvailable) {
                        updateCount++;
                    }
                } catch (err) {
                    registry[index] = {
                        ...registry[index],
                        lastCheckedAt: new Date().toISOString(),
                        lastError: err.message
                    };

                    checkedCount++;
                    errorCount++;
                }
            }

            writeGithubRegistry(registry);

            return {
                success: true,
                checkedCount,
                updateCount,
                errorCount
            };
        } catch (err) {
            console.error("Erreur checkGithubUpdates:", err);
            return {
                success: false,
                error: err.message
            };
        }
    });

    ipcMain.handle('fs25:getMods', async (_event, profile) => {
      try {
        const folder = getModsFolder(profile);

        if (!fs.existsSync(folder)) return [];

        const registry = readGithubRegistry();
	const externalRegistry = readExternalRegistry();

        const excludedMods = profile === "Default" ? [] : readExcludedModsFromProfile(profile);

        const managedLinks = profile === "Default" ? [] : readManagedLinks(profile);

        const modFiles = fs.readdirSync(folder)
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

        const mods = modFiles
          .map(({ file, fullPath, stats, isDirectory, versionKey }) => {
            const cacheKey = getModCacheKey(file, versionKey);

            let modInfo = getCachedModInfo(cacheKey);

            if (!modInfo) {
              try {
                modInfo = isDirectory
                  ? getModInfoFromDirectory(fullPath, file)
                  : withZip(fullPath, (zip) => getModInfo(zip, file));
                setCachedModInfo(cacheKey, modInfo);
              } catch (err) {
                console.error(isDirectory ? "Erreur lecture mod dossier:" : "Erreur lecture mod:", file, err);
                modInfo = { name: file, version: "?", author: "?" };
              }
            }

            const { name, version, author } = modInfo;
            const iconFilename = modInfo.iconFilename || null;

            const isManagedCommon =
              profile !== "Default" && managedLinks.includes(file);

            const isExcluded =
              profile !== "Default" && excludedMods.includes(file);

            let status = "local";

            if (profile === "Default") {
              status = "local";
            } else if (isExcluded) {
              status = "common-excluded";
            } else if (isManagedCommon) {
              status = "common-linked";
            } else {
              status = "local";
            }

            if (isDirectory) {
                status = "directory";
            }

            const trackedEntry = getTrackedEntryForDisplayedMod(
              registry,
              profile,
              file,
              status
            );

            let isOutOfSync = false;
            if (isManagedCommon && !isDirectory) {
                const defaultPath = path.join(getModsFolder("Default"), file);
                if (fs.existsSync(defaultPath)) {
                    const defaultStats = fs.statSync(defaultPath);
                    isOutOfSync = defaultStats.size !== stats.size;
                }
            }

            return {
              fileName: file,
              name,
              version,
              author,
              iconFilename,
              iconKey: iconFilename ? makeIconKey(cacheKey, iconFilename) : null,
              size: isDirectory ? 0 : stats.size,
              isSymlink: isManagedCommon,
              isDirectory,
              isOutOfSync,
              status,
              fullPath,
              github: buildGithubMeta(trackedEntry),
			  external: buildExternalMeta(
			  getTrackedExternalEntryForDisplayedMod(
				  externalRegistry,
				  profile,
				  file,
				  status
			      )
			  )
            };
          });

        return mods;

      } catch (err) {
        console.error("Erreur getMods:", err);
        return [];
      }
    });

    ipcMain.handle('fs25:getModIcon', async(_event, mod) => {
        try {
            const iconKey = String(mod?.iconKey || "");
            const iconFile = mod?.iconFilename;

            if (!/^[0-9a-f]{32}$/.test(iconKey) || !iconFile) {
                return null;
            }

            const cached = iconCache.get(iconKey);
            if (cached && Date.now() - cached.cachedAt < ICON_CACHE_TTL) {
                return cached.data;
            }

            // Cache disque d'abord : on n'ouvre le mod que si l'icone n'a jamais ete convertie
            let result = readCachedIconFile(iconKey);

            if (!result) {
                const ddsBuffer = mod.isDirectory
                    ? readDirectoryModIcon(mod.fullPath, iconFile)
                    : readZipModIcon(mod.fullPath, iconFile);

                if (!ddsBuffer) return null;

                result = await convertDdsToPngWithTexconv(ddsBuffer, iconKey);
            }

            if (result) {
                iconCache.set(iconKey, { data: result, cachedAt: Date.now() });
            }

            return result;

        } catch (err) {
            console.error("Erreur getModIcon:", err);
            return null;
        }
    });

	ipcMain.handle('fs25:getExcludedMods', async (_event, profile) => {
	  try {
		if (!profile || profile === "Default" || profile === "...") {
		  return [];
		}

		return readExcludedModsFromProfile(profile);
	  } catch (err) {
		console.error("Erreur getExcludedMods:", err);
		return [];
	  }
	});

	ipcMain.handle('fs25:repairLinks', async (_event, profile) => {
	  try {
		if (!profile || profile === "Default") {
		  return { success: false, error: "Action impossible sur Default" };
		}

		const profileDir = getModsFolder(profile);
		const defaultDir = getModsFolder("Default");

		const excludedMods = readExcludedModsFromProfile(profile);

		if (!fs.existsSync(profileDir) || !fs.existsSync(defaultDir)) {
		  return { success: false, error: "Dossier profil ou Default introuvable" };
		}

		// anciens liens gérés par l'app
		const previousManaged = readManagedLinks(profile);

		// 1. Supprimer les anciens hard links gérés
		for (const file of previousManaged) {
		  const targetPath = path.join(profileDir, file);
		  try {
			if (fs.existsSync(targetPath)) {
			  fs.rmSync(targetPath, { force: true });
			}
		  } catch {}
		}

		// 2. Recréer les liens vers les communs non exclus
		const defaultEntries = fs.readdirSync(defaultDir)
		  .filter((file) => file.toLowerCase().endsWith(".zip"));

		const newManaged = [];
		let linkedCount = 0;
		let skippedExcluded = 0;
		let removedDuplicates = 0;

		for (const file of defaultEntries) {
		  if (excludedMods.includes(file)) {
			skippedExcluded++;
			continue;
		  }

		  const sourcePath = path.join(defaultDir, file);
		  const targetPath = path.join(profileDir, file);

		  if (fs.existsSync(targetPath)) {
			// s'il y a deja un fichier local du meme nom, on le remplace
			fs.rmSync(targetPath, { force: true });
			removedDuplicates++;
		  }

		  // hard link (pas besoin d'admin, meme volume)
		  fs.linkSync(sourcePath, targetPath);

		  newManaged.push(file);
		  linkedCount++;
		}

		writeManagedLinks(profile, newManaged);

		return {
		  success: true,
		  linkedCount,
		  skippedExcluded,
		  removedDuplicates
		};
	  } catch (err) {
		console.error("Erreur repairLinks:", err);
		return { success: false, error: err.message };
	  }
	});

	ipcMain.handle('fs25:removeLinks', async (_event, profile) => {
	  try {
		if (!profile || profile === "Default") {
		  return { success: false, error: "Action impossible sur Default" };
		}

		const profileDir = getModsFolder(profile);

		if (!fs.existsSync(profileDir)) {
		  return { success: false, error: "Dossier profil introuvable" };
		}

		const managed = readManagedLinks(profile);
		let removedCount = 0;

		for (const file of managed) {
		  const fullPath = path.join(profileDir, file);
		  try {
			if (fs.existsSync(fullPath)) {
			  fs.rmSync(fullPath, { force: true });
			  removedCount++;
			}
		  } catch {}
		}

		writeManagedLinks(profile, []);

		return { success: true, removedCount };
	  } catch (err) {
		console.error("Erreur removeLinks:", err);
		return { success: false, error: err.message };
	  }
	});
		
	ipcMain.handle('fs25:openProfileFolder', async (_event, profile) => {
	  try {
		const folder = getModsFolder(profile);

		if (!fs.existsSync(folder)) {
		  return { success: false, error: "Dossier introuvable" };
		}

		const result = await shell.openPath(folder);

		if (result) {
		  return { success: false, error: result };
		}

		return { success: true };
	  } catch (err) {
		console.error("Erreur openProfileFolder:", err);
		return { success: false, error: err.message };
	  }
	});

	ipcMain.handle('fs25:toggleExcludedMod', async (_event, profile, fileName) => {
	  try {
		if (!profile || profile === "Default") {
		  return { success: false, error: "Action impossible sur Default" };
		}

		const profileDir = getModsFolder(profile);
		const defaultDir = getModsFolder("Default");
		const sourcePath = path.join(defaultDir, fileName);
		const targetPath = path.join(profileDir, fileName);

		let excludedMods = readExcludedModsFromProfile(profile);
		let managedLinks = readManagedLinks(profile);

		const isExcluded = excludedMods.includes(fileName);

		if (!isExcluded) {
		  excludedMods.push(fileName);
		  excludedMods = [...new Set(excludedMods)];

		  if (managedLinks.includes(fileName) && fs.existsSync(targetPath)) {
			fs.rmSync(targetPath, { force: true });
		  }

		  managedLinks = managedLinks.filter((m) => m !== fileName);

		  writeExcludedModsToProfile(profile, excludedMods);
		  writeManagedLinks(profile, managedLinks);

		  return {
			success: true,
			excluded: true
		  };
		} else {
		  excludedMods = excludedMods.filter((m) => m !== fileName);

		  if (!fs.existsSync(sourcePath)) {
			return { success: false, error: "Mod favori introuvable dans Default" };
		  }

		  // s'il n'existe pas deja dans le profil, on recrée le hard link
		  if (!fs.existsSync(targetPath)) {
			fs.linkSync(sourcePath, targetPath);
		  }

if (!managedLinks.includes(fileName)) {
			managedLinks.push(fileName);
		}

		writeExcludedModsToProfile(profile, excludedMods);
		writeManagedLinks(profile, managedLinks);

		return {
			success: true,
			excluded: false
		};
	}
	  } catch (err) {
		console.error("Erreur toggleExcludedMod:", err);
		return { success: false, error: err.message };
	  }
});

	ipcMain.handle('fs25:promoteToCommon', async (_event, profile, fileName) => {
	  try {
		if (!profile || profile === "Default") {
		  return { success: false, error: "Action impossible sur Default" };
		}

		const profileDir = getModsFolder(profile);
		const defaultDir = getModsFolder("Default");

		const sourcePath = path.join(profileDir, fileName);
		const targetPath = path.join(defaultDir, fileName);
		const linkPath = path.join(profileDir, fileName);

		if (!fs.existsSync(sourcePath)) {
		  return { success: false, error: "Mod local introuvable" };
		}

		// ⚠️ éviter d’écraser un mod existant dans Default
		if (fs.existsSync(targetPath)) {
		  return { success: false, error: "Un mod du même nom existe déjà dans les favoris" };
		}

		// 1. déplacer vers Default
		fs.renameSync(sourcePath, targetPath);

		// 2. recréer un hard link dans le profil
		fs.linkSync(targetPath, linkPath);

		// 3. enregistrer dans managed_links
		let managed = readManagedLinks(profile);
		if (!managed.includes(fileName)) {
		  managed.push(fileName);
		  writeManagedLinks(profile, managed);
		}
		
        const registry = readGithubRegistry();
        const trackedEntry = registry.find(
          (item) => item.profile === profile && sameFileName(item.fileName, fileName)
        );

        if (trackedEntry) {
          trackedEntry.profile = "Default";
          writeGithubRegistry(registry);
        }
		
		const externalRegistry = readExternalRegistry();
        const externalEntry = externalRegistry.find(
            (item) => item.profile === profile && sameFileName(item.fileName, fileName)
        );

        if (externalEntry) {
            externalEntry.profile = "Default";
            writeExternalRegistry(externalRegistry);
        }
		
		return { success: true };

	  } catch (err) {
		console.error("Erreur promoteToCommon:", err);
		return { success: false, error: err.message };
	  }
	});

	ipcMain.handle('fs25:deleteLocalMod', async (_event, profile, fileName) => {
	  try {
		const profileDir = getModsFolder(profile);
		const filePath = path.join(profileDir, fileName);

		if (!fs.existsSync(filePath)) {
		  return { success: false, error: "Fichier introuvable" };
		}

		fs.rmSync(filePath, { recursive: true, force: true });
		removeGithubRegistryEntry(profile, fileName);
		removeExternalRegistryEntry(profile, fileName);
		 
		return { success: true };

	  } catch (err) {
		console.error("Erreur deleteLocalMod:", err);
		return { success: false, error: err.message };
	  }
	});

	ipcMain.handle("app:getVersion", () => {
	  return app.getVersion();
	});
	
    ipcMain.handle('fs25:openGithubRepo', async (_event, repoUrl) => {
        try {
            const url = String(repoUrl || "").trim();

            if (!/^https:\/\/github\.com\/[^\/]+\/[^\/]+/i.test(url)) {
                return { success: false, error: "URL GitHub invalide" };
            }

            await shell.openExternal(url);
            return { success: true };
        } catch (err) {
            console.error("Erreur openGithubRepo:", err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('fs25:updateGithubMod', async (_event, displayedProfile, fileName) => {
        try {
            const entry = findTrackedGithubEntryForDisplayedMod(displayedProfile, fileName);

            if (!entry) {
                return { success: false, error: "Ce mod n'est pas suivi par GitHub" };
            }

            const targetProfile = entry.profile;
            const targetFolder = getModsFolder(targetProfile);

            if (!fs.existsSync(targetFolder)) {
                return { success: false, error: "Dossier cible introuvable" };
            }

            const currentFilePath = path.join(targetFolder, entry.fileName);

            if (!fs.existsSync(currentFilePath)) {
                return {
                    success: false,
                    error: `Le fichier local est introuvable dans le profil ${targetProfile}`
                };
            }

            const release = await fetchGitHubReleaseForInstall(
                entry.owner,
                entry.repo,
                !!entry.includePrereleases
            );

            const asset = selectGithubModAsset(release);
            const destinationPath = path.join(targetFolder, asset.name);

            await downloadFile(asset.browser_download_url, destinationPath);

            if (!sameFileName(entry.fileName, asset.name) && fs.existsSync(currentFilePath)) {
                fs.rmSync(currentFilePath, { force: true });
            }

            const registry = readGithubRegistry();
            const index = registry.findIndex(
                (item) =>
                    item.profile === entry.profile &&
                    sameFileName(item.fileName, entry.fileName)
            );

            if (index < 0) {
                return { success: false, error: "Entrée GitHub introuvable dans le registre" };
            }

            registry[index] = {
                ...registry[index],
                fileName: asset.name,
                installedReleaseId: release.id,
                installedReleaseTag: release.tag_name || release.name || "",
                installedAssetId: asset.id,
                installedAssetName: asset.name,
                latestReleaseId: release.id,
                latestReleaseTag: release.tag_name || release.name || "",
                latestAssetId: asset.id,
                latestAssetName: asset.name,
                lastCheckedAt: new Date().toISOString(),
                updateAvailable: false,
                lastError: null
            };

            writeGithubRegistry(registry);

            return {
                success: true,
                fileName: asset.name,
                repo: `${entry.owner}/${entry.repo}`,
                targetProfile,
                releaseName: release.name || release.tag_name || "release"
            };
        } catch (err) {
            console.error("Erreur updateGithubMod:", err);
            return {
                success: false,
                error: err.message
            };
        }
    });

    ipcMain.handle("fs25:launchGame", async (_event, playniteUrl) => {
        try {
            const url = String(playniteUrl || "").trim();

            if (!url.startsWith("playnite://")) {
                return { success: false, error: "URL Playnite invalide" };
            }

            await shell.openExternal(url);
            return { success: true };
        } catch (err) {
            console.error("Erreur launchGame:", err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle("fs25:pickExternalZip", async () => {
        try {
            const result = await dialog.showOpenDialog({
                title: "Choisir un mod externe",
                properties: ["openFile"],
                filters: [
                    { name: "Mods ZIP", extensions: ["zip"] }
                ]
            });

            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return { success: false, canceled: true };
            }

            return {
                success: true,
                filePath: result.filePaths[0]
            };
        } catch (err) {
            console.error("Erreur pickExternalZip:", err);
            return { success: false, error: err.message };
        }
    });
	
	ipcMain.handle("fs25:addExternalMod", async (_event, profile, zipPath, url) => {
        try {
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
            const destinationPath = path.join(targetFolder, fileName);

            copyLocalZipToProfile(sourceZipPath, destinationPath);

            upsertExternalRegistryEntry({
                profile: targetProfile,
                fileName,
                url: pageUrl,
                sourceLabel: "Externe",
                addedAt: new Date().toISOString()
            });

            return {
                success: true,
                fileName
            };
        } catch (err) {
            console.error("Erreur addExternalMod:", err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle("fs25:openExternalUrl", async (_event, url) => {
        try {
            const cleanUrl = String(url || "").trim();

            if (!/^https?:\/\//i.test(cleanUrl)) {
                return { success: false, error: "URL invalide" };
            }

            await shell.openExternal(cleanUrl);
            return { success: true };
        } catch (err) {
            console.error("Erreur openExternalUrl:", err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle("fs25:openModZip", async (_event, profile, fileName) => {
    try {
        const folder = getModsFolder(profile);
        const filePath = path.join(folder, fileName);

        if (!fs.existsSync(filePath)) {
            return { success: false, error: "Fichier introuvable" };
        }

        const result = await shell.openPath(filePath);

        if (result) {
            return { success: false, error: result };
        }

        return { success: true };
    } catch (err) {
        console.error("Erreur openModZip:", err);
        return { success: false, error: err.message };
    }
});
	
	createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('will-quit', () => {
    // sauvegarde immediate si une ecriture differee est en attente
    if (modInfoCacheSaveTimer) {
        saveModInfoCache();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});