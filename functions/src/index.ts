import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

export const onOrderCreated = functions.database.ref('/orders/{orderId}').onCreate(snapshot => {
  const val = snapshot.val();
  const restaurantId = val.restaurantId;
  console.log(`restaurant: ${restaurantId}`);
  if (restaurantId) {
    const topic = `${restaurantId}.order.new`;
    console.log(`sending to topic ${topic}`);
    return admin.messaging().sendToTopic(topic, {
      notification: {
        title: 'New order arrived!'
      }
    }, {
      priority: 'high'
    });
  }
  return Promise.resolve();
});
