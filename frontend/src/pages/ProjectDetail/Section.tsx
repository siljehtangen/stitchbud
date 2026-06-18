export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-serif text-xl leading-none text-ink border-b border-[rgb(var(--border-light))] pb-2">
        {title}
      </h3>
      {children}
    </section>
  )
}
