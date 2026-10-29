const fs = require('fs');
const zlib = require('zlib');
const AdmZip = require('adm-zip');

// Lecteur ZIP minimal : ne lit que le repertoire central puis les entrees demandees,
// au lieu de charger tout le fichier en memoire comme AdmZip.
// En cas de format non gere (chiffrement, compression exotique...), on bascule sur AdmZip.

const EOCD_SIG = 0x06054b50;
const ZIP64_LOCATOR_SIG = 0x07064b50;
const ZIP64_EOCD_SIG = 0x06064b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const EOCD_MAX_SEARCH = EOCD_MIN_SIZE + 0xffff;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;

function readAt(fd, position, length) {
    const buffer = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, position);
    if (bytesRead !== length) {
        throw new Error("Lecture ZIP tronquee");
    }
    return buffer;
}

function findEndOfCentralDirectory(fd, fileSize) {
    const length = Math.min(fileSize, EOCD_MAX_SEARCH);
    const start = fileSize - length;
    const tail = readAt(fd, start, length);

    for (let i = length - EOCD_MIN_SIZE; i >= 0; i--) {
        if (tail.readUInt32LE(i) === EOCD_SIG) {
            return { tail, offset: i, position: start + i };
        }
    }

    throw new Error("Fin du repertoire central introuvable");
}

function readCentralDirectoryLocation(fd) {
    const fileSize = fs.fstatSync(fd).size;
    const { tail, offset, position } = findEndOfCentralDirectory(fd, fileSize);

    let entryCount = tail.readUInt16LE(offset + 10);
    let size = tail.readUInt32LE(offset + 12);
    let start = tail.readUInt32LE(offset + 16);

    if (entryCount === MAX_UINT16 || size === MAX_UINT32 || start === MAX_UINT32) {
        const locator = readAt(fd, position - 20, 20);
        if (locator.readUInt32LE(0) !== ZIP64_LOCATOR_SIG) {
            throw new Error("Localisateur ZIP64 introuvable");
        }

        const zip64 = readAt(fd, Number(locator.readBigUInt64LE(8)), 56);
        if (zip64.readUInt32LE(0) !== ZIP64_EOCD_SIG) {
            throw new Error("Fin du repertoire central ZIP64 invalide");
        }

        entryCount = Number(zip64.readBigUInt64LE(32));
        size = Number(zip64.readBigUInt64LE(40));
        start = Number(zip64.readBigUInt64LE(48));
    }

    return { entryCount, size, start };
}

function applyZip64Extra(entry, cd, extraStart, extraEnd) {
    let p = extraStart;

    while (p + 4 <= extraEnd) {
        const id = cd.readUInt16LE(p);
        const length = cd.readUInt16LE(p + 2);

        if (id === 0x0001) {
            let q = p + 4;
            if (entry.size === MAX_UINT32) {
                entry.size = Number(cd.readBigUInt64LE(q));
                q += 8;
            }
            if (entry.compressedSize === MAX_UINT32) {
                entry.compressedSize = Number(cd.readBigUInt64LE(q));
                q += 8;
            }
            if (entry.localHeaderOffset === MAX_UINT32) {
                entry.localHeaderOffset = Number(cd.readBigUInt64LE(q));
            }
            return;
        }

        p += 4 + length;
    }
}

function readCentralDirectory(fd) {
    const location = readCentralDirectoryLocation(fd);
    const cd = readAt(fd, location.start, location.size);
    const entries = [];
    let p = 0;

    for (let i = 0; i < location.entryCount; i++) {
        if (cd.readUInt32LE(p) !== CENTRAL_SIG) {
            throw new Error("Repertoire central ZIP invalide");
        }

        const nameLength = cd.readUInt16LE(p + 28);
        const extraLength = cd.readUInt16LE(p + 30);
        const commentLength = cd.readUInt16LE(p + 32);
        const nameStart = p + 46;
        const entryName = cd.toString('utf8', nameStart, nameStart + nameLength);

        const entry = {
            entryName,
            isDirectory: entryName.endsWith('/'),
            flags: cd.readUInt16LE(p + 8),
            method: cd.readUInt16LE(p + 10),
            compressedSize: cd.readUInt32LE(p + 20),
            size: cd.readUInt32LE(p + 24),
            localHeaderOffset: cd.readUInt32LE(p + 42)
        };

        if (
            entry.size === MAX_UINT32 ||
            entry.compressedSize === MAX_UINT32 ||
            entry.localHeaderOffset === MAX_UINT32
        ) {
            const extraStart = nameStart + nameLength;
            applyZip64Extra(entry, cd, extraStart, extraStart + extraLength);
        }

        entries.push(entry);
        p = nameStart + nameLength + extraLength + commentLength;
    }

    return entries;
}

function readLocalEntry(fd, entry) {
    if (entry.flags & 0x1) {
        throw new Error("Entree ZIP chiffree");
    }

    const header = readAt(fd, entry.localHeaderOffset, 30);
    if (header.readUInt32LE(0) !== LOCAL_SIG) {
        throw new Error("En-tete local ZIP invalide");
    }

    const dataStart = entry.localHeaderOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
    const raw = readAt(fd, dataStart, entry.compressedSize);

    if (entry.method === 0) {
        return raw;
    }

    if (entry.method === 8) {
        return zlib.inflateRawSync(raw);
    }

    throw new Error(`Methode de compression ZIP non geree (${entry.method})`);
}

class ZipReader {
    constructor(filePath) {
        this.filePath = filePath;
        this.fd = null;
        this.admZip = null;
        this.entries = [];

        try {
            this.fd = fs.openSync(filePath, 'r');
            this.entries = readCentralDirectory(this.fd);
        } catch {
            this.closeFd();
            this.useAdmZip();
        }
    }

    useAdmZip() {
        if (this.admZip) return;

        this.admZip = new AdmZip(this.filePath);
        this.entries = this.admZip.getEntries().map((e) => ({
            entryName: e.entryName,
            isDirectory: e.isDirectory
        }));
    }

    getEntries() {
        return this.entries;
    }

    getEntry(name) {
        return this.entries.find((e) => e.entryName === name) || null;
    }

    readEntry(entry) {
        if (!this.admZip) {
            try {
                return readLocalEntry(this.fd, entry);
            } catch {
                this.closeFd();
                this.useAdmZip();
            }
        }

        const admEntry = this.admZip.getEntry(entry.entryName);
        return admEntry ? admEntry.getData() : null;
    }

    readAsText(entry) {
        const data = this.readEntry(entry);
        return data ? data.toString('utf8') : '';
    }

    closeFd() {
        if (this.fd !== null) {
            try {
                fs.closeSync(this.fd);
            } catch {}
            this.fd = null;
        }
    }

    close() {
        this.closeFd();
        this.admZip = null;
    }
}

function withZip(filePath, fn) {
    const zip = new ZipReader(filePath);
    try {
        return fn(zip);
    } finally {
        zip.close();
    }
}

module.exports = {
    ZipReader,
    withZip
};
