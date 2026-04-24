# Privacy policy for Notify

**Last Updated:** April 24, 2026

## Introduction

This Privacy Policy describes how Notify ("we", "us", or "our") collects, uses, and shares information when you use our mobile application (the "App") and the associated delivery service at `push.tap-and-swipe.com`. Notify is built privacy-first: no account, no tracking, no ads, and no storage of the contents of your notifications on our servers.

## The short version

- **No account.** We never ask for your name, email, phone number, or any identifier you'd recognize as "you".
- **Webhook URL generated on device.** The random webhook ID that identifies your device is generated on your iPhone. It's tied to this device.
- **Notification content is never stored on our servers.** Your title, body, and other fields are forwarded to Apple Push Notification service (APNs) for delivery and then discarded.
- **No ads, no analytics SDKs, no cross-site tracking.** There are no third-party trackers in the app.

## Information stored on your device

The following data is stored only on your device and is never transmitted to our servers:

- Your webhook URL and webhook ID
- The history of notifications you've sent and received (shown in the app)
- Your preferences and settings

**When you delete the app, this data is gone.** We have no copy of it.

## Information we receive on the server

To deliver a push notification to your iPhone, a minimal amount of routing information has to exist server-side:

- **APNs device token.** When you install the app and grant notification permission, iOS gives us an opaque device token. We store a mapping from your webhook ID to this token so we know which device a given webhook should deliver to.
- **Webhook ID.** A random identifier generated on your device. By itself it is not linked to any personal data.
- **Request metadata for delivery only.** When you (or your script) send a request to your webhook URL, our service receives the HTTP request, forwards it to APNs, and returns a response. We do not persist the body of the request (title, body, etc.) after the push has been handed off to Apple.

We may keep short-lived, aggregate delivery logs (for example: number of pushes per hour, HTTP status codes, error rates) in order to monitor service health and detect abuse. These logs do not contain notification content.

## Information we do NOT collect

- We do not collect your name, email address, phone number, or any personal identifier.
- We do not require or offer accounts.
- We do not store the title, body, subtitle, image URL, or any other field of notifications after delivery.
- We do not track your location.
- We do not use advertising SDKs, analytics SDKs, tracking pixels, or session recorders.
- We do not sell or share data with third parties for marketing.

## Third-party services

### Apple Push Notification service (APNs)

- **Purpose**: Delivering push notifications to your device.
- **Data shared**: The payload of each push you send (title, body, etc.) is forwarded to Apple for delivery. Apple processes this data according to Apple's own privacy policy.

### Apple App Store

- **Purpose**: App distribution and, if applicable, payment processing for any paid features.
- **Data shared**: Handled directly by Apple.

We do not use any other third-party service that has access to your notification content.

## Data retention

- **Device-local data**: Lives on your device. Deleting the app deletes it.
- **Webhook-to-token mapping**: Retained for as long as your device is active with the service. If your APNs device token becomes invalid (for example, you uninstall the app or disable notifications), we delete the associated mapping on our next cleanup pass.
- **Notification payloads**: Not retained beyond the short lifetime of a delivery request.
- **Health logs**: Aggregate and non-content logs are retained for a limited window (typically 30 days) for operational purposes.

## Security

- All traffic to `push.tap-and-swipe.com` is served over HTTPS.
- Your webhook URL contains a random secret and should be treated like an API key — don't commit it to public source control and prefer environment variables. If it leaks, you can rotate it inside the app.
- Device-local data benefits from your device's built-in security features (passcode, Face ID, encryption).

## Your privacy rights

Because we do not collect personally identifying information and do not store notification content, most traditional data-subject rights (access, deletion, portability) are automatically satisfied by:

- Uninstalling the app, which breaks the device token and ends the server-side mapping.
- Rotating your webhook inside the app.

If you have a specific request, please contact us at the email below.

## Children's privacy

The App is not directed to children under 13 (or the applicable age of digital consent in your jurisdiction). We do not knowingly collect personal information from children.

## European Users (GDPR)

As this app is primarily operated from France, we comply with the General Data Protection Regulation (GDPR). The legal basis for the minimal processing described above (mapping your webhook ID to a device token for delivery) is legitimate interest in providing the service you requested when you installed the app and generated a webhook.

### Data protection authority

For users in France, the supervisory authority is:

**CNIL** (Commission Nationale de l'Informatique et des Libertés)
- Website: https://www.cnil.fr
- Address: 3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07, France

## Changes to this privacy policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy in the app and updating the "Last Updated" date above.

## Contact us

If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at:

- **Email**: support@tap-and-swipe.com
- **Developer**: Arthur Spalanzani
- **App**: Notify
- **Location**: France

---

By using Notify, you acknowledge that you have read and understood this Privacy Policy.
