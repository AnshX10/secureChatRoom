import { Suspense, StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const App = lazy(() => import('./App.jsx'));
const LandingPage = lazy(() => import('./components/LandingPage.jsx'));
const TermsOfUse = lazy(() => import('./components/TermsOfUse.jsx'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy.jsx'));

const pathname = window.location.pathname;
const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const queryParams = new URLSearchParams(window.location.search);
const hasMagicInvite = Boolean(hashParams.get('invite') || queryParams.get('invite'));

const isChatroomPath = pathname === '/chatroom' || hasMagicInvite;
const isTermsPath = pathname === '/terms';
const isPrivacyPath = pathname === '/privacy';

const goToChatroom = () => {
  if (window.location.pathname !== '/chatroom') {
    window.location.href = '/chatroom';
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      {isChatroomPath ? <App /> : isTermsPath ? <TermsOfUse /> : isPrivacyPath ? <PrivacyPolicy /> : <LandingPage onEnter={goToChatroom} />}
    </Suspense>
  </StrictMode>,
)
