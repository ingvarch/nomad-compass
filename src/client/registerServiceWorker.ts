// src/client/registerServiceWorker.ts
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // A new version of the app is available
                  window.dispatchEvent(new CustomEvent('ovoo-pwa-update-available'));
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('PWA ServiceWorker registration failed:', error);
        });
    });
  }
}
