// Windows ignore la casse des noms de fichiers
export function includesFileName(list, fileName) {
  const name = String(fileName || "").toLowerCase();
  return list.some((item) => String(item || "").toLowerCase() === name);
}

export function formatSizeStats(bytes) {
  const mb = bytes / (1024 * 1024);

  if (mb >= 1024) {
    const gb = mb / 1024;
    return gb.toLocaleString("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + " Go";
  }

  return mb.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }) + " Mo";
}

export function formatSize(bytes) {
  if (!bytes) return "0 o";

  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;

  if (bytes >= gb) {
    return bytes.toLocaleString("fr-FR", {
      style: "unit",
      unit: "gigabyte",
      unitDisplay: "narrow",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  if (bytes >= mb) {
    return (bytes / mb).toLocaleString("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + " Mo";
  }

  if (bytes >= kb) {
    return (bytes / kb).toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) + " Ko";
  }

  return bytes.toLocaleString("fr-FR") + " o";
}

const STATUS_DISPLAY = {
  "common-linked": { icon: "⭐", tooltip: "Mod favori lié", color: "#A8B655" },
  "common-excluded": { icon: "🚫", tooltip: "Mod favori exclu", color: "#d9534f" },
  local: { icon: "📦", tooltip: "Mod local", color: "#cccccc" },
  directory: { icon: "📁", tooltip: "Mod dossier (dézippé)", color: "#5bc0de" }
};

const UNKNOWN_STATUS = { icon: "❓", tooltip: "Statut inconnu", color: "#999999" };

export function getStatusDisplay(status) {
  return STATUS_DISPLAY[status] || UNKNOWN_STATUS;
}
