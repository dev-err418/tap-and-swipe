# Terms of use for Notify

**Last Updated:** April 24, 2026

## 1. Acceptance of terms

These Terms of Use ("Terms") constitute a legally binding agreement between you and Arthur Spalanzani ("we", "us", "our", or "Developer") regarding your use of the Notify mobile application and the associated webhook delivery service at `push.tap-and-swipe.com` (together, the "App"). By downloading, installing, accessing, or using the App, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the App.

## 2. Description of service

Notify is a developer tool that provides:

- A per-device webhook URL, generated on your iPhone.
- An HTTP endpoint that accepts POST and GET requests and delivers the corresponding push notification to the device associated with that webhook.
- An in-app log of notifications you have sent and received.

## 3. Eligibility

You must be at least 13 years of age (or the applicable age of digital consent in your jurisdiction) to use this App. By using the App, you represent and warrant that you meet this age requirement.

## 4. License grant and restrictions

### 4.1 License

Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to download, install, and use the App on devices you own or control, solely for your personal or internal business use.

### 4.2 Restrictions

You agree NOT to:

- Modify, reverse engineer, decompile, disassemble, or create derivative works of the App.
- Use the App (or the webhook endpoint) to send unsolicited notifications to third parties. The webhook endpoint is for delivering notifications to the device that generated the webhook — not for operating a mass-notification service, spam, phishing, or harassment.
- Share your webhook URL publicly or redistribute it as a service to third parties.
- Use the App for any illegal, harmful, or unauthorized purpose.
- Attempt to gain unauthorized access to any part of the App or its backend.
- Use automated scripts at a rate that constitutes abuse of the service (see rate limits below).
- Interfere with or disrupt the service's functionality for other users.
- Upload or transmit viruses, malware, or other malicious code in notification payloads.
- Violate any applicable laws, regulations, or third-party rights.

## 5. Webhook URLs as secrets

Your webhook URL contains a random secret that grants the ability to send a push notification to your device. **Treat it like an API key.** Do not commit it to public source control. Store it in environment variables or a secrets manager. If it leaks, rotate it inside the app; you are responsible for any notifications delivered via your webhook until you rotate it.

## 6. Acceptable use and rate limits

The service is intended for personal and internal-development use cases — scripts, cron jobs, CI/CD pipelines, home automations, and similar. We may apply reasonable per-webhook rate limits (for example, in requests-per-minute and requests-per-day) to preserve service health. If your use case requires significantly higher throughput, please contact us.

We reserve the right to suspend any webhook that appears to be abused, compromised, or used in violation of these Terms.

## 7. No guaranteed delivery

The App relies on Apple Push Notification service (APNs) for final delivery to your device. APNs is "best effort": Apple does not guarantee that every push will be delivered, and we do not either. You should not use Notify as the sole channel for safety-of-life alerts, medical alerts, or any other critical notification where missed delivery is unacceptable.

## 8. Intellectual property rights

The App, including all content, features, functionality, software, design, text, graphics, logos, and underlying technology, is owned by the Developer and is protected by copyright, trademark, and other intellectual property laws. "Notify" and associated logos are trademarks of the Developer.

## 9. User data

### 9.1 Local storage

Your webhook history, logs, and preferences are stored locally on your device. See the [Privacy Policy](/notify/privacy) for details.

### 9.2 Minimal server state

To deliver notifications, the service maintains a mapping between your webhook ID and your APNs device token. We do not store notification content after delivery. See the [Privacy Policy](/notify/privacy) for details.

## 10. Disclaimer of warranties

TO THE MAXIMUM EXTENT PERMITTED BY LAW (SUBJECT TO MANDATORY CONSUMER PROTECTION LAWS FOR EU CONSUMERS), THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:

- Implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
- Warranties regarding accuracy, reliability, timeliness, or completeness of delivery.
- Warranties that the App will be uninterrupted, secure, or error-free.

**EU Consumer Notice**: If you are an EU consumer, this disclaimer does not affect your statutory rights.

## 11. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW (SUBJECT TO MANDATORY PROVISIONS FOR EU CONSUMERS):

### 11.1 EU consumer notice

**For EU Consumers**: Nothing in these Terms excludes or limits our liability for:

- Death or personal injury caused by our negligence.
- Fraud or fraudulent misrepresentation.
- Any liability that cannot be excluded or limited under applicable consumer protection laws.

### 11.2 Exclusion of damages

Subject to Section 11.1, we shall not be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to loss of profits, revenue, data, or missed notifications.

### 11.3 Maximum liability

Subject to Section 11.1, our total liability to you for all claims arising out of or relating to these Terms or your use of the App shall not exceed the greater of:

(a) The amount you paid to us in the twelve (12) months preceding the claim, or
(b) One hundred euros (€100.00).

## 12. Third-party services

The App integrates with Apple Push Notification service (APNs) to deliver notifications. We are not responsible for the availability, accuracy, or behavior of third-party services. Your use of third-party services is governed by their respective terms and privacy policies.

## 13. Modifications to the app and terms

### 13.1 Changes to the app

We reserve the right to modify, suspend, or discontinue the App (or any part thereof, including the webhook delivery service) at any time, with or without notice.

### 13.2 Changes to terms

We may revise these Terms from time to time. Material changes will be notified through the App. Your continued use of the App after changes become effective constitutes acceptance of the revised Terms.

## 14. Termination

### 14.1 Termination by you

You may stop using the App and delete it from your devices at any time.

### 14.2 Termination by us

We may terminate or suspend your access to the App immediately, without prior notice or liability, for any reason, including if you breach these Terms or abuse the service.

### 14.3 Effect of termination

Upon termination, all licenses granted to you will immediately terminate and you must cease all use of the App.

## 15. Geographic availability

The App is controlled and operated from France. We make no representation that the App is appropriate or available for use in all locations.

## 16. Apple specific terms

If you access the App via Apple's App Store, you acknowledge that:

- These Terms are between you and the Developer, not Apple.
- Apple has no obligation to provide maintenance or support services.
- Apple is not responsible for addressing any claims relating to the App.
- Apple is a third-party beneficiary of these Terms and may enforce them.

## 17. Contact information

For questions, concerns, or notices regarding these Terms, please contact us at:

**Email**: support@tap-and-swipe.com

**Developer**: Arthur Spalanzani
**App**: Notify
**Location**: France

## 18. Acknowledgment

BY USING THE APP, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF USE, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT ACCESS OR USE THE APP.

---

**Last Updated:** April 24, 2026
