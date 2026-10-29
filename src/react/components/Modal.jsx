import React from "react";

// Fenetre modale : titre, contenu, puis boutons alignes a droite.
// scrollable : contenu limite a la hauteur de la fenetre, avec defilement
export function Modal({ title, width = 460, scrollable = false, actions, children }) {
  const scrollStyle = scrollable ? { maxHeight: "85vh", overflowY: "auto" } : {};

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: `${width}px`, ...scrollStyle }}>
        <h3>{title}</h3>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
