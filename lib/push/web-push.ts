import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:namasteadmin.pl@gmail.com';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn('VAPID keys are missing. Web Push notifications will fail to send.');
}

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: PushSubscriptionKeys;
};

export async function sendWebPush(
  subscription: PushSubscriptionPayload,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  const payload = JSON.stringify({
    title,
    body,
    data
  });

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    },
    payload
  );
}
