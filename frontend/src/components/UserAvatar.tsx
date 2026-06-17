function getInitials(name: string | null | undefined, email: string): string {
  if (name)
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  color = 'green',
  size = 'md',
}: {
  name: string | null | undefined
  email: string
  avatarUrl?: string | null
  color?: 'green' | 'blue'
  size?: 'md' | 'lg'
}) {
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm'
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name ?? email} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />
    )
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${sizeClass} ${
        color === 'blue' ? 'bg-sand-blue text-ink/80' : 'bg-sand-green text-white'
      }`}
    >
      {getInitials(name, email)}
    </div>
  )
}
