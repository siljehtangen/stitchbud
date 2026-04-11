export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <h3 className="text-xs font-semibold text-sand-blue-deep uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}
