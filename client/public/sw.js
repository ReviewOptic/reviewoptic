// ReviewOptic Service Worker — handles push notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "ReviewOptic", body: event.data.text() }; }

  const title = data.title || "ReviewOptic";
  const options = {
    body: data.body || "",
    icon: "/reviewoptic icon only - square - app.png",
    badge: "/reviewoptic icon only - square - app.png",
    data: { link: data.link || "/" },
    tag: data.tag || "reviewoptic-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return clients.openWindow(link);
    })
  );
});
