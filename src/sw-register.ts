// Keeps the installed iPhone app up to date. iOS only checks for a new service worker on a full
// launch, and a home-screen app is usually resumed, not relaunched — so we also check whenever the
// app comes back to the foreground, and reload once the new version has taken over.

const UPDATED_FLAG = 'sistema.updated';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The very first install also takes control; only a replaced version needs a reload.
    if (!hadController || reloading) return;
    reloading = true;
    try {
      localStorage.setItem(UPDATED_FLAG, '1');
    } catch {
      // Without storage the reload still happens, just without the «обновлено» notice.
    }
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => undefined);
    if (!reg) return;
    const check = () => reg.update().catch(() => undefined);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void check();
    });
    setInterval(check, 30 * 60 * 1000);
  });
}

/** Asks the server for a newer version; when there is one, the page reloads by itself shortly. */
export async function checkForUpdate(): Promise<'updating' | 'latest' | 'offline'> {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return 'latest';
  try {
    await reg.update();
  } catch {
    return 'offline';
  }
  return reg.installing || reg.waiting ? 'updating' : 'latest';
}

/** True once right after the app reloaded into a new version. */
export function takeUpdatedFlag(): boolean {
  try {
    const was = localStorage.getItem(UPDATED_FLAG) === '1';
    localStorage.removeItem(UPDATED_FLAG);
    return was;
  } catch {
    return false;
  }
}
