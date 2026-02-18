"use client";

import { useTheme } from "./ThemeProvider";

/**
 * FloatingThemeToggle — botón flotante siempre visible.
 * Usa colores explícitos (no variables CSS) para garantizar
 * visibilidad en ambos modos sin depender del tema actual.
 */
export function FloatingThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      style={{
        position:        "fixed",
        bottom:          "1.75rem",
        right:           "1.75rem",
        zIndex:          9999,
        width:           "3rem",
        height:          "3rem",
        borderRadius:    "50%",
        border:          isDark
          ? "1.5px solid rgba(56,189,248,0.55)"
          : "1.5px solid rgba(37,99,235,0.35)",
        background:      isDark
          ? "rgba(2,6,23,0.90)"
          : "rgba(255,255,255,0.92)",
        backdropFilter:  "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color:           isDark ? "#38bdf8" : "#2563eb",
        cursor:          "pointer",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        boxShadow:       isDark
          ? "0 0 18px rgba(56,189,248,0.25), 0 4px 20px rgba(0,0,0,0.60)"
          : "0 2px 16px rgba(37,99,235,0.18), 0 4px 20px rgba(15,23,42,0.10)",
        transition:      "transform 180ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 180ms ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "scale(1.12)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {isDark ? (
        /* Sol — click para pasar a light */
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1"  x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1"  y1="12" x2="3"  y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
          <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Luna — click para pasar a dark */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
