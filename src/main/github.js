const path = require('path');
const fs = require('fs');
const https = require('https');
const { DEFAULT_PROFILE, getModsFolder } = require('./settings');
const { sameFileName, includesFileName } = require('./fsUtils');
const { readManagedLinks } = require('./profiles');
const { githubRegistry, matchesEntry } = require('./registry');
const { HTTP_TIMEOUT, downloadFile } = require('./download');
const { relinkFavoriteInProfiles } = require('./links');
const { t } = require('../locales/i18n');

function parseGitHubRepoUrl(repoUrl) {
    const cleanUrl = (repoUrl || "").trim();

    const match = cleanUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/?#]+?)(?:\.git)?(?:\/|$)/i);

    if (!match) {
        throw new Error(t("errors.github.invalidRepoUrl"));
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

            res.on("error", reject);

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    if (res.statusCode && res.statusCode >= 400) {
                        let message = t("errors.github.httpError", { status: res.statusCode });

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed && parsed.message) {
                                message = t("errors.github.apiError", { message: parsed.message });
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

        req.setTimeout(HTTP_TIMEOUT, () => {
            req.destroy(new Error(t("errors.github.timeout")));
        });

        req.on("error", reject);
    });
}

async function fetchGitHubReleaseForInstall(owner, repo, includePrereleases) {
    if (!includePrereleases) {
        return await githubRequestJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
    }

    const releases = await githubRequestJson(`https://api.github.com/repos/${owner}/${repo}/releases`);
    const release = Array.isArray(releases)
        ? releases.find((r) => r && !r.draft)
        : null;

    if (!release) {
        throw new Error(t("errors.github.noRelease"));
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
        throw new Error(t("errors.github.noAsset"));
    }

    const zipAssets = release.assets.filter((asset) =>
        asset &&
        asset.name &&
        asset.browser_download_url &&
        asset.name.toLowerCase().endsWith(".zip")
    );

    if (zipAssets.length === 0) {
        throw new Error(t("errors.github.noZip"));
    }

    const isFs25Zip = (asset) => /^fs25_.*\.zip$/i.test(asset.name);
    const nonSourceZipAssets = zipAssets.filter((asset) => !isProbablySourceZip(asset.name));

    if (nonSourceZipAssets.length === 1) {
        return nonSourceZipAssets[0];
    }

    if (nonSourceZipAssets.length > 1) {
        const fs25ZipAssets = nonSourceZipAssets.filter(isFs25Zip);

        if (fs25ZipAssets.length === 1) {
            return fs25ZipAssets[0];
        }

        throw new Error(t("errors.github.severalZips"));
    }

    if (zipAssets.length === 1) {
        return zipAssets[0];
    }

    const fs25ZipAssets = zipAssets.filter(isFs25Zip);

    if (fs25ZipAssets.length === 1) {
        return fs25ZipAssets[0];
    }

    throw new Error(t("errors.github.ambiguousZip"));
}

function getReleaseTag(release) {
    return release.tag_name || release.name || "";
}

// Champs "installe" + "derniere version connue" apres une installation ou une MAJ
function buildInstalledReleaseFields(release, asset) {
    return {
        installedReleaseId: release.id,
        installedReleaseTag: getReleaseTag(release),
        installedAssetId: asset.id,
        installedAssetName: asset.name,
        latestReleaseId: release.id,
        latestReleaseTag: getReleaseTag(release),
        latestAssetId: asset.id,
        latestAssetName: asset.name,
        lastCheckedAt: new Date().toISOString(),
        updateAvailable: false,
        lastError: null
    };
}

