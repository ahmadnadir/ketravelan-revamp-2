import { useState, useEffect } from 'react';
import { CreateTripWizard } from './components/CreateTrip/CreateTripWizard';
import { GuidedTripDetail } from './components/TripDetail/GuidedTripDetail';
import { AgentDashboard } from './components/Dashboard/AgentDashboard';
import { CustomerDashboardNew } from './components/Dashboard/CustomerDashboardNew';
import PaymentGateway from './components/Payment/PaymentGateway';
import PaymentResult from './components/Payment/PaymentResult';
import LoginPage from './components/Auth/LoginPage';
import { useAuth } from './contexts/AuthContext';
import { Loader } from 'lucide-react';

type View = 'dashboard' | 'detail' | 'create' | 'payment-gateway' | 'payment-result';

function App() {
  const { user, profile, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/payment-gateway') {
      setCurrentView('payment-gateway');
    } else if (path === '/payment-result') {
      setCurrentView('payment-result');
    }
  }, []);

  const handleViewTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setCurrentView('detail');
  };

  const handleCreateTrip = () => {
    setCurrentView('create');
  };

  const handleBackToList = () => {
    setCurrentView('dashboard');
    setSelectedTripId(null);
  };

  const handleTripCreated = () => {
    setCurrentView('dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  const userRole = profile.role === 'traveler' ? 'customer' : profile.role;

  return (
    <>
      {currentView === 'dashboard' && userRole === 'customer' && (
        <CustomerDashboardNew onViewTrip={handleViewTrip} />
      )}

      {currentView === 'dashboard' && userRole === 'agent' && (
        <AgentDashboard
          onViewTrip={handleViewTrip}
          onCreateTrip={handleCreateTrip}
        />
      )}

      {currentView === 'detail' && selectedTripId && (
        <div>
          <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <button
                onClick={handleBackToList}
                className="text-sm sm:text-base text-gray-900 hover:text-gray-700 font-bold"
              >
                ← Back to {userRole === 'agent' ? 'Dashboard' : 'Home'}
              </button>
            </div>
          </div>
          <GuidedTripDetail
            tripId={selectedTripId}
            userRole={userRole}
            onTripDeleted={handleBackToList}
          />
        </div>
      )}

      {currentView === 'create' && (
        <div>
          <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <button
                onClick={handleBackToList}
                className="text-sm sm:text-base text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
          <CreateTripWizard onComplete={handleTripCreated} />
        </div>
      )}

      {currentView === 'payment-gateway' && <PaymentGateway />}

      {currentView === 'payment-result' && <PaymentResult />}
    </>
  );
}

export default App;
