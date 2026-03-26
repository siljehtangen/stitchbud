import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', icon: '🏠', exact: true },
  { to: '/projects', label: 'Projects', icon: '🧶', exact: false },
]

export default function Layout() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur-sm border-b border-sand-blue/40 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
          <span className="text-sand-green-dark">✦</span> Stitchbook
        </h1>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 px-4 pt-4">
        <Outlet />
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/projects/new')}
        className="fixed bottom-20 right-6 w-14 h-14 bg-sand-green hover:bg-sand-green-dark shadow-lg rounded-full flex items-center justify-center text-2xl transition-all duration-200 hover:scale-105 z-10"
        aria-label="Add project"
      >
        +
      </button>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white/95 backdrop-blur-sm border-t border-sand-blue/30 flex justify-around py-2 z-10">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-gray-800 bg-sand-blue/35' : 'text-warm-gray hover:text-gray-700'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
