# Email Service

The Email Service is responsible for sending emails from the application, including system notifications, user verification emails, password reset links, and other transactional emails.

## Features

- Multiple email provider support (SMTP, SendGrid, Mailgun, AWS SES, or console logging)
- Template-based emails
- Attachments support
- HTML and plain text formats
- Specialized methods for common email types (verification, password reset, etc.)

## Configuration

The email service can be configured through environment variables:

```
# Email service configuration
EMAIL_PROVIDER=console      # Options: console, smtp, sendgrid, mailgun, ses
EMAIL_DEFAULT_FROM=noreply@example.com

# SMTP configuration (when using smtp provider)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_username
SMTP_PASS=your_password

# API key configuration (for SendGrid/Mailgun)
EMAIL_API_KEY=your_api_key
EMAIL_DOMAIN=mg.yourdomain.com  # For Mailgun

# AWS SES configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Usage

### Basic Usage

```typescript
import { container } from "@/server/infrastructure/di/container";
import { TYPES } from "@/server/infrastructure/di/types";
import { EmailService } from "@/server/modules/core/email/services/email.service";

// Get email service from DI container
const emailService = container.get<EmailService>(TYPES.EmailService);

// Send a simple email
await emailService.sendEmail({
  to: "recipient@example.com",
  subject: "Hello from the application",
  text: "This is a test email",
  html: "<p>This is a <strong>test</strong> email</p>",
});
```

### Verification Emails

```typescript
// Send verification email
await emailService.sendVerificationEmail(
  "user@example.com",
  "John Doe",
  "verification_token_here",
  "https://yourapp.com"
);
```

### Template Emails

```typescript
// Send a template-based email
await emailService.sendTemplateEmail(
  "welcome_template",
  {
    name: "John Doe",
    activationLink: "https://yourapp.com/activate?token=xyz",
  },
  {
    to: "user@example.com",
    subject: "Welcome to our platform",
  }
);
```

## Email Providers

### Console (Development)

In development environments, the default provider simply logs emails to the console instead of actually sending them.

### SMTP

Uses standard SMTP protocol to send emails through a mail server.

### SendGrid

Uses SendGrid API for sending emails at scale.

### Mailgun

Uses Mailgun API for sending transactional emails.

### AWS SES

Uses Amazon Simple Email Service for high-volume email sending.

## Adding New Providers

To add a new provider:

1. Add a new provider type to the `EmailProviderType` enum
2. Update the provider selection logic in the `sendEmail` method
3. Implement the provider-specific sending logic
4. Update README with configuration instructions
