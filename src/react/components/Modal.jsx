import React from "react";

// Fenetre modale : titre, contenu, puis boutons alignes a droite
export function Modal({ title, width = 460, actions, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: `${width}px` }}>
        <h3>{title}</h3>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
