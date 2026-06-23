import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import Toast from './components/Toast';
import OfflineToast from './components/OfflineToast';
import WhatsAppBtn from './components/WhatsAppBtn';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import BookingScreen from './screens/BookingScreen';
import BookingsScreen from './screens/BookingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import BookingSuccessScreen from './screens/BookingSuccessScreen';

const HIDE_NAV     = ['/login', '/register', '/booking-success', '/forgot-password'];
const HIDE_WAAPP   = ['/login', '/register', '/booking-success', '/forgot-password'];

function AppShell() {
  const location = useLocation();
  const hideNav    = HIDE_NAV.some(p => location.pathname.startsWith(p));
  const hideWhApp  = HIDE_WAAPP.some(p => location.pathname.startsWith(p));

  return (
    <div className="relative h-full flex flex-col" style={{ background: 'var(--black)' }}>
      {/* Global overlays */}
      <OfflineToast />
      <Toast />

      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/"                element={<HomeScreen />} />
          <Route path="/book"            element={<BookingScreen />} />
          <Route path="/bookings"        element={<BookingsScreen />} />
          <Route path="/profile"         element={<ProfileScreen />} />
          <Route path="/login"           element={<LoginScreen />} />
          <Route path="/booking-success" element={<BookingSuccessScreen />} />
        </Routes>
      </main>

      {!hideNav    && <BottomNav />}
      {!hideWhApp  && <WhatsAppBtn />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
