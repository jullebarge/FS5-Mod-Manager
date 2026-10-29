const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { withZip } = require('../zipReader');

const conversionLocks = new Map();
const iconCache = new Map();
const ICON_CACHE_TTL = 30 * 60 * 1000;

function getTexconvPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "texconv.exe");
    }
    return path.join(app.getAppPath(), 'assets', 'texconv.exe');
}

function getIconCacheDir() {
    const dir = path.join(app.getPath('userData'), 'icon-cache');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
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

function runTexconv(texconvPath, ddsPath, outputDir) {
    return new Promise((resolve, reject) => {
        execFile(
            texconvPath,
            [
                '-ft', 'png',
                '-f', 'R8G8B8A8_UNORM_SRGB',
                '-srgb',
                '-w', '256',
                '-h', '256',
                '-y',
                '-o', outputDir,
                ddsPath
            ],
            { windowsHide: true },
            (error) => {
                if (error) reject(error);
                else resolve();
            });
    });
}

async function convertDdsToPngWithTexconv(ddsBuffer, iconKey) {
    try {
        const texconvPath = getTexconvPath();

        if (!fs.existsSync(texconvPath)) {
            return null;
        }

        const cacheDir = getIconCacheDir();
        const finalPngPath = path.join(cacheDir, `${iconKey}.png`);

        // Le cache disque est verifie par l'appelant, avant meme d'ouvrir le zip.
        // Si une conversion est deja en cours pour cette image, on attend son resultat.
        if (conversionLocks.has(finalPngPath)) {
            return await conversionLocks.get(finalPngPath);
        }

        const conversionPromise = (async() => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs25dds-'));
            const uniqueId = crypto.randomBytes(6).toString('hex');

            const ddsPath = path.join(tempDir, `source_${uniqueId}.dds`);
            const tempPngPath = path.join(cacheDir, `source_${uniqueId}.png`);

            try {
                fs.writeFileSync(ddsPath, ddsBuffer);

                await runTexconv(texconvPath, ddsPath, cacheDir);

                if (!fs.existsSync(tempPngPath)) {
                    console.error("PNG non genere :", tempPngPath);
                    return null;
                }

                // copie vers le cache final (plus fiable que rename)
                fs.copyFileSync(tempPngPath, finalPngPath);

                return toPngDataUrl(fs.readFileSync(finalPngPath));
            } catch (err) {
                console.error("Erreur conversion texconv :", err);
                return null;
            } finally {
                try {
                    if (fs.existsSync(tempPngPath)) fs.unlinkSync(tempPngPath);
                } catch {}

                try {
                    if (fs.existsSync(ddsPath)) fs.unlinkSync(ddsPath);
                } catch {}

                try {
                    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
                } catch {}
            }
        })();

        conversionLocks.set(finalPngPath, conversionPromise);

        const result = await conversionPromise;

        conversionLocks.delete(finalPngPath);

        return result;
    } catch (err) {
        console.error("Erreur conversion texconv :", err);
        return null;
    }
}

async function getModIcon(mod) {
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
}

module.exports = {
    makeIconKey,
    getModIcon
};
