self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'NEW_ORDER') {
    self.registration.showNotification('🛒 New Order!', {
      body: `You have ${event.data.count} new order(s) at ${event.data.placeName}`,
      icon: '/favicon.ico',
    });
  }

  if (event.data.type === 'NEW_REVIEW') {
    self.registration.showNotification('⭐ New Review!', {
      body: `You have ${event.data.count} new review(s) at ${event.data.placeName}`,
      icon: '/favicon.ico',
    });
  }
});