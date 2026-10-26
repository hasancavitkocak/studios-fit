// Yönetim paneli için minimal service worker: uygulamanın kurulabilir olmasını sağlar.
// Veriler canlı olmalı, bu yüzden önbellekleme yapılmaz; istekler doğrudan ağa gider.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
