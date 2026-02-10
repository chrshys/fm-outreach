import { AppLayout } from "@/components/layout/app-layout"

export default function HomePage() {
  return (
    <AppLayout>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Coming in Phase 10</p>
      </section>
    </AppLayout>
  )
}
