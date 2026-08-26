import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "shadow-theme";

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Tema visual (claro/escuro). Persiste em localStorage; na ausência de
 * escolha, segue a preferência do sistema com fallback para escuro.
 * Retorna null antes da hidratação para evitar mismatch de SSR.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const initial = readStoredTheme() ?? systemTheme();
    applyTheme(initial);
    setTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* armazenamento indisponível — mantém apenas em memória */
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
