import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/globals.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { supabase } from './lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // data is "fresh" for 1 min — no refetch storms on navigation
      gcTime: 5 * 60_000,       // keep unused cache for 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Wipe all cached per-user data the moment a session ends. The profile/business
// queries key on a shared cache (['my-profile'] / ['my-business']) without a
// user id, so without this the next account to sign in would briefly see the
// previous user's name (e.g. "שלום חיים") until the stale cache refetched.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') queryClient.clear()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
