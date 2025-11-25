import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { WalletProvider } from './contexts/WalletContext'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WalletProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#fff',
                color: '#363636',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                padding: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#fff' },
                style: { border: '1px solid #10b981' }
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
                style: { border: '1px solid #ef4444' },
                duration: 7000,
              },
              loading: {
                iconTheme: { primary: '#3b82f6', secondary: '#fff' },
              },
            }}
          />
        </WalletProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
