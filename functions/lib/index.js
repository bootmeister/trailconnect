"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onFriendRequestAccepted = exports.onNewFriendRequest = exports.onNewMessage = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const expo_server_sdk_1 = require("expo-server-sdk");
admin.initializeApp();
const expo = new expo_server_sdk_1.Expo();
exports.onNewMessage = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
    var _a;
    const message = snapshot.data();
    const { chatId } = context.params;
    const senderId = message.senderId;
    const text = message.text;
    try {
        const chatDoc = await admin.firestore().doc(`chats/${chatId}`).get();
        const chatData = chatDoc.data();
        if (!chatData)
            return;
        const participants = chatData.participants;
        const receiverId = participants.find(id => id !== senderId);
        if (!receiverId)
            return;
        const receiverDoc = await admin.firestore().doc(`users/${receiverId}`).get();
        const receiverData = receiverDoc.data();
        if (!(receiverData === null || receiverData === void 0 ? void 0 : receiverData.pushToken)) {
            console.log(`No push token for user ${receiverId}`);
            return;
        }
        const senderDoc = await admin.firestore().doc(`users/${senderId}`).get();
        const senderName = ((_a = senderDoc.data()) === null || _a === void 0 ? void 0 : _a.displayName) || 'Someone';
        const pushToken = receiverData.pushToken;
        if (!expo_server_sdk_1.Expo.isExpoPushToken(pushToken)) {
            console.error(`Invalid push token for user ${receiverId}`);
            return;
        }
        const notificationMessage = {
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
        };
        await expo.sendPushNotificationsAsync([notificationMessage]);
        console.log(`Notification sent to ${receiverId} from ${senderName}`);
    }
    catch (error) {
        console.error('Error sending notification:', error);
    }
});
exports.onNewFriendRequest = functions.firestore
    .document('friend_requests/{requestId}')
    .onCreate(async (snapshot, context) => {
    var _a;
    const request = snapshot.data();
    const toUserId = request.toUserId;
    try {
        const toUserDoc = await admin.firestore().doc(`users/${toUserId}`).get();
        const toUserData = toUserDoc.data();
        if (!(toUserData === null || toUserData === void 0 ? void 0 : toUserData.pushToken))
            return;
        const pushToken = toUserData.pushToken;
        if (!expo_server_sdk_1.Expo.isExpoPushToken(pushToken))
            return;
        const fromUserDoc = await admin.firestore().doc(`users/${request.fromUserId}`).get();
        const fromUserName = ((_a = fromUserDoc.data()) === null || _a === void 0 ? void 0 : _a.displayName) || 'Someone';
        await expo.sendPushNotificationsAsync([{
                to: pushToken,
                sound: 'default',
                title: 'New Friend Request',
                body: `${fromUserName} wants to connect!`,
                data: {
                    route: '/friends',
                },
                channelId: 'default',
            }]);
    }
    catch (error) {
        console.error('Error sending friend request notification:', error);
    }
});
exports.onFriendRequestAccepted = functions.firestore
    .document('friend_requests/{requestId}')
    .onUpdate(async (change, context) => {
    var _a, _b;
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'pending' || after.status !== 'accepted')
        return;
    try {
        const fromUserDoc = await admin.firestore().doc(`users/${before.fromUserId}`).get();
        const fromUserToken = (_a = fromUserDoc.data()) === null || _a === void 0 ? void 0 : _a.pushToken;
        if (!fromUserToken || !expo_server_sdk_1.Expo.isExpoPushToken(fromUserToken))
            return;
        const toUserDoc = await admin.firestore().doc(`users/${before.toUserId}`).get();
        const toUserName = ((_b = toUserDoc.data()) === null || _b === void 0 ? void 0 : _b.displayName) || 'Someone';
        await expo.sendPushNotificationsAsync([{
                to: fromUserToken,
                sound: 'default',
                title: 'Friend Request Accepted',
                body: `${toUserName} accepted your friend request!`,
                data: {
                    route: '/friends',
                },
                channelId: 'default',
            }]);
    }
    catch (error) {
        console.error('Error sending friend accepted notification:', error);
    }
});
//# sourceMappingURL=index.js.map