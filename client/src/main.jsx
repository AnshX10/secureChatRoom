import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ReactGA from "react-ga4";

// Initialize with your Measurement ID
const TRACKING_ID = import.meta.env.VITE_GA_ID;

// Track the initial page view
ReactGA.send({ hitType: "pageview", page: window.location.pathname });


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
