import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmDialogProvider } from './context/ConfirmDialogContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'

const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const NewProject = lazy(() => import('./pages/NewProject'))
const Library = lazy(() => import('./pages/Library'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const FriendsPage = lazy(() => import('./pages/FriendsPage'))

function PageLoader() {
  return <div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-sand-green border-t-transparent rounded-full animate-spin" /></div>
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/auth" replace />
  return <Layout />
}

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <ToastProvider>
      <ConfirmDialogProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<ProtectedRoutes />}>
                <Route path="/home" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/new" element={<NewProject />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/library" element={<Library />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </ConfirmDialogProvider>
      </ToastProvider>
    </ThemeProvider>
    </ErrorBoundary>
  )
}
