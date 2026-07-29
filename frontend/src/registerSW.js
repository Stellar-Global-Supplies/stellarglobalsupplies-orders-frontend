// Register service worker for PWA "Add to Home Screen" support
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {
          // Service worker registration failed silently — non-critical
        });
    });
  }
}