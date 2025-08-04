// Service Worker Cleanup Script
// This script can be run to unregister any existing service workers

if ('serviceWorker' in navigator) {
  console.log('Cleaning up service workers...');
  
  // Unregister all service workers
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    console.log(`Found ${registrations.length} service worker registrations`);
    
    for (const registration of registrations) {
      console.log('Unregistering service worker:', registration.scope);
      registration.unregister().then((success) => {
        if (success) {
          console.log('Service worker unregistered successfully');
        } else {
          console.log('Failed to unregister service worker');
        }
      });
    }
  });
  
  // If there's a controlling service worker, skip waiting
  if (navigator.serviceWorker.controller) {
    console.log('Sending SKIP_WAITING message to controlling service worker');
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
  
  // Listen for service worker updates
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      console.log('Received SKIP_WAITING message, reloading page...');
      window.location.reload();
    }
  });
} else {
  console.log('Service workers not supported in this browser');
} 