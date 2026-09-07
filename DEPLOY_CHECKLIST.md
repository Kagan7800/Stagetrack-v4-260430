# Stagetrack Passwordless Guest Auth — Production Deployment Checklist

Manual production configuration steps that cannot be validated in local emulator testing.

---

## 1. Firestore TTL Policy Indexes (Console Action)
Enable TTL policies on temporary token and rate limit collections to prevent unbounded document accumulation.

Run via Google Cloud CLI:
```bash
# 1. Rate Limits TTL (1 hour auto-purge)
gcloud firestore fields ttls update expiresAt --collection-group=rateLimits --enable-ttl

# 2. Join Tokens TTL (15 minute auto-purge)
gcloud firestore fields ttls update expiresAt --collection-group=joinTokens --enable-ttl

# 3. Delivery Queue TTL (15 minute auto-purge)
gcloud firestore fields ttls update expiresAt --collection-group=deliveryQueue --enable-ttl
```
*Or enable via Firebase Console: Firestore Database -> TTL Policies -> Add Field: `expiresAt`.*

---

## 2. Twilio A2P 10DLC Registration (Carrier Carrier Compliance)
For production US SMS delivery of magic links:
- Complete **A2P 10DLC Brand Registration** in Twilio Console.
- Register **Music Fun Campaign** (Standard / Low Volume).
- Assign verified campaign to `TWILIO_FROM_PHONE` sender number.
- *Note: Until campaign approval is completed, US carrier firewalls will reject SMS with Error 30034.*

---

## 3. SendGrid Verified Single Sender / Domain Authentication
- Verify `hello@musicfunwithyourlittleone.com` in SendGrid Settings -> Sender Authentication.
- Add DNS CNAME records to domain registrar for DKIM/SPF alignment.
- Set `SENDGRID_API_KEY` in Firebase Function Config:
  ```bash
  firebase functions:config:set sendgrid.key="SG.your_production_key"
  ```

---

## 4. App Base URL Configuration
- Ensure canonical URL is set in Cloud Functions environment:
  ```bash
  firebase functions:config:set app.base_url="https://musicfunwithyourlittleone.com"
  ```
