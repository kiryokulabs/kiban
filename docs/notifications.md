# Notifications

The sidebar **Notifications** page (`/notifications`) groups instance-wide delivery channels.
The first channel is **Email (SMTP)**. General Settings and service/instance domain routing
are independent and are not changed by SMTP configuration.

## Permissions

All authenticated users can read the configuration. The SMTP password is never returned;
only a `hasPassword` flag is exposed. Operators see read-only fields. Only administrators
can save settings or send a test email; these restrictions are enforced by the backend,
not just Angular.

- `GET /api/notifications/smtp`: password-free configuration, or `null` if unconfigured.
- `PUT /api/notifications/smtp`: administrator-only save.
- `POST /api/notifications/smtp/test`: administrator-only test to the administrator's
  authenticated account email. The caller cannot choose a recipient.

Writes retain the existing session/CSRF protection. Passwords are encrypted at rest using
an installation-specific key in `~/.kiban/config/smtp.key`. Leaving the password blank
preserves it for the same username. Password authentication requires TLS or STARTTLS;
SMTP certificates are verified, independently of Kiban's HTTPS certificates.

## Sending from local development or a VPS

Configure your mail provider's SMTP hostname, port, security, username/password and allowed
sender email, save, then select **Send test email**. The backend sends through that SMTP
provider in both installations; the browser can be on localhost or a VPS dashboard URL.
No Instance Domain is required. The backend needs outbound access to the configured SMTP
port (some VPS providers restrict it). Use HTTPS or a trusted tunnel when entering secrets
on a remote installation. SMTP acceptance is not a guarantee of inbox delivery: check the
recipient inbox/spam folder and the provider's sender/domain-verification requirements.

## Channel boundaries

The page composes independent channel components; SMTP has its own API, core manager,
settings repository and infrastructure adapter. Adding Telegram or WhatsApp later should
add a separate channel rather than embed non-email credentials or behavior in SMTP.
No placeholder providers, routing registry or automatic alerts are implemented now.

`SmtpSender.send(settings, message)` accepts application-owned recipient, subject and text,
so the transport is not coupled to the test message. The test use case constructs its own
fixed message and restricts the recipient. Future password recovery and service alerts can
reuse this mail transport, with their own authorization, token policy and message content.
Neither password recovery nor automatic notifications are implemented by this change.
