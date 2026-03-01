try {
  importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");
} catch (err) {
  // Allow SW registration to succeed even if Firebase CDN is unreachable.
  console.warn("Firebase SDK failed to load in SW", err);
}

let messaging = null;
let firebaseReady = false;

function initFirebase(config) {
  if (!config || firebaseReady) return;
  if (typeof firebase === "undefined" || !firebase?.messaging) return;
  firebase.initializeApp(config);
  messaging = firebase.messaging();
  firebaseReady = true;

  messaging.onBackgroundMessage((payload) => {
    const notification = payload?.notification || {};
    const data = payload?.data || {};
    const title = notification.title || "Ketravelan";
    const options = {
      body: notification.body || "",
      data,
    };

    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const hasChatOpen = clients.some((client) => {
        const url = new URL(client.url);
        const isChat = url.pathname.includes("/chat") || url.search.includes("tab=chat");
        return isChat;
      });
      if (hasChatOpen && (data.conversation_id || data.trip_id)) {
        return;
      }
      self.registration.showNotification(title, options);
    });
  });
}

self.addEventListener("message", (event) => {
  if (event?.data?.type === "firebase-config") {
    initFirebase(event.data.config);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const actionUrl = data.action_url || data.actionUrl || "";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
        if (actionUrl) {
          clients[0].navigate(actionUrl);
        }
        return;
      }
      if (actionUrl) {
        return self.clients.openWindow(actionUrl);
      }
      return self.clients.openWindow("/");
    })
  );
});
