"use client";

import { createContext, useContext, useEffect, useState } from "react";

/* ── Contexto ────────────────────────────────────────────── */
const ThemeContext = createContext(null);

/**
 * ThemeProvider — Proveedor de tema dual Light / Dark
 *
 * - Por defecto: "dark" (preserva la experiencia original de ACCI)
 * - Persiste en localStorage con clave "acci-theme"
 * - Agrega/quita la clase "dark" en <html>
 * - No modifica ningún componente existente
 */
export function ThemeProvider({ children, defaultTheme = "light" }) {
  const [theme, setTheme] = useState(defaultTheme);
  const [mounted, setMounted] = useState(false);

  /* Leer preferencia guardada al montar */
  useEffect(() => {
    const stored = localStorage.getItem("acci-theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  /* Aplicar clase al <html> y persistir */
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("acci-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme — Hook para consumir el contexto de tema
 *
 * @returns {{ theme: "light"|"dark", setTheme: Function, toggleTheme: Function }}
 *
 * Uso en cualquier Client Component:
 * ```jsx
 * "use client";
 * import { useTheme } from "@/components/ui/ThemeProvider";
 *
 * export function MyComponent() {
 *   const { theme, toggleTheme } = useTheme();
 *   return <button onClick={toggleTheme}>{theme}</button>;
 * }
 * ```
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
