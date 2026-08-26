import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { brand } from "@/lib/brand";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <SidebarInset className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-12 items-center border-b border-hairline bg-background/85 px-3 backdrop-blur-md">
            <SidebarTrigger aria-label="Alternar menu" />
          </header>

          <main className="flex-1">{children}</main>

          <footer className="hidden border-t border-hairline py-8 md:block">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-8 text-xs text-muted-foreground lg:px-12 xl:max-w-7xl 2xl:max-w-[88rem]">
              <p>
                {brand.product} · {brand.supportLine}
              </p>
              <p>Ambiente de simulação. Não substitui julgamento clínico real.</p>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
