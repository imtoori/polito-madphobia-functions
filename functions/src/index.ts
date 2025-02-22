import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

const sendNotification = async (topic: string, title: string, message: string, action: string, data: string) => {
  console.log(`sending to topic ${topic}`);
  return admin.messaging().sendToTopic(topic, {
    data: {
      extra: data,
      title: title,
      message: message,
      clickAction: action,
    }
  }, {
    priority: 'high',
  });
};

export const onOrderCreated = functions.database.ref('/orders/{orderId}').onCreate(async (snapshot, context) => {
  const val = snapshot.val();
  const restaurantId = val.restaurantId;

  const user = val.client;

  await admin.database().ref(`/users/restaurants/${restaurantId}/badge`).set(true);
  console.log(`restaurant: ${restaurantId}`);
  if (restaurantId) {
    const date = new Date(val.orderFor);
    date.setHours(date.getHours() + 2);
    return sendNotification(`${restaurantId}.order.new`, 'New order!', `You have received a new order from ${user.name} for ${date.toTimeString()}`, 'open_order', context.params.orderId);
  }
  return Promise.resolve();
});

export const onOrderUpdated = functions.database.ref('/orders/{orderId}').onUpdate(async (change, context) => {
      const before = change.before.val();
      const after = change.after.val();
      const beforeStatus = before.status;
      const afterStatus = after.status;
      const clientId = after.client.id;

      if (beforeStatus !== afterStatus) {
        switch (afterStatus) {
          case 'preparing':
            await sendNotification(`${clientId}.order.status`, 'Update about your order!', 'The restaurant is preparing your order!', 'open_order', context.params.orderId);
            break;
          case 'ready':
            await Promise.all([
              sendNotification(`${clientId}.order.status`, 'Update about your order!', 'Your order is ready to pick up!', 'open_order', context.params.orderId),
              sendNotification(`${after.bikerId}.order.new`, 'Update about your order!', 'Your order is ready to pick up!', 'open_order', context.params.orderId)
            ]);
            break;
          case 'completed':
            await sendNotification(`${clientId}.order.status`, 'Update about your order!', 'Your order has left the restaurant!', 'open_order', context.params.orderId);
            break;
          case 'delivered':
            await sendNotification(`${clientId}.order.status`, 'Order delivered!', 'Enjoy your meal! And rate your experience!', 'open_order', context.params.orderId);
            break;
        }
      }

      if (!before.bikerId && after.bikerId) {
        const restaurant = after.restaurant;
        return sendNotification(`${after.bikerId}.order.new`, 'New order!', `The restaurant ${restaurant.previewInfo.name} assigned a new order to you!`, 'open_order', context.params.orderId);
      }
      return Promise.resolve();
    }
);