function findTrackedGithubEntryForDisplayedMod(displayedProfile, fileName) {
    const registry = githubRegistry.read();

    const entry = registry.find((item) => matchesEntry(item, displayedProfile, fileName));
    if (entry) {
        return entry;
    }

    if (displayedProfile !== DEFAULT_PROFILE) {
        return registry.find((item) => matchesEntry(item, DEFAULT_PROFILE, fileName)) || null;
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
    const registry = githubRegistry.read();

    if (profile === DEFAULT_PROFILE) {
        return registry.filter((item) => item.profile === DEFAULT_PROFILE);
    }

    const managedLinks = readManagedLinks(profile);

    return registry.filter(
        (item) =>
            item.profile === profile ||
            (item.profile === DEFAULT_PROFILE && includesFileName(managedLinks, item.fileName))
    );
}

async function addGithubMod(profile, repoUrl, includePrereleases = false) {
    const targetProfile = (profile || "").trim();

    if (!targetProfile) {
        return { success: false, error: t("errors.invalidProfile") };
    }

    const targetFolder = getModsFolder(targetProfile);

    if (!fs.existsSync(targetFolder)) {
        return { success: false, error: t("errors.profileFolderNotFound") };
    }

    const { owner, repo } = parseGitHubRepoUrl(repoUrl);

    const release = await fetchGitHubReleaseForInstall(owner, repo, includePrereleases);
    const asset = selectGithubModAsset(release);

    const destinationPath = path.join(targetFolder, asset.name);

    if (fs.existsSync(destinationPath)) {
        return {
            success: false,
            error: t("errors.fileAlreadyInProfile", { fileName: asset.name })
        };
    }

    await downloadFile(asset.browser_download_url, destinationPath);

    githubRegistry.upsert({
        profile: targetProfile,
        fileName: asset.name,
        repoUrl: `https://github.com/${owner}/${repo}`,
        owner,
        repo,
        includePrereleases: !!includePrereleases,
        ...buildInstalledReleaseFields(release, asset)
    });

    return {
        success: true,
        fileName: asset.name,
        releaseName: release.name || release.tag_name || "release",
        repo: `${owner}/${repo}`
    };
}

async function checkGithubUpdates(profile) {
    const entries = getTrackedEntriesForProfile(profile);

    if (entries.length === 0) {
        return { success: true, checkedCount: 0, updateCount: 0, errorCount: 0 };
    }

    const registry = githubRegistry.read();
    let checkedCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    for (const entry of entries) {
        const index = registry.findIndex((item) => matchesEntry(item, entry.profile, entry.fileName));

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
                latestReleaseTag: getReleaseTag(release),
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

    githubRegistry.write(registry);

    return { success: true, checkedCount, updateCount, errorCount };
}

async function updateGithubMod(displayedProfile, fileName) {
    const entry = findTrackedGithubEntryForDisplayedMod(displayedProfile, fileName);

    if (!entry) {
        return { success: false, error: t("errors.github.notTracked") };
    }

    const targetProfile = entry.profile;
    const targetFolder = getModsFolder(targetProfile);

    if (!fs.existsSync(targetFolder)) {
        return { success: false, error: t("errors.targetFolderNotFound") };
    }

    const currentFilePath = path.join(targetFolder, entry.fileName);

    if (!fs.existsSync(currentFilePath)) {
        return {
            success: false,
            error: t("errors.github.localFileNotFound", { profile: targetProfile })
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

    const registry = githubRegistry.read();
    const index = registry.findIndex((item) => matchesEntry(item, entry.profile, entry.fileName));

    if (index < 0) {
        return { success: false, error: t("errors.github.entryNotFound") };
    }

    registry[index] = {
        ...registry[index],
        fileName: asset.name,
        ...buildInstalledReleaseFields(release, asset)
    };

    githubRegistry.write(registry);

    // un favori remplace dans Default doit etre relie dans les profils qui l'utilisent
    const relink = targetProfile === DEFAULT_PROFILE
        ? relinkFavoriteInProfiles(entry.fileName, asset.name)
        : { relinkedCount: 0, errors: [] };

    return {
        success: true,
        fileName: asset.name,
        repo: `${entry.owner}/${entry.repo}`,
        targetProfile,
        releaseName: release.name || release.tag_name || "release",
        relinkedCount: relink.relinkedCount,
        relinkErrors: relink.errors
    };
}

module.exports = {
    buildGithubMeta,
    addGithubMod,
    checkGithubUpdates,
    updateGithubMod
};
