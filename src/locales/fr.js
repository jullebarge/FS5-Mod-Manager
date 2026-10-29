// Textes francais. { one, other } : pluriel selon params.count (0 et 1 au singulier).
module.exports = {
    common: {
        add: "Ajouter",
        cancel: "Annuler",
        close: "Fermer",
        confirm: "Valider",
        delete: "Supprimer",
        save: "Enregistrer",
        loading: "Chargement",
        errorPrefix: "Erreur : {error}"
    },

    units: {
        B: "o",
        KB: "Ko",
        MB: "Mo",
        GB: "Go"
    },

    status: {
        favoriteLinked: "Mod favori lié",
        favoriteExcluded: "Mod favori exclu",
        local: "Mod local",
        directory: "Mod dossier (dézippé)",
        unknown: "Statut inconnu"
    },

    app: {
        activeProfile: "Profil actif :",
        selectedProfile: "Profil sélectionné",
        pendingChange: "Changement non appliqué",
        gameRunning: "FS25 est lancé : changement de profil désactivé, certaines opérations sur les mods peuvent échouer",
        gameRunningTooltip: "Le jeu réécrit gameSettings.xml en quittant et verrouille les mods chargés",
        closeGameFirst: "Ferme FS25 avant de changer de profil",
        noLaunchUrl: "Aucune URL de lancement : voir Réglages",
        savegamesTooltip: "Mods manquants ou inutilisés par les parties qui utilisent ce profil",
        checkGithubTooltip: "Vérifier les mises à jour des mods GitHub",
        searchPlaceholder: "Rechercher un mod...",
        noMods: "Aucun mod trouvé pour ce profil.",
        button: {
            changeProfile: "Changer de profil",
            createProfile: "Créer un profil",
            openFolder: "Ouvrir le dossier",
            refresh: "Rafraîchir",
            launchGame: "Lancer le jeu",
            settings: "Réglages",
            repairLinks: "Copier les favoris dans le profil",
            removeLinks: "Supprimer les favoris du profil",
            savegames: "Analyser les sauvegardes",
            addGithubMod: "Ajouter un mod GitHub",
            checkGithub: "Vérifier les MAJ GitHub",
            addExternalMod: "Ajouter un mod externe"
        },
        stats: {
            all: "Tous les mods",
            size: "Taille",
            favorites: "Favoris",
            local: "Locaux",
            excluded: "Exclus",
            github: "Suivis GitHub",
            external: "Mods externes"
        },
        count: {
            favoritesCopied: { one: "{count} favori copié", other: "{count} favoris copiés" },
            excludedSkipped: { one: "{count} exclu ignoré", other: "{count} exclus ignorés" },
            duplicatesReplaced: { one: "{count} doublon remplacé", other: "{count} doublons remplacés" },
            updatesAvailable: { one: "{count} mise à jour disponible", other: "{count} mises à jour disponibles" },
            modsChecked: { one: "{count} mod vérifié", other: "{count} mods vérifiés" }
        },
        toast: {
            activeProfileChanged: "Profil actif mis à jour : {profile}",
            profileCreated: "Profil créé : {profile}",
            repairInProgress: "Copie des mods favoris en cours...",
            repairDone: "{linked}, {excluded}, {duplicates}",
            repairResynced: { one: ", {count} resynchronisé", other: ", {count} resynchronisés" },
            repairKeptNewer: {
                one: "{count} favori plus récent dans le profil conservé : utilise « Garder cette version » pour le remonter dans les favoris",
                other: "{count} favoris plus récents dans le profil conservés : utilise « Garder cette version » pour les remonter dans les favoris"
            },
            repairErrors: { one: "{count} favori non traité (jeu lancé ?)", other: "{count} favoris non traités (jeu lancé ?)" },
            removeLinksInProgress: "Suppression des mods favoris en cours...",
            removeLinksDone: { one: "{count} mod favori supprimé", other: "{count} mods favoris supprimés" },
            removeLinksErrors: { one: "{count} favori non supprimé (jeu lancé ?)", other: "{count} favoris non supprimés (jeu lancé ?)" },
            refreshInProgress: "Rafraîchissement en cours...",
            refreshDone: "Profil {profile} rafraîchi",
            modExcluded: "{name} exclu du profil",
            modReintegrated: "{name} réintégré dans le profil",
            copyDone: { one: "{name} copié dans {count} profil", other: "{name} copié dans {count} profils" },
            copyReplaced: { one: " ({count} version remplacée)", other: " ({count} versions remplacées)" },
            copyErrors: "Copie impossible",
            dependencyAdded: "{name} ajouté au profil",
            favoritesExcluded: { one: "{count} favori exclu du profil", other: "{count} favoris exclus du profil" },
            favoritesExcludeErrors: "Favoris non exclus",
            promotedToFavorite: "{name} ajouté aux mods favoris",
            deleted: "{name} déplacé dans la corbeille",
            deletedAndRemoved: {
                one: "{name} déplacé dans la corbeille et retiré de {count} profil",
                other: "{name} déplacé dans la corbeille et retiré de {count} profils"
            },
            deleteProfileErrors: "Non retiré de certains profils",
            versionPromoted: {
                one: "{name} v{version} remonté dans les favoris et relié dans {count} profil",
                other: "{name} v{version} remonté dans les favoris et relié dans {count} profils"
            },
            linksNotUpdated: "Liens non mis à jour",
            favoriteVersionRestored: "{name} : version des favoris reprise (v{version})",
            settingsSaved: "Réglages enregistrés",
            githubUrlRequired: "Merci de saisir une URL GitHub",
            githubDownloading: "Téléchargement du mod GitHub en cours...",
            githubDownloaded: "{fileName} téléchargé depuis {repo}",
            githubChecking: "Vérification des mises à jour GitHub en cours...",
            githubNoneTracked: "Aucun mod GitHub suivi sur ce profil",
            githubUpdatesFound: "{updates} sur {checked}",
            githubNoUpdate: { one: "Aucune mise à jour trouvée sur {count} mod", other: "Aucune mise à jour trouvée sur {count} mods" },
            githubUpdating: "Mise à jour de {name} en cours...",
            githubFavoriteUpdated: {
                one: "{name} mis à jour dans les favoris (Default) et {count} profil",
                other: "{name} mis à jour dans les favoris (Default) et {count} profils"
            },
            githubUpdated: "{name} mis à jour",
            zipRequired: "Merci de sélectionner un fichier ZIP",
            urlRequired: "Merci de saisir une URL",
            externalAdded: "{fileName} ajouté comme mod externe"
        }
    },

    card: {
        openActions: "Cliquer pour ouvrir les actions",
        folder: "Dossier",
        githubTooltip: "Mod suivi via GitHub",
        external: "Externe",
        externalTooltip: "Mod externe suivi",
        prereleaseTooltip: "Le suivi utilise aussi les pre-releases",
        githubError: "Erreur GitHub",
        updateAvailable: "MAJ dispo",
        updateAvailableTooltip: "Une mise à jour GitHub est disponible",
        missingDependency: "Dépendance manquante",
        missingDependencyTooltip: "Mods requis absents de ce profil : {mods}",
        duplicateCopy: "Copie",
        duplicateCopyTooltip: "Fichier identique au favori, mais copié au lieu d'être lié : « Copier les favoris » le remplace par un lien et libère la place",
        favoriteVersionTooltip: "Version des favoris : v{version}",
        newerThanFavorite: "Plus récent que le favori",
        shared: "Partagé ×{count}",
        sharedTooltip: "Aussi présent dans : {profiles}. S'il sert partout, « Passer en favori » le garde en un seul exemplaire, lié dans chaque profil.",
        outOfSync: "Désynchro"
    },

    menu: {
        promoteToFavorite: "Passer en favori",
        copyToProfiles: "Copier vers un autre profil",
        exclude: "Exclure du profil",
        reintegrate: "Réintégrer dans le profil",
        keepProfileVersion: "Garder cette version (remonter dans les favoris)",
        useFavoriteVersion: "Reprendre la version des favoris",
        openGithub: "Ouvrir le lien GitHub",
        updateFromGithub: "Mettre à jour depuis GitHub",
        openExternal: "Ouvrir le lien externe",
        openFolder: "Ouvrir le dossier",
        openZip: "Ouvrir le zip",
        delete: "Supprimer"
    },

    banners: {
        conflicts: { one: "{count} mod en conflit :", other: "{count} mods en conflit :" },
        missingDependencies: { one: "{count} dépendance manquante :", other: "{count} dépendances manquantes :" },
        requiredBy: "requis par {mods}",
        reintegrateFavorite: "Réintégrer le favori",
        linkFavorite: "Lier le favori",
        copyFrom: "Copier depuis {profile}",
        dependencyNotFound: "introuvable dans tes dossiers : à télécharger",
        outOfSync: { one: "{count} favori désynchronisé :", other: "{count} favoris désynchronisés :" },
        versions: "profil v{profileVersion} · favoris v{favoriteVersion}",
        profileNewer: "(profil plus récent)",
        keepProfile: "Garder celle du profil",
        keepProfileTooltip: "Remplace la version des favoris (Default) par celle de ce profil, puis relie tous les profils qui l'utilisent",
        useFavorite: "Reprendre celle des favoris",
        useFavoriteTooltip: "Remplace la copie de ce profil par la version des favoris (l'ancienne copie part à la corbeille)"
    },

    createProfile: {
        title: "Créer un profil",
        placeholder: "Nom du profil"
    },

    githubModal: {
        title: "Ajouter un mod GitHub",
        target: "Le ZIP du mod sera téléchargé dans le profil sélectionné :",
        download: "Télécharger",
        includePrereleases: "Inclure les pre-releases",
        prereleasesHint: "Si cette option est décochée, seule la dernière release stable sera utilisée."
    },

    externalModal: {
        title: "Ajouter un mod externe",
        target: "Le ZIP sera copié dans le profil sélectionné :",
        noZip: "Aucun ZIP sélectionné",
        pickZip: "Choisir un ZIP",
        urlHint: "Exemples : page KingMods, page de forum, page perso du mod."
    },

    deleteModal: {
        title: "Supprimer {name} ?",
        folder: "Le dossier",
        file: "Le fichier",
        toTrash: "sera déplacé dans la corbeille de Windows.",
        linkedFavoriteHint: "Le mod reste dans les favoris (Default) et reviendra à la prochaine copie des favoris. Pour le retirer durablement de ce profil, utilise plutôt « Exclure du profil ».",
        searchingUsage: "Recherche des profils qui utilisent ce favori...",
        linkedIn: { one: "Ce favori est lié dans {count} profil :", other: "Ce favori est lié dans {count} profils :" },
        removeFromProfiles: "Le retirer aussi de ces profils",
        notUsed: "Aucun profil n'utilise ce mod comme favori."
    },

    copyModal: {
        title: "Copier {name} vers d'autres profils",
        submit: { one: "Copier vers {count} profil", other: "Copier vers {count} profils" },
        hintZip: "Le zip du mod sera copié dans chaque profil coché : une copie indépendante, qui reste un mod local de ce profil.",
        hintFolder: "Le dossier du mod sera copié dans chaque profil coché : une copie indépendante, qui reste un mod local de ce profil.",
        loading: "Lecture des profils...",
        noProfiles: "Aucun autre profil.",
        alreadyPresent: "déjà présent (fichier identique)",
        otherVersion: "une autre version est présente : elle sera remplacée (corbeille)",
        otherVersionNumbered: "une autre version est présente (v{version}) : elle sera remplacée (corbeille)"
    },

    savegames: {
        title: "Sauvegardes et mods du profil {profile}",
        intro: "Compare les mods activés dans une partie (careerSavegame.xml) avec le dossier de ce profil.",
        loading: "Lecture des sauvegardes...",
        none: "Aucune sauvegarde trouvée dans le dossier du jeu.",
        selected: "Sauvegarde analysée",
        linkedGroup: "Associées au profil {profile}",
        otherGroup: "Autres sauvegardes",
        association: "Profil associé à cette sauvegarde",
        automaticWith: "Automatique ({profile})",
        automaticNone: "Automatique (aucun)",
        noProfile: "Aucun profil",
        noneLinked: "Aucune sauvegarde n'est associée à ce profil : choisis-en une, puis associe-la si besoin.",
        analyzing: "Analyse en cours...",
        summary: "{active} · {inProfile} dans le profil",
        count: {
            activeInGame: { one: "{count} mod activé dans la partie", other: "{count} mods activés dans la partie" }
        },
        sharedWith: "profil partagé avec : {savegames}",
        noMissing: "Aucun mod manquant",
        missing: { one: "{count} mod manquant dans le profil", other: "{count} mods manquants dans le profil" },
        noUnused: "Aucun mod inutilisé",
        unused: {
            one: "{count} mod du profil non activé dans la partie ({size})",
            other: "{count} mods du profil non activés dans la partie ({size})"
        },
        unusedHint: "Le jeu ne les charge pas pour cette partie. Les mods « nouveau » n'ont pas encore été proposés par le jeu.",
        excludeUnused: { one: "Exclure le favori inutilisé", other: "Exclure les {count} favoris inutilisés" },
        versionMismatch: {
            one: "{count} mod dans une autre version que lors de la dernière sauvegarde",
            other: "{count} mods dans une autre version que lors de la dernière sauvegarde"
        },
        versionChange: "partie v{saved} → installé v{installed}",
        required: "requis",
        hasObjects: "objets dans la partie",
        hasObjectsTooltip: "Des véhicules ou bâtiments de ce mod sont dans la partie",
        availability: {
            excludedFavorite: "Favori exclu de ce profil",
            favorite: "Dans les favoris : « Copier les favoris » le liera",
            otherProfile: "Présent dans le profil {profile}",
            none: "Introuvable dans tes dossiers"
        },
        reintegrate: "Réintégrer",
        new: "nouveau",
        newTooltip: "Ajouté après la dernière sauvegarde : la partie ne l'a pas encore proposé",
        usedBy: "utilisé par {savegames}",
        usedByTooltip: "Activé dans une autre partie qui utilise ce profil",
        exclude: "Exclure",
        trash: "Corbeille"
    },

    settings: {
        title: "Réglages",
        language: "Langue",
        browse: "Parcourir",
        defaultValue: "Par défaut : {value}",
        gamePath: {
            label: "Dossier du jeu (contient gameSettings.xml et les sauvegardes)",
            pick: "Choisir le dossier FarmingSimulator2025"
        },
        modsPath: {
            label: "Dossier des mods favoris (profil Default)",
            hint: "Laisser vide pour utiliser le dossier « mods » du jeu.",
            pick: "Choisir le dossier des mods favoris"
        },
        profilesPath: {
            label: "Dossier des mods par carte (un sous-dossier par profil)",
            hint: "Laisser vide pour utiliser le dossier « {folder} » du jeu. Il doit être sur le même disque que les mods favoris (liens des favoris).",
            pick: "Choisir le dossier des mods par carte"
        },
        launchUrl: {
            label: "URL de lancement du jeu (bouton « Lancer le jeu »)",
            placeholder: "playnite://playnite/start/<id> ou steam://rungameid/<id>",
            hint: "Laisser vide pour désactiver le bouton."
        },
        iconCache: {
            label: "Cache des icônes",
            stats: "{files}, {size} — dont {unused} ({unusedSize})",
            count: {
                files: { one: "{count} icône", other: "{count} icônes" },
                unused: { one: "{count} inutilisée", other: "{count} inutilisées" }
            },
            computing: "Calcul en cours...",
            clean: "Nettoyer maintenant",
            cleaning: "Nettoyage...",
            cleaned: {
                one: "{count} icône supprimée, {size} libérés",
                other: "{count} icônes supprimées, {size} libérés"
            },
            hint: "Icônes de mods supprimés ou mis à jour. Le nettoyage se fait aussi automatiquement au démarrage (icônes inutilisées depuis plus de 2 jours)."
        }
    },

    dialogs: {
        pickFolder: "Choisir un dossier",
        pickExternalZip: "Choisir un mod externe",
        zipFilter: "Mods ZIP"
    },

    errors: {
        gameRunning: "FS25 est lancé : il écraserait ce changement en quittant. Ferme le jeu puis réessaie.",
        noModsOverrideTag: "Balise <modsDirectoryOverride> introuvable dans gameSettings.xml",
        profileFolderNotFound: "Dossier du profil introuvable",
        profileOrDefaultNotFound: "Dossier profil ou Default introuvable",
        targetFolderNotFound: "Dossier cible introuvable",
        folderNotFound: "Dossier introuvable",
        fileNotFound: "Fichier introuvable",
        invalidProfile: "Profil invalide",
        notOnDefault: "Action impossible sur Default",
        favoriteNotInDefault: "Mod favori introuvable dans Default",
        localModNotFound: "Mod local introuvable",
        alreadyInFavorites: "Un mod du même nom existe déjà dans les favoris",
        modNotInProfile: "Mod introuvable dans le profil",
        notALinkedFavorite: "Ce mod n'est pas un favori lié",
        fileAlreadyInProfile: "Un fichier du même nom existe déjà dans le profil : {fileName}",
        savegameNotFound: "Sauvegarde introuvable",
        noLaunchUrl: "Aucune URL de lancement configurée (voir Réglages)",
        invalidLaunchUrl: "URL de lancement invalide",
        invalidGithubUrl: "URL GitHub invalide",
        invalidUrl: "URL invalide",
        fs: {
            busy: "fichier utilisé ou protégé",
            isDirectory: "un dossier porte ce nom",
            notFound: "fichier introuvable"
        },
        profileName: {
            empty: "Nom de profil vide",
            reserved: "« Default » est réservé aux mods favoris",
            invalidChars: "Le nom ne doit pas contenir < > : \" / \\ | ? *",
            trailingDot: "Le nom ne doit pas finir par un point ou un espace",
            windowsReserved: "Ce nom est réservé par Windows",
            exists: "Le profil existe déjà"
        },
        settings: {
            gamePathNotFound: "Dossier du jeu introuvable",
            modsPathNotFound: "Dossier des mods favoris introuvable",
            profilesPathNotFound: "Dossier des mods par carte introuvable",
            invalidLaunchUrl: "L'URL de lancement doit commencer par playnite:// ou steam://",
            noGameSettings: "gameSettings.xml introuvable dans le dossier du jeu : est-ce bien le dossier FarmingSimulator2025 ?",
            differentDrives: "Les mods favoris et les mods par carte sont sur des disques différents : les favoris ne pourront pas être liés dans les profils."
        },
        download: {
            tooManyRedirects: "Échec du téléchargement (trop de redirections)",
            failed: "Échec du téléchargement ({status})",
            notAMod: "Le fichier téléchargé ne semble pas être un mod FS valide (modDesc.xml introuvable)",
            invalidZip: "Le fichier téléchargé n'est pas un ZIP valide",
            timeout: "Le téléchargement ne répond plus (délai dépassé)"
        },
        github: {
            invalidRepoUrl: "URL GitHub invalide. Format attendu : https://github.com/owner/repo",
            httpError: "Erreur GitHub ({status})",
            apiError: "Erreur GitHub : {message}",
            timeout: "GitHub ne répond pas (délai dépassé)",
            noRelease: "Aucune release exploitable trouvée sur ce dépôt",
            noAsset: "Cette release ne contient aucun asset",
            noZip: "Aucun fichier ZIP trouvé dans la release",
            severalZips: "Plusieurs ZIP valides ont été trouvés dans la release",
            ambiguousZip: "Impossible de déterminer automatiquement quel ZIP correspond au mod",
            notTracked: "Ce mod n'est pas suivi par GitHub",
            localFileNotFound: "Le fichier local est introuvable dans le profil {profile}",
            entryNotFound: "Entrée GitHub introuvable dans le registre"
        },
        external: {
            zipNotFound: "Le fichier ZIP sélectionné est introuvable",
            notZip: "Le fichier sélectionné doit être un ZIP",
            notAMod: "Le ZIP sélectionné ne semble pas être un mod FS valide",
            noZipSelected: "Aucun ZIP sélectionné",
            urlRequired: "Merci de saisir une URL"
        },
        copy: {
            fromDefault: "Pour partager un mod de Default, utilise les favoris",
            invalidTarget: "profil invalide",
            otherVersionPresent: "une autre version est déjà présente"
        }
    }
};
