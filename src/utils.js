const fs = require('fs');
const path = require('path');

function readJsonFile(filePath, defaultValue = []) {
    try {
        if (!fs.existsSync(filePath)) {
            return defaultValue;
        }
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : defaultValue;
    } catch {
        return defaultValue;
    }
}

function writeJsonFile(filePath, data, pretty = true) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, pretty ? 2 : 0), 'utf-8');
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function parseIconFilename(xml) {
    const match = xml.match(/<iconFilename>\s*([\s\S]*?)\s*<\/iconFilename>/i);
    return match ? match[1] : null;
}

function cleanXmlText(text) {
    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&")
        .trim();
}

// Titres du mod par langue : <title><en>..</en><fr>..</fr></title> -> { en, fr },
// ou { default } pour un titre sans langue
function parseModTitles(xml) {
    const block = xml.match(/<title>([\s\S]*?)<\/title>/);
    if (!block) return {};

    const titles = {};
    for (const match of block[1].matchAll(/<([a-z]{2,3})>([\s\S]*?)<\/\1>/g)) {
        const title = cleanXmlText(match[2]);
        if (title) titles[match[1]] = title;
    }

    if (Object.keys(titles).length === 0) {
        const title = cleanXmlText(block[1]);
        if (title) titles.default = title;
    }

    return titles;
}

// Titre dans la langue demandee, sinon anglais, sinon titre sans langue, sinon le premier trouve
function pickModTitle(titles, language, fallback) {
    if (!titles) return fallback;
    return titles[language] || titles.en || titles.default || Object.values(titles)[0] || fallback;
}

function parseModTitle(xml, fileName) {
    let name = fileName;

    const titleBlockMatch = xml.match(/<title>([\s\S]*?)<\/title>/);

    if (titleBlockMatch) {
        const titleBlock = titleBlockMatch[1];

        const frMatch = titleBlock.match(/<fr>(.*?)<\/fr>/);
        const enMatch = titleBlock.match(/<en>(.*?)<\/en>/);
        const simpleMatch = titleBlock.match(/^\s*([^<]+)\s*$/);

        if (frMatch) {
            name = frMatch[1];
        } else if (enMatch) {
            name = enMatch[1];
        } else if (simpleMatch) {
            name = simpleMatch[1];
        }
    }

    return name;
}

function parseModVersion(xml) {
    const versionMatch = xml.match(/<version>([^<]+)<\/version>/);
    return versionMatch ? versionMatch[1] : "?";
}

function parseModAuthor(xml) {
    const authorMatch = xml.match(/<author>(.*?)<\/author>/);
    return authorMatch ? authorMatch[1] : "?";
}

// Mods requis : <dependencies><dependency>FS25_Xxx</dependency></dependencies>.
// Les DLC (pdlc_*) sont ignores : ils sont installes avec le jeu, pas dans les dossiers de mods.
function parseModDependencies(xml) {
    const block = xml.match(/<dependencies>([\s\S]*?)<\/dependencies>/);
    if (!block) return [];

    return [...block[1].matchAll(/<dependency[^>]*>\s*([^<]+?)\s*<\/dependency>/g)]
        .map((match) => match[1])
        .filter((name) => !name.toLowerCase().startsWith("pdlc_"));
}

function parseModDesc(zip, modFilePath) {
    const xmlEntry = zip.getEntry('modDesc.xml');

    if (!xmlEntry) {
        return null;
    }

    const xml = zip.readAsText(xmlEntry);

    return {
        name: parseModTitle(xml, modFilePath),
        titles: parseModTitles(xml),
        version: parseModVersion(xml),
        author: parseModAuthor(xml),
        iconFilename: parseIconFilename(xml),
        dependencies: parseModDependencies(xml),
        rawXml: xml
    };
}

function getModInfo(zip, fileName) {
    const parsed = parseModDesc(zip, fileName);
    if (!parsed) {
        return { name: fileName, version: '?', author: '?' };
    }
    return {
        name: parsed.name,
        titles: parsed.titles,
        version: parsed.version,
        author: parsed.author,
        iconFilename: parsed.iconFilename,
        dependencies: parsed.dependencies
    };
}

function parseModDescFromDirectory(dirPath, dirName) {
    const modDescPath = path.join(dirPath, 'modDesc.xml');
    if (!fs.existsSync(modDescPath)) {
        return null;
    }

    try {
        const xml = fs.readFileSync(modDescPath, 'utf-8');
        return {
            name: parseModTitle(xml, dirName),
            titles: parseModTitles(xml),
            version: parseModVersion(xml),
            author: parseModAuthor(xml),
            iconFilename: parseIconFilename(xml),
            rawXml: xml
        };
    } catch {
        return null;
    }
}

function getModInfoFromDirectory(dirPath, dirName) {
    const parsed = parseModDescFromDirectory(dirPath, dirName);
    if (!parsed) {
        return { name: dirName, version: '?', author: '?' };
    }
    return {
        name: parsed.name,
        titles: parsed.titles,
        version: parsed.version,
        author: parsed.author,
        iconFilename: parsed.iconFilename,
        dependencies: parsed.dependencies
    };
}

module.exports = {
    readJsonFile,
    writeJsonFile,
    ensureDir,
    parseIconFilename,
    parseModTitle,
    parseModTitles,
    pickModTitle,
    parseModVersion,
    parseModAuthor,
    parseModDependencies,
    parseModDesc,
    getModInfo,
    parseModDescFromDirectory,
    getModInfoFromDirectory
};