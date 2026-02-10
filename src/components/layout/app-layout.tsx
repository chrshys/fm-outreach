"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type AppLayoutProps = {
  children: ReactNode
  title?: string
}

type NavItem = {
  label: string
  href: string
}

export const APP_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Leads", href: "/leads" },
  { label: "Map", href: "/map" },
  { label: "Clusters", href: "/clusters" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Settings", href: "/settings" },
]

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/leads": "Leads",
  "/map": "Map",
  "/clusters": "Clusters",
  "/campaigns": "Campaigns",
  "/settings": "Settings",
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function getPageTitle(pathname: string) {
  for (const item of APP_NAV_ITEMS) {
    if (isActiveRoute(pathname, item.href)) {
      return PAGE_TITLES[item.href]
    }
  }

  return "Dashboard"
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const pathname = usePathname() ?? "/"
  const pageTitle = title ?? getPageTitle(pathname)

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-6 bg-slate-900 px-4 py-6 text-slate-200 md:px-5 md:py-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-slate-800 text-sm font-bold text-slate-100">
            FM
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">FM Outreach</p>
            <p className="text-xs text-slate-400">Seller CRM</p>
          </div>
        </div>

        <nav aria-label="Main navigation" className="grid gap-1.5">
          {APP_NAV_ITEMS.map((item) => {
            const isActive = isActiveRoute(pathname, item.href)

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                data-active={isActive ? "true" : "false"}
                className={cn(
                  "justify-start border border-transparent px-3 text-left text-slate-200 hover:bg-slate-800 hover:text-slate-100",
                  isActive && "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-800",
                )}
              >
                <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                  {item.label}
                </Link>
              </Button>
            )
          })}
        </nav>

        <div className="mt-auto">
          <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
            Internal tool
          </span>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col bg-muted/30">
        <header className="border-b bg-background px-6 py-5">
          <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}

export { getPageTitle, isActiveRoute }
