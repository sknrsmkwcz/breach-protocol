import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import LoginPage from '@/pages/auth/LoginPage';
import UnauthorizedPage from '@/pages/auth/UnauthorizedPage';
import DashboardPage from '@/pages/DashboardPage';
import CardsPage from '@/pages/cards/CardsPage';
import CardEditPage from '@/pages/cards/CardEditPage';
import FactionsPage from '@/pages/factions/FactionsPage';
import FactionDetailPage from '@/pages/factions/FactionDetailPage';
import SimulationsPage from '@/pages/simulations/SimulationsPage';
import SimulationDetailPage from '@/pages/simulations/SimulationDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/cards" element={<CardsPage />} />
                  <Route path="/cards/new" element={<CardEditPage />} />
                  <Route path="/cards/:id" element={<CardEditPage />} />
                  <Route path="/factions" element={<FactionsPage />} />
                  <Route path="/factions/:id" element={<FactionDetailPage />} />
                  <Route path="/simulations" element={<SimulationsPage />} />
                  <Route path="/simulations/:id" element={<SimulationDetailPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
