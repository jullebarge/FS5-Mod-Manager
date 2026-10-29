# FS25 Mod Manager

A Windows mod manager for **Farming Simulator 25**, built around one idea: **a separate mods folder for each savegame**, while sharing the mods you use everywhere without copying them.

*[Version française plus bas](#version-française)*

## Features

- **One profile per map / savegame**: each profile is its own mods folder; switching profile updates the game's `gameSettings.xml` for you.
- **Favorite mods shared across profiles**: favorites live once in the game's `mods` folder and are *hard-linked* into each profile. No duplicated gigabytes, and you can exclude a favorite from a given profile.
- **Favorites kept in sync**: detects favorites updated in a profile (for example by the in-game ModHub) and lets you keep that newer version for every profile, or restore the favorite one.
- **Savegame analysis**: compares the mods enabled in a savegame with the profile folder: missing mods (and whether they own vehicles or buildings in the save), unused mods with their size, version changes.
- **Missing dependencies**: reads `<dependencies>` from each `modDesc.xml` and shows where to find the missing ones.
- **GitHub mods**: install a mod from a GitHub repository's releases and update it from the app.
- **External mods**: keep the source page of mods downloaded elsewhere.
- **Copy a local mod to other profiles** without making it a favorite.
- **FS25 running detection**, settings for every folder, English and French interface.

## Installation

1. Download the latest `fs25-mod-manager-win32-x64-<version>.zip` from the [Releases](../../releases) page.
2. Extract it anywhere and run `fs25-mod-manager.exe`.
3. On first launch, check **Settings**: the game folder defaults to `Documents\My Games\FarmingSimulator2025`.

Favorites are hard links: the favorites folder and the per-map folder must be **on the same drive**.

## Building from source

Requires [Node.js](https://nodejs.org/) (LTS) on Windows.

```bash
npm install
npm start          # development mode
npm run make       # builds the zip in out/make
```

## Credits

- Mod icons are converted from DDS with `texconv` from Microsoft [DirectXTex](https://github.com/microsoft/DirectXTex) (MIT license), shipped in `assets/`.
- Farming Simulator is a trademark of GIANTS Software. This project is not affiliated with GIANTS Software.

## License

[MIT](LICENSE)

---

## Version française

Un gestionnaire de mods Windows pour **Farming Simulator 25**, construit autour d'une idée : **un dossier de mods par sauvegarde**, tout en partageant les mods utilisés partout sans les copier.

### Fonctions

- **Un profil par carte / sauvegarde** : chaque profil est un dossier de mods ; changer de profil met à jour `gameSettings.xml` pour toi.
- **Mods favoris partagés entre profils** : les favoris sont stockés une seule fois dans le dossier `mods` du jeu et *liés* (liens physiques) dans chaque profil. Aucun gigaoctet dupliqué, et un favori peut être exclu d'un profil.
- **Favoris synchronisés** : détecte un favori mis à jour dans un profil (par exemple par le ModHub du jeu) et permet de garder cette version pour tous les profils, ou de reprendre celle des favoris.
- **Analyse des sauvegardes** : compare les mods activés dans une partie avec le dossier du profil : mods manquants (et s'ils ont des véhicules ou bâtiments dans la partie), mods inutilisés avec leur taille, changements de version.
- **Dépendances manquantes** : lit les `<dependencies>` de chaque `modDesc.xml` et indique où trouver celles qui manquent.
- **Mods GitHub** : installe un mod depuis les releases d'un dépôt GitHub et le met à jour depuis l'appli.
- **Mods externes** : garde la page d'origine des mods téléchargés ailleurs.
- **Copie d'un mod local vers d'autres profils**, sans en faire un favori.
- **Détection du jeu lancé**, réglage de tous les dossiers, interface en français et en anglais.

### Installation

1. Télécharge le dernier `fs25-mod-manager-win32-x64-<version>.zip` depuis la page [Releases](../../releases).
2. Extrais-le où tu veux et lance `fs25-mod-manager.exe`.
3. Au premier lancement, vérifie les **Réglages** : le dossier du jeu est par défaut `Documents\My Games\FarmingSimulator2025`.

Les favoris sont des liens physiques : le dossier des favoris et celui des mods par carte doivent être **sur le même disque**.

### Compiler depuis les sources

Nécessite [Node.js](https://nodejs.org/) (LTS) sous Windows.

```bash
npm install
npm start          # mode développement
npm run make       # génère le zip dans out/make
```
