import { getLocaleTag, t } from "../locales/i18n";

// Windows ignore la casse des noms de fichiers
export function includesFileName(list, fileName) {
  const name = String(fileName || "").toLowerCase();
  return list.some((item) => String(item || "").toLowerCase() === name);
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

function formatNumber(value, fractionDigits) {
  return value.toLocaleString(getLocaleTag(), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

// Taille totale (cartes de statistiques) : en Mo, ou en Go au-dela de 1 Go
export function formatSizeStats(bytes) {
  if (bytes >= GB) {
    return `${formatNumber(bytes / GB, 1)} ${t("units.GB")}`;
  }
  return `${formatNumber(bytes / MB, 1)} ${t("units.MB")}`;
}

// Taille d'un mod, dans l'unite la plus lisible
export function formatSize(bytes) {
  if (!bytes) return `0 ${t("units.B")}`;

  if (bytes >= GB) return `${formatNumber(bytes / GB, 1)} ${t("units.GB")}`;
  if (bytes >= MB) return `${formatNumber(bytes / MB, 1)} ${t("units.MB")}`;
  if (bytes >= KB) return `${formatNumber(bytes / KB, 0)} ${t("units.KB")}`;

  return `${formatNumber(bytes, 0)} ${t("units.B")}`;
}

const STATUS_DISPLAY = {
  "common-linked": { icon: "⭐", tooltipKey: "status.favoriteLinked", color: "#A8B655" },
  "common-excluded": { icon: "🚫", tooltipKey: "status.favoriteExcluded", color: "#d9534f" },
  local: { icon: "📦", tooltipKey: "status.local", color: "#cccccc" },
  directory: { icon: "📁", tooltipKey: "status.directory", color: "#5bc0de" }
};

const UNKNOWN_STATUS = { icon: "❓", tooltipKey: "status.unknown", color: "#999999" };

export function getStatusDisplay(status) {
  const display = STATUS_DISPLAY[status] || UNKNOWN_STATUS;
  return { ...display, tooltip: t(display.tooltipKey) };
}
