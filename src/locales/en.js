// English texts. { one, other }: plural chosen from params.count.
module.exports = {
    common: {
        add: "Add",
        cancel: "Cancel",
        close: "Close",
        confirm: "OK",
        delete: "Delete",
        save: "Save",
        loading: "Loading",
        errorPrefix: "Error: {error}"
    },

    units: {
        B: "B",
        KB: "KB",
        MB: "MB",
        GB: "GB"
    },

    status: {
        favoriteLinked: "Linked favorite mod",
        favoriteExcluded: "Excluded favorite mod",
        local: "Local mod",
        directory: "Folder mod (unzipped)",
        unknown: "Unknown status"
    },

    app: {
        activeProfile: "Active profile:",
        selectedProfile: "Selected profile",
        pendingChange: "Change not applied",
        gameRunning: "FS25 is running: profile switching is disabled, some mod operations may fail",
        gameRunningTooltip: "The game rewrites gameSettings.xml when it exits and locks the mods it has loaded",
        closeGameFirst: "Close FS25 before switching profile",
        noLaunchUrl: "No launch URL: see Settings",
        savegamesTooltip: "Mods missing or unused by the savegames that use this profile",
        checkGithubTooltip: "Check GitHub mods for updates",
        searchPlaceholder: "Search mods...",
        noMods: "No mods found for this profile.",
        button: {
            changeProfile: "Switch profile",
            createProfile: "Create profile",
            openFolder: "Open folder",
            refresh: "Refresh",
            launchGame: "Launch game",
            settings: "Settings",
            repairLinks: "Copy favorites to profile",
            removeLinks: "Remove favorites from profile",
            savegames: "Analyze savegames",
            addGithubMod: "Add GitHub mod",
            checkGithub: "Check GitHub updates",
            addExternalMod: "Add external mod"
        },
        stats: {
            all: "All mods",
            size: "Size",
            favorites: "Favorites",
            local: "Local",
            excluded: "Excluded",
            github: "GitHub tracked",
            external: "External mods"
        },
        count: {
            favoritesCopied: { one: "{count} favorite copied", other: "{count} favorites copied" },
            excludedSkipped: { one: "{count} excluded skipped", other: "{count} excluded skipped" },
            duplicatesReplaced: { one: "{count} duplicate replaced", other: "{count} duplicates replaced" },
            updatesAvailable: { one: "{count} update available", other: "{count} updates available" },
            modsChecked: { one: "{count} mod checked", other: "{count} mods checked" }
        },
        toast: {
            activeProfileChanged: "Active profile updated: {profile}",
            profileCreated: "Profile created: {profile}",
            repairInProgress: "Copying favorite mods...",
            repairDone: "{linked}, {excluded}, {duplicates}",
            repairResynced: { one: ", {count} resynced", other: ", {count} resynced" },
            repairKeptNewer: {
                one: "{count} newer favorite kept in the profile: use “Keep this version” to push it to the favorites",
                other: "{count} newer favorites kept in the profile: use “Keep this version” to push them to the favorites"
            },
            repairErrors: { one: "{count} favorite not processed (game running?)", other: "{count} favorites not processed (game running?)" },
            removeLinksInProgress: "Removing favorite mods...",
            removeLinksDone: { one: "{count} favorite mod removed", other: "{count} favorite mods removed" },
            removeLinksErrors: { one: "{count} favorite not removed (game running?)", other: "{count} favorites not removed (game running?)" },
            refreshInProgress: "Refreshing...",
            refreshDone: "Profile {profile} refreshed",
            modExcluded: "{name} excluded from the profile",
            modReintegrated: "{name} restored to the profile",
            copyDone: { one: "{name} copied to {count} profile", other: "{name} copied to {count} profiles" },
            copyReplaced: { one: " ({count} version replaced)", other: " ({count} versions replaced)" },
            copyErrors: "Copy failed",
            dependencyAdded: "{name} added to the profile",
            favoritesExcluded: { one: "{count} favorite excluded from the profile", other: "{count} favorites excluded from the profile" },
            favoritesExcludeErrors: "Favorites not excluded",
            promotedToFavorite: "{name} added to favorite mods",
            deleted: "{name} moved to the Recycle Bin",
            deletedAndRemoved: {
                one: "{name} moved to the Recycle Bin and removed from {count} profile",
                other: "{name} moved to the Recycle Bin and removed from {count} profiles"
            },
            deleteProfileErrors: "Not removed from some profiles",
            versionPromoted: {
                one: "{name} v{version} pushed to the favorites and linked in {count} profile",
                other: "{name} v{version} pushed to the favorites and linked in {count} profiles"
            },
            linksNotUpdated: "Links not updated",
            favoriteVersionRestored: "{name}: favorite version restored (v{version})",
            settingsSaved: "Settings saved",
            githubUrlRequired: "Please enter a GitHub URL",
            githubDownloading: "Downloading GitHub mod...",
            githubDownloaded: "{fileName} downloaded from {repo}",
            githubChecking: "Checking GitHub updates...",
            githubNoneTracked: "No GitHub mod tracked in this profile",
            githubUpdatesFound: "{updates} out of {checked}",
            githubNoUpdate: { one: "No update found for {count} mod", other: "No update found for {count} mods" },
            githubUpdating: "Updating {name}...",
            githubFavoriteUpdated: {
                one: "{name} updated in the favorites (Default) and {count} profile",
                other: "{name} updated in the favorites (Default) and {count} profiles"
            },
            githubUpdated: "{name} updated",
            zipRequired: "Please select a ZIP file",
            urlRequired: "Please enter a URL",
            externalAdded: "{fileName} added as an external mod"
        }
    },

    card: {
        openActions: "Click to open actions",
        folder: "Folder",
        githubTooltip: "Mod tracked through GitHub",
        external: "External",
        externalTooltip: "Tracked external mod",
        prereleaseTooltip: "Tracking also uses pre-releases",
        githubError: "GitHub error",
        updateAvailable: "Update",
        updateAvailableTooltip: "A GitHub update is available",
        missingDependency: "Missing dependency",
        missingDependencyTooltip: "Required mods missing from this profile: {mods}",
        duplicateCopy: "Copy",
        duplicateCopyTooltip: "Same file as the favorite, but copied instead of linked: “Copy favorites to profile” replaces it with a link and frees the space",
        favoriteVersionTooltip: "Favorite version: v{version}",
        newerThanFavorite: "Newer than favorite",
        shared: "Shared ×{count}",
        sharedTooltip: "Also in: {profiles}. If you use it everywhere, “Make favorite” keeps a single copy, linked into each profile.",
        outOfSync: "Out of sync"
    },

    menu: {
        promoteToFavorite: "Make favorite",
        copyToProfiles: "Copy to another profile",
        exclude: "Exclude from profile",
        reintegrate: "Restore to profile",
        keepProfileVersion: "Keep this version (push to favorites)",
        useFavoriteVersion: "Use the favorite version",
        openGithub: "Open GitHub link",
        updateFromGithub: "Update from GitHub",
        openExternal: "Open external link",
        openFolder: "Open folder",
        openZip: "Open zip",
        delete: "Delete"
    },

    banners: {
        conflicts: { one: "{count} conflicting mod:", other: "{count} conflicting mods:" },
        missingDependencies: { one: "{count} missing dependency:", other: "{count} missing dependencies:" },
        requiredBy: "required by {mods}",
        reintegrateFavorite: "Restore favorite",
        linkFavorite: "Link favorite",
        copyFrom: "Copy from {profile}",
        dependencyNotFound: "not found in your folders: needs to be downloaded",
        outOfSync: { one: "{count} favorite out of sync:", other: "{count} favorites out of sync:" },
        versions: "profile v{profileVersion} · favorites v{favoriteVersion}",
        profileNewer: "(profile is newer)",
        keepProfile: "Keep the profile one",
        keepProfileTooltip: "Replaces the favorite (Default) version with this profile's, then links every profile that uses it",
        useFavorite: "Use the favorite one",
        useFavoriteTooltip: "Replaces this profile's copy with the favorite version (the old copy goes to the Recycle Bin)"
    },

    createProfile: {
        title: "Create profile",
        placeholder: "Profile name"
    },

    githubModal: {
        title: "Add GitHub mod",
        target: "The mod ZIP will be downloaded to the selected profile:",
        download: "Download",
        includePrereleases: "Include pre-releases",
        prereleasesHint: "When unchecked, only the latest stable release is used."
    },

    externalModal: {
        title: "Add external mod",
        target: "The ZIP will be copied to the selected profile:",
        noZip: "No ZIP selected",
        pickZip: "Choose a ZIP",
        urlHint: "For example: KingMods page, forum thread, the mod's own page."
    },

    deleteModal: {
        title: "Delete {name}?",
        folder: "The folder",
        file: "The file",
        toTrash: "will be moved to the Windows Recycle Bin.",
        linkedFavoriteHint: "The mod stays in the favorites (Default) and will come back the next time favorites are copied. To remove it from this profile for good, use “Exclude from profile” instead.",
        searchingUsage: "Looking for profiles that use this favorite...",
        linkedIn: { one: "This favorite is linked in {count} profile:", other: "This favorite is linked in {count} profiles:" },
        removeFromProfiles: "Also remove it from these profiles",
        notUsed: "No profile uses this mod as a favorite."
    },

    copyModal: {
        title: "Copy {name} to other profiles",
        submit: { one: "Copy to {count} profile", other: "Copy to {count} profiles" },
        hintZip: "The mod zip will be copied to each checked profile: an independent copy that stays a local mod of that profile.",
        hintFolder: "The mod folder will be copied to each checked profile: an independent copy that stays a local mod of that profile.",
        loading: "Reading profiles...",
        noProfiles: "No other profile.",
        alreadyPresent: "already there (identical file)",
        otherVersion: "another version is there: it will be replaced (Recycle Bin)",
        otherVersionNumbered: "another version is there (v{version}): it will be replaced (Recycle Bin)"
    },

    savegames: {
        title: "Savegames and mods of profile {profile}",
        intro: "Compares the mods enabled in a savegame (careerSavegame.xml) with this profile's folder.",
        loading: "Reading savegames...",
        none: "No savegame found in the game folder.",
        selected: "Analyzed savegame",
        linkedGroup: "Linked to profile {profile}",
        otherGroup: "Other savegames",
        association: "Profile linked to this savegame",
        automaticWith: "Automatic ({profile})",
        automaticNone: "Automatic (none)",
        noProfile: "No profile",
        noneLinked: "No savegame is linked to this profile: pick one, then link it if needed.",
        analyzing: "Analyzing...",
        summary: "{active} · {inProfile} in the profile",
        count: {
            activeInGame: { one: "{count} mod enabled in the savegame", other: "{count} mods enabled in the savegame" }
        },
        sharedWith: "profile shared with: {savegames}",
        noMissing: "No missing mod",
        missing: { one: "{count} mod missing from the profile", other: "{count} mods missing from the profile" },
        noUnused: "No unused mod",
        unused: {
            one: "{count} profile mod not enabled in the savegame ({size})",
            other: "{count} profile mods not enabled in the savegame ({size})"
        },
        unusedHint: "The game doesn't load them for this savegame. “New” mods haven't been offered by the game yet.",
        excludeUnused: { one: "Exclude the unused favorite", other: "Exclude the {count} unused favorites" },
        versionMismatch: {
            one: "{count} mod in a different version than at the last save",
            other: "{count} mods in a different version than at the last save"
        },
        versionChange: "savegame v{saved} → installed v{installed}",
        required: "required",
        hasObjects: "objects in savegame",
        hasObjectsTooltip: "Vehicles or buildings from this mod are in the savegame",
        availability: {
            excludedFavorite: "Favorite excluded from this profile",
            favorite: "In the favorites: “Copy favorites to profile” will link it",
            otherProfile: "Available in profile {profile}",
            none: "Not found in your folders"
        },
        reintegrate: "Restore",
        new: "new",
        newTooltip: "Added after the last save: the savegame hasn't offered it yet",
        usedBy: "used by {savegames}",
        usedByTooltip: "Enabled in another savegame that uses this profile",
        exclude: "Exclude",
        trash: "Recycle Bin"
    },

    settings: {
        title: "Settings",
        language: "Language",
        browse: "Browse",
        defaultValue: "Default: {value}",
        gamePath: {
            label: "Game folder (contains gameSettings.xml and the savegames)",
            pick: "Choose the FarmingSimulator2025 folder"
        },
        modsPath: {
            label: "Favorite mods folder (Default profile)",
            hint: "Leave empty to use the game's “mods” folder.",
            pick: "Choose the favorite mods folder"
        },
        profilesPath: {
            label: "Per-map mods folder (one subfolder per profile)",
            hint: "Leave empty to use the game's “{folder}” folder. It must be on the same drive as the favorite mods (favorites are linked).",
            pick: "Choose the per-map mods folder"
        },
        launchUrl: {
            label: "Game launch URL (“Launch game” button)",
            placeholder: "playnite://playnite/start/<id> or steam://rungameid/<id>",
            hint: "Leave empty to disable the button."
        },
        iconCache: {
            label: "Icon cache",
            stats: "{files}, {size} — {unused} ({unusedSize})",
            count: {
                files: { one: "{count} icon", other: "{count} icons" },
                unused: { one: "{count} unused", other: "{count} unused" }
            },
            computing: "Computing...",
            clean: "Clean now",
            cleaning: "Cleaning...",
            cleaned: {
                one: "{count} icon deleted, {size} freed",
                other: "{count} icons deleted, {size} freed"
            },
            hint: "Icons of deleted or updated mods. Cleaning also runs automatically at startup (icons unused for more than 2 days)."
        }
    },

    dialogs: {
        pickFolder: "Choose a folder",
        pickExternalZip: "Choose an external mod",
        zipFilter: "ZIP mods"
    },

    errors: {
        gameRunning: "FS25 is running: it would overwrite this change when it exits. Close the game and try again.",
        noModsOverrideTag: "<modsDirectoryOverride> tag not found in gameSettings.xml",
        profileFolderNotFound: "Profile folder not found",
        profileOrDefaultNotFound: "Profile or Default folder not found",
        targetFolderNotFound: "Target folder not found",
        folderNotFound: "Folder not found",
        fileNotFound: "File not found",
        invalidProfile: "Invalid profile",
        notOnDefault: "Not possible on Default",
        favoriteNotInDefault: "Favorite mod not found in Default",
        localModNotFound: "Local mod not found",
        alreadyInFavorites: "A mod with the same name is already in the favorites",
        modNotInProfile: "Mod not found in the profile",
        notALinkedFavorite: "This mod isn't a linked favorite",
        fileAlreadyInProfile: "A file with the same name already exists in the profile: {fileName}",
        savegameNotFound: "Savegame not found",
        noLaunchUrl: "No launch URL configured (see Settings)",
        invalidLaunchUrl: "Invalid launch URL",
        invalidGithubUrl: "Invalid GitHub URL",
        invalidUrl: "Invalid URL",
        fs: {
            busy: "file in use or protected",
            isDirectory: "a folder has this name",
            notFound: "file not found"
        },
        profileName: {
            empty: "Empty profile name",
            reserved: "“Default” is reserved for favorite mods",
            invalidChars: "The name must not contain < > : \" / \\ | ? *",
            trailingDot: "The name must not end with a dot or a space",
            windowsReserved: "This name is reserved by Windows",
            exists: "This profile already exists"
        },
        settings: {
            gamePathNotFound: "Game folder not found",
            modsPathNotFound: "Favorite mods folder not found",
            profilesPathNotFound: "Per-map mods folder not found",
            invalidLaunchUrl: "The launch URL must start with playnite:// or steam://",
            noGameSettings: "gameSettings.xml not found in the game folder: is this really the FarmingSimulator2025 folder?",
            differentDrives: "Favorite mods and per-map mods are on different drives: favorites can't be linked into profiles."
        },
        download: {
            tooManyRedirects: "Download failed (too many redirects)",
            failed: "Download failed ({status})",
            notAMod: "The downloaded file doesn't look like a valid FS mod (modDesc.xml not found)",
            invalidZip: "The downloaded file isn't a valid ZIP",
            timeout: "The download stopped responding (timed out)"
        },
        github: {
            invalidRepoUrl: "Invalid GitHub URL. Expected format: https://github.com/owner/repo",
            httpError: "GitHub error ({status})",
            apiError: "GitHub error: {message}",
            timeout: "GitHub isn't responding (timed out)",
            noRelease: "No usable release found in this repository",
            noAsset: "This release has no assets",
            noZip: "No ZIP file found in the release",
            severalZips: "Several valid ZIPs were found in the release",
            ambiguousZip: "Couldn't tell which ZIP is the mod",
            notTracked: "This mod isn't tracked through GitHub",
            localFileNotFound: "The local file can't be found in profile {profile}",
            entryNotFound: "GitHub entry not found in the registry"
        },
        external: {
            zipNotFound: "The selected ZIP file can't be found",
            notZip: "The selected file must be a ZIP",
            notAMod: "The selected ZIP doesn't look like a valid FS mod",
            noZipSelected: "No ZIP selected",
            urlRequired: "Please enter a URL"
        },
        copy: {
            fromDefault: "To share a mod from Default, use favorites",
            invalidTarget: "invalid profile",
            otherVersionPresent: "another version is already there"
        }
    }
};
