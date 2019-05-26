import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

const sendNotification = async (topic: string, title: string) => {
  console.log(`sending to topic ${topic}`);
  return admin.messaging().sendToTopic(topic, {
    notification: {
      title: title
    }
  }, {
    priority: 'high'
  });
};

export const onOrderCreated = functions.database.ref('/orders/{orderId}').onCreate(async snapshot => {
  const val = snapshot.val();
  const restaurantId = val.restaurantId;

  await admin.database().ref(`/users/restaurants/${restaurantId}/badge`).set(true);
  console.log(`restaurant: ${restaurantId}`);
  if (restaurantId) {
    return sendNotification(`${restaurantId}.order.new`, 'New order arrived!');
  }
  return Promise.resolve();
});

export const onOrderUpdated = functions.database.ref('/orders/{orderId}').onUpdate(async change => {
  const before = change.before.val();
  const beforeStatus = before.status;
  const after = change.after.val();
  const afterStatus = after.status;
  const clientId = after.client.id;

  switch (afterStatus) {
    case 'preparing':
      await sendNotification(`${clientId}.order.status`, 'The restaurant is preparing your order!');
      break;
    case 'ready':
      await sendNotification(`${clientId}.order.status`, 'Your order is ready to pick up!');
      break;
    case 'completed':
      await sendNotification(`${clientId}.order.status`, 'Your order has left the restaurant!');
      break;
    case 'delivered':
      await sendNotification(`${clientId}.order.status`, 'Enjoy your meal! And rate your experience!');
      break;
  }

  if (beforeStatus === 'pending' && afterStatus === 'preparing') {
    await admin.database().ref(`/users/restaurants/${after.bikerId}/badge`).set(true);
    return sendNotification(`${after.bikerId}.order.new`, 'New order arrived!');
  }
  return Promise.resolve();
});
