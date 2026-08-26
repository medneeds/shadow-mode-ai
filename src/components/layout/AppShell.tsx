import { Link } from "@tanstack/react-router";
import { Home, Mic, History, BarChart3, User } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/treinar", label: "Treinar", icon: Mic },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/desempenho", label: "Desempenho", icon: BarChart3 },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Shadow Mode, ir para início">
            <span aria-hidden className="relative flex size-2.5">
              <span className="absolute inset-0 rounded-full bg-moss" />
              <span className="absolute -inset-1.5 rounded-full border border-moss/40" />
            </span>
            <span className="font-display text-lg tracking-tight">Shadow Mode</span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    activeOptions={{ exact: item.to === "/" }}
                    activeProps={{ className: "text-foreground bg-surface-raised" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Link
            to="/modo-sombra"
            className="hidden rounded-md border border-gold/35 px-3 py-2 text-sm text-gold transition-colors hover:bg-gold-soft md:inline-flex"
          >
            Entrar no Modo Sombra
          </Link>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      <footer className="hidden border-t border-hairline py-8 md:block">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-8 text-xs text-muted-foreground">
          <p>Shadow Mode — treinamento clínico por voz.</p>
          <p>Ambiente de simulação. Não substitui julgamento clínico real.</p>
        </div>
      </footer>

      {/* Mobile: navegação inferior */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-deep/95 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-foreground" }}
                className="flex flex-col items-center gap-1 px-1 py-3 text-[11px] text-muted-foreground transition-colors"
              >
                <item.icon aria-hidden className="size-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
