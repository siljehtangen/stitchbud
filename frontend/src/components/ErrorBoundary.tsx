import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../sentry'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack)
    reportError(error, { componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
          <p className="text-gray-800 font-medium mb-1">Something went wrong</p>
          <p className="text-sm text-warm-gray mb-4">Please try refreshing the page.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-primary"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
