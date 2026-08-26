import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Mic, History, BarChart3, User, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/treinar", label: "Treinar", icon: Mic },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/desempenho", label: "Desempenho", icon: BarChart3 },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-hairline">
      <SidebarHeader className={cn("flex flex-row items-center gap-3 px-4 py-4", collapsed && "justify-center px-2")}>
        <Link
          to="/"
          aria-label="Modo Sombra, ir para início"
          className="flex items-center gap-3"
          onClick={() => isMobile && setOpenMobile(false)}
        >
          <span aria-hidden className="relative flex size-2.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-foreground/70" />
            <span className="absolute -inset-1.5 rounded-full border border-foreground/20" />
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-tight">
              <span className="font-display text-base tracking-tight">{brand.product}</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {brand.supportLine}
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={item.label}
                    className="text-muted-foreground data-[active=true]:bg-surface-raised data-[active=true]:text-foreground"
                  >
                    <Link to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
                      <item.icon aria-hidden className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("flex items-center gap-2 p-3", collapsed ? "flex-col" : "flex-row justify-between")}>
        {!collapsed && (
          <Link
            to="/treinar"
            onClick={() => isMobile && setOpenMobile(false)}
            className="rounded-md border border-hairline px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-surface-raised"
          >
            Iniciar treinamento
          </Link>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {!isMobile && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
