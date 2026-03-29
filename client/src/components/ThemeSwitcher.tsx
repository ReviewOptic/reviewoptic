import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/context/ThemeContext";

export type { UITheme };

const THEMES: { id: UITheme; label: string }[] = [
  { id: "default", label: "Classic" },
  { id: "slate",   label: "Slate"   },
  { id: "bold",    label: "Bold"    },
  { id: "flat",    label: "Flat"    },
  { id: "dark",    label: "Dark"    },
];

export default function ThemeSwitcher({ variant = "sidebar" }: { variant?: "sidebar" | "floating" }) {
  const { theme, setTheme } = useUITheme();

  if (variant === "floating") {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-1 bg-background border border-border rounded-full shadow-lg px-3 py-2">
        <span className="text-[10px] text-muted-foreground mr-1.5 font-medium">Style</span>
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors",
              theme === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pb-2 pt-1">
      <p className="text-[10px] text-muted-foreground/50 mb-1.5 uppercase tracking-wide font-medium">Style</p>
      <div className="flex gap-1">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex-1 text-[10px] py-1 rounded font-medium transition-colors",
              theme === t.id ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
