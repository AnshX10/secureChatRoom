import { Suspense, StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

const App = lazy(() => import("./App.jsx"));
const LandingPage = lazy(() => import("./components/LandingPage.jsx"));
const TermsOfUse = lazy(() => import("./components/TermsOfUse.jsx"));
const PrivacyPolicy = lazy(() => import("./components/PrivacyPolicy.jsx"));

const rawPathname = window.location.pathname;
const pathname =
  rawPathname.length > 1 && rawPathname.endsWith("/")
    ? rawPathname.replace(/\/+$/, "")
    : rawPathname;

if (pathname !== rawPathname) {
  window.history.replaceState(
    null,
    "",
    `${pathname}${window.location.search}${window.location.hash}`,
  );
}

const isChatroomPath = pathname === "/chatroom";
const isTermsPath = pathname === "/terms";
const isPrivacyPath = pathname === "/privacy";

const goToChatroom = () => {
  const currentPath = window.location.pathname;
  if (currentPath !== "/chatroom") {
    window.location.href = "/chatroom";
  }
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={null}>
      {isChatroomPath ? (
        <App />
      ) : isTermsPath ? (
        <TermsOfUse />
      ) : isPrivacyPath ? (
        <PrivacyPolicy />
      ) : (
        <LandingPage onEnter={goToChatroom} />
      )}
    </Suspense>
  </StrictMode>,
);
