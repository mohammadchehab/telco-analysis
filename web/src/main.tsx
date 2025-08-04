import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Service Worker cleanup to prevent workbox errors
if ('serviceWorker' in navigator) {
  // Immediately unregister any existing service workers
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    console.log(`Found ${registrations.length} service worker registrations, unregistering...`);
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Service worker unregistered successfully');
        } else {
          console.log('Failed to unregister service worker');
        }
      });
    }
  });
  
  // Also unregister any service worker that might be controlling the page
  if (navigator.serviceWorker.controller) {
    console.log('Sending SKIP_WAITING message to controlling service worker');
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
  
  // Prevent new service workers from being registered
  navigator.serviceWorker.register = function(_scriptURL: string | URL, _options?: RegistrationOptions) {
    console.log('Service worker registration blocked');
    return Promise.resolve({} as ServiceWorkerRegistration);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
