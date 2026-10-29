import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PROFILE, GAME_RUNNING_POLL_INTERVAL, ICON_LOAD_CONCURRENCY } from "./theme";

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((text, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, text, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  // Erreurs par fichier/profil renvoyees par les operations sur les liens
  const showErrorList = useCallback((title, errors) => {
    if (!errors || errors.length === 0) return;

    const details = errors.slice(0, 3).join(" • ");
    const more = errors.length > 3 ? ` (+${errors.length - 3})` : "";
    showToast(`${title} : ${details}${more}`, "error", 10000);
  }, [showToast]);

  return { toasts, showToast, showErrorList };
}

// FS25 lance : changement de profil bloque (le jeu l'ecraserait) et mods potentiellement verrouilles
export function useGameRunning() {
  const [gameRunning, setGameRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkGame() {
      try {
        const running = await window.fs25.isGameRunning();
        if (!cancelled) setGameRunning(running);
      } catch {}
    }

    checkGame();
    const timer = setInterval(checkGame, GAME_RUNNING_POLL_INTERVAL);
    window.addEventListener("focus", checkGame);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", checkGame);
    };
  }, []);

  return gameRunning;
}

// Mods du profil affiche, favoris de Default, exclusions et icones.
// Chaque chargement a un numero : les reponses d'un chargement depasse sont ignorees.
export function useProfileData(profile, enabled, reloadToken) {
  const [mods, setMods] = useState([]);
  const [defaultMods, setDefaultMods] = useState([]);
  const [excludedMods, setExcludedMods] = useState([]);
  const [loadingMods, setLoadingMods] = useState(false);
  const [icons, setIcons] = useState({});

  const requestIdRef = useRef(0);
  // iconKey deja demandes (ou en cours) : evite les doublons entre profil et Default
  const iconRequestsRef = useRef(new Set());

  async function loadIcons(modsList, requestId = requestIdRef.current) {
    const pending = new Map();

    for (const mod of modsList) {
      if (mod.iconKey && !iconRequestsRef.current.has(mod.iconKey) && !pending.has(mod.iconKey)) {
        pending.set(mod.iconKey, mod);
      }
    }

    const queue = [...pending.values()];
    for (const mod of queue) {
      iconRequestsRef.current.add(mod.iconKey);
    }

    async function worker() {
      while (queue.length > 0) {
        if (requestId !== requestIdRef.current) {
          // requete obsolete : on libere les icones non demandees pour un prochain chargement
          for (const mod of queue) {
            iconRequestsRef.current.delete(mod.iconKey);
          }
          queue.length = 0;
          return;
        }

        const mod = queue.shift();
        let icon = null;

        try {
          icon = await window.fs25.getModIcon(mod);
        } catch (err) {
          console.error("Erreur chargement icone:", mod.fileName, err);
        }

        setIcons((prev) => ({ ...prev, [mod.iconKey]: icon }));
      }
    }

    await Promise.all(Array.from({ length: ICON_LOAD_CONCURRENCY }, worker));
  }

  async function refresh(requestId) {
    const [list, excluded, defaultList] = await Promise.all([
      window.fs25.getMods(profile),
      window.fs25.getExcludedMods(profile),
      profile !== DEFAULT_PROFILE ? window.fs25.getMods(DEFAULT_PROFILE) : Promise.resolve([])
    ]);

    if (requestId !== requestIdRef.current) return;

    setMods(list);
    setExcludedMods(excluded);
    setDefaultMods(defaultList);
    setLoadingMods(false);

    await loadIcons(list, requestId);
  }

  // Recharge le profil (apres une action, ou sur demande)
  function reload() {
    const requestId = ++requestIdRef.current;
    setLoadingMods(true);

    return refresh(requestId).catch((err) => {
      if (requestId === requestIdRef.current) {
        console.error("Erreur refreshProfileData:", err);
        setLoadingMods(false);
      }
    });
  }

  useEffect(() => {
    if (!enabled) return;
    reload();
  }, [profile, enabled, reloadToken]);

  return { mods, defaultMods, excludedMods, loadingMods, icons, reload, loadIcons };
}
