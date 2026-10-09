// Service Worker Lifecycle Events
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim()); // Take control immediately
});

// Handle Push Notifications
self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {};
  
  // Extract notification details from server payload
  const title = payload.title || 'Quorent';
  const body = payload.body || 'New message';
  const icon = payload.icon || '/logo192.png';
  const badge = payload.badge || '/badge-72x72.svg';
  const tag = payload.tag || 'notification';
  const notificationData = payload.data || {};
  const chatType = notificationData.chat_type;
  
  // Build notification options
  const options = {
    body: body,
    icon: icon, // For private: sender profile pic, For group: chat image
    badge: badge,
    tag: tag,
    data: notificationData,
    requireInteraction: payload.requireInteraction || false,
    vibrate: payload.vibrate || [200, 100, 200],
    silent: payload.silent || false,
    actions: [
      {
        action: 'open',
        title: 'Open Chat'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  console.log('[Service Worker] Showing notification:', {
    title,
    chatType,
    icon,
    body
  });

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const data = event.notification.data;
  const chatId = data.chat_id;
  const action = data.action;
  const chatType = data.chat_type;
  
  // Construct URL based on action
  let url = '/chats'; // Default to chats page (path router)
  
  if (action === 'open_chat' && chatId) {
    url = `/chats?selectedChat=${chatId}`;
  } else if (data.url) {
    url = data.url;
  }

  console.log('[Service Worker] Notification clicked:', {
    chatId,
    chatType,
    action,
    url
  });

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // If app is already open, focus it and navigate
        if ('focus' in client) {
          client.focus();
          // Send message to client to navigate to the chat
          client.postMessage({
            type: 'NAVIGATE_TO_CHAT',
            chatId: chatId,
            chatType: chatType
          });
          return client;
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync (optional - for queuing offline notifications)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/unread-count');
    const data = await response.json();
    // Update badge
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(data.unread_count);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
