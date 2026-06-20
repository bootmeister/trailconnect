import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Expo, ExpoPushMessage } from 'expo-server-sdk'

admin.initializeApp()

const expo = new Expo()

export const onNewMessage = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data() as Record<string, any>
    const { chatId } = context.params
    const senderId = message.senderId
    const text = message.text

    try {
      const chatDoc = await admin.firestore().doc(`chats/${chatId}`).get()
      const chatData = chatDoc.data()
      if (!chatData) return

      const participants = chatData.participants as string[]
      const receiverId = participants.find(id => id !== senderId)
      if (!receiverId) return

      const receiverDoc = await admin.firestore().doc(`users/${receiverId}`).get()
      const receiverData = receiverDoc.data()
      if (!receiverData?.pushToken) {
        console.log(`No push token for user ${receiverId}`)
        return
      }

      const senderDoc = await admin.firestore().doc(`users/${senderId}`).get()
      const senderName = senderDoc.data()?.displayName || 'Someone'

      const pushToken = receiverData.pushToken as string
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Invalid push token for user ${receiverId}`)
        return
      }

      const notificationMessage: ExpoPushMessage = {
        to: pushToken,
        sound: 'default',
        title: senderName,
        body: text,
        data: {
          route: `/chat/${chatId}`,
          chatId,
          senderId,
        },
        channelId: 'default',
      }

      await expo.sendPushNotificationsAsync([notificationMessage])
      console.log(`Notification sent to ${receiverId} from ${senderName}`)
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  })

export const onNewFriendRequest = functions.firestore
  .document('friend_requests/{requestId}')
  .onCreate(async (snapshot, context) => {
    const request = snapshot.data() as Record<string, any>
    const toUserId = request.toUserId

    try {
      const toUserDoc = await admin.firestore().doc(`users/${toUserId}`).get()
      const toUserData = toUserDoc.data()
      if (!toUserData?.pushToken) return

      const pushToken = toUserData.pushToken as string
      if (!Expo.isExpoPushToken(pushToken)) return

      const fromUserDoc = await admin.firestore().doc(`users/${request.fromUserId}`).get()
      const fromUserName = fromUserDoc.data()?.displayName || 'Someone'

      await expo.sendPushNotificationsAsync([{
        to: pushToken,
        sound: 'default',
        title: 'New Friend Request',
        body: `${fromUserName} wants to connect!`,
        data: {
          route: '/friends',
        },
        channelId: 'default',
      }])
    } catch (error) {
      console.error('Error sending friend request notification:', error)
    }
  })

export const onFriendRequestAccepted = functions.firestore
  .document('friend_requests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as Record<string, any>
    const after = change.after.data() as Record<string, any>

    if (before.status !== 'pending' || after.status !== 'accepted') return

    try {
      const fromUserDoc = await admin.firestore().doc(`users/${before.fromUserId}`).get()
      const fromUserToken = fromUserDoc.data()?.pushToken
      if (!fromUserToken || !Expo.isExpoPushToken(fromUserToken)) return

      const toUserDoc = await admin.firestore().doc(`users/${before.toUserId}`).get()
      const toUserName = toUserDoc.data()?.displayName || 'Someone'

      await expo.sendPushNotificationsAsync([{
        to: fromUserToken,
        sound: 'default',
        title: 'Friend Request Accepted',
        body: `${toUserName} accepted your friend request!`,
        data: {
          route: '/friends',
        },
        channelId: 'default',
      }])
    } catch (error) {
      console.error('Error sending friend accepted notification:', error)
    }
  })
