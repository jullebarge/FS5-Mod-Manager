const fs = require('fs');
const https = require('https');
const { withZip } = require('../zipReader');

// Delai sans activite reseau avant abandon, et nombre max de redirections suivies
const HTTP_TIMEOUT = 30 * 1000;
const MAX_REDIRECTS = 5;

// Telecharge un mod ZIP, verifie qu'il contient un modDesc.xml, puis remplace la destination
function downloadFile(url, destinationPath, redirectsLeft = MAX_REDIRECTS) {
    return new Promise((resolve, reject) => {
        const tempPath = destinationPath + ".download";
        let fileStream = null;

        // interruption reseau ou delai depasse : on ferme le fichier partiel avant de le supprimer
        function fail(err) {
            if (fileStream) {
                fileStream.destroy();
            }
            fs.rm(tempPath, { force: true }, () => {});
            reject(err);
        }

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

                if (redirectsLeft <= 0) {
                    reject(new Error("Echec du telechargement (trop de redirections)"));
                    return;
                }

                downloadFile(response.headers.location, destinationPath, redirectsLeft - 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (!response.statusCode || response.statusCode >= 400) {
                response.resume();
                reject(new Error(`Echec du telechargement (${response.statusCode || "?"})`));
                return;
            }

            fileStream = fs.createWriteStream(tempPath);

            response.on("error", fail);
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

        request.setTimeout(HTTP_TIMEOUT, () => {
            request.destroy(new Error("Le téléchargement ne répond plus (délai dépassé)"));
        });

        request.on("error", fail);
    });
}

module.exports = {
    HTTP_TIMEOUT,
    downloadFile
};
