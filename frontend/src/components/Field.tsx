export function Field({
  label,
  children,
  className,
  required,
}: {
  label: string
  children: React.ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <div className={className}>
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {children}
      </label>
    </div>
  )
}
