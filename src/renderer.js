import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { setLanguage } from "./locales/i18n";
import App from "./react/App";

// langue des reglages, connue avant le premier affichage
setLanguage(window.fs25.initialLanguage);

const root = createRoot(document.getElementById("root"));
root.render(<App />);
