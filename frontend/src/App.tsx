import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import NewProject from './pages/NewProject'
import Library from './pages/Library'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/auth" replace />
  return <Layout />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/home" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<NewProject />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/library" element={<Library />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
