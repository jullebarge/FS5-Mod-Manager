// Traductions partagees par le processus principal et l'interface.
// t("cle.sous_cle", { param }) : texte de la langue courante, sinon anglais, sinon la cle.
// Une entree { one, other } est choisie selon params.count (regles de pluriel de la langue).
const fr = require('./fr');
const en = require('./en');

const LOCALES = { fr, en };
const FALLBACK_LANGUAGE = "en";

const LANGUAGES = [
    { code: "fr", label: "Français" },
    { code: "en", label: "English" }
];

let currentLanguage = FALLBACK_LANGUAGE;

function isSupportedLanguage(code) {
    return Object.prototype.hasOwnProperty.call(LOCALES, code);
}

// Langue du systeme ("fr-FR" -> "fr"), anglais si elle n'est pas traduite
function resolveLanguage(code) {
    const base = String(code || "").toLowerCase().split(/[-_]/)[0];
    return isSupportedLanguage(base) ? base : FALLBACK_LANGUAGE;
}

function setLanguage(code) {
    currentLanguage = resolveLanguage(code);
}

function getLanguage() {
    return currentLanguage;
}

// Locale pour les formats de nombres et de dates (Intl)
function getLocaleTag() {
    return currentLanguage === "fr" ? "fr-FR" : "en-GB";
}

function lookup(dictionary, key) {
    return key.split(".").reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), dictionary);
}

function t(key, params = {}) {
    let entry = lookup(LOCALES[currentLanguage], key);
    if (entry === undefined) entry = lookup(LOCALES[FALLBACK_LANGUAGE], key);
    if (entry === undefined) return key;

    if (entry && typeof entry === "object") {
        const category = new Intl.PluralRules(getLocaleTag()).select(Number(params.count) || 0);
        entry = entry[category] !== undefined ? entry[category] : entry.other;
    }

    return String(entry).replace(/\{(\w+)\}/g, (match, name) =>
        params[name] !== undefined && params[name] !== null ? String(params[name]) : match
    );
}

module.exports = {
    LANGUAGES,
    resolveLanguage,
    setLanguage,
    getLanguage,
    getLocaleTag,
    t
};
