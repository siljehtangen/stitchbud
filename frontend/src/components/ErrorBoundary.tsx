import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '../i18n'
import { reportError } from '../sentry'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

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
          <p className="text-gray-800 font-medium mb-1">{i18n.t('error_boundary_title')}</p>
          <p className="text-sm text-warm-gray mb-4">{i18n.t('error_boundary_message')}</p>
          <button onClick={() => this.setState({ hasError: false })} className="btn-primary">
            {i18n.t('retry')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
