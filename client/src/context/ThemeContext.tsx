import { createContext, useContext, useState, type ReactNode } from "react";

export type UITheme = "default" | "slate" | "bold" | "flat" | "dark";

interface ThemeContextValue {
  theme: UITheme;
  setTheme: (t: UITheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "default",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<UITheme>(() => {
    return (localStorage.getItem("ro_ui_theme") as UITheme) ?? "default";
  });

  const setTheme = (t: UITheme) => {
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.classList.remove("dark");
      if (t === "default") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", t);
      }
    }
    localStorage.setItem("ro_ui_theme", t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useUITheme() {
  return useContext(ThemeContext);
}
