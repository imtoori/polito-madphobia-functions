import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

export const onOrderCreated = functions.database.ref('/orders/{orderId}').onCreate(async snapshot => {
  const val = snapshot.val();
  const restaurantId = val.restaurantId;

  await admin.database().ref(`/users/restaurants/${restaurantId}/badge`).set(true);
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

export const onBikerAssignedCreated = functions.database.ref('/orders/{orderId}').onUpdate(async change => {
  const before = change.before.val();
  const beforeStatus = before.status;
  const after = change.after.val();
  const afterStatus = after.status;
  if (beforeStatus === 'pending' && afterStatus === 'preparing') {
    await admin.database().ref(`/users/restaurants/${after.bikerId}/badge`).set(true);
    const topic = `${after.bikerId}.order.new`;
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
