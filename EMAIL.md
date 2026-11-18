# Mux Cloud Email

Mux Cloud sends a small set of account and security messages: signup verification, welcome, password reset and change notices, a security notice when a new machine connects, machine revocation, account deletion, and an administrator test message. It never sends marketing email, and no message carries conversation content.

## Goals

- Every security-relevant account change reaches the account owner. That includes a new machine being connected, because a connected machine can be operated remotely.
- Messages look the same in light and dark mail clients, read well at 360 px wide, and have a plain-text version that says the same thing.
- Delivery problems never break the request that triggered them. A failed send is logged and the request still succeeds.

## Non-goals

- Marketing, newsletters, digests, or per-user email preferences. These may come later.
- Inbound email handling.
- Per-tenant branding.

## Project shape

`src/MuxCloud.Email` depends on `MuxCloud.Core` and implements its `IAccountNotifier` boundary.

| Folder or file | Contents |
| --- | --- |
| `EmailService.cs` | Renders a template in the brand, builds the message, hands it to the provider, logs the outcome |
| `StandardEmailLayout.cs` | The layout, built with HtmlPageBuilder 1.2.0 and modeled on TrellisKit's `StandardEmailLayout` (BjjWithJoel) |
| `EmailStyle.cs`, `EmailBrand.cs` | Colors, fonts, encoding helpers, brand values |
| `Blocks/` | Paragraph, subheading, button with copy-link fallback, callout (info, success, warning, danger), key/value fields, code, list, divider |
| `Templates/` | One class per message type |
| `Providers/` | `DisabledEmailProvider`, `FileEmailProvider`, `MailgunEmailProvider` |

## Configuration

Settings live under `Email` in `muxcloud.json`.

| Setting | Default | Notes |
| --- | --- | --- |
| `Provider` | `File` | `Disabled`, `File`, or `Mailgun`. Production uses `Mailgun`. Override with `MUXCLOUD_EMAIL_PROVIDER`. |
| `FromName` | `Mux Cloud` | |
| `FromAddress` | `hello@latticetech.ai` | |
| `SupportAddress` | `hello@latticetech.ai` | Shown in every footer and in security notices |
| `LogoUrl` | `https://raw.githubusercontent.com/jchristn/MuxCloud/main/assets/logo-black.png` | Must be an absolute URL so mail clients can load it |
| `File.Directory` | `./email-outbox` | Development and tests |
| `Mailgun.Domain` | `latticetech.ai` | Override with `MUXCLOUD_MAILGUN_DOMAIN` |
| `Mailgun.ApiKey` | empty | Secret. Set it with `MUXCLOUD_MAILGUN_API_KEY`, never in the file. |
| `Mailgun.BaseUrl` | `https://api.mailgun.net/v3/` | Use `https://api.eu.mailgun.net/v3/` for the EU region |

Links in messages are built from `Server.PublicUrl` (`https://app.usemux.ai` in production).

## Providers

**Disabled** sends nothing and reports the message as skipped.

**File** writes each message as two files in `File.Directory`, named `<UTC timestamp>-<sequence>-<template key>-<recipient>`. The `.txt` file starts with `To`, `From`, and `Subject` lines followed by the plain-text body. The `.html` file holds the full HTML document. The test suites read verification and reset links from these files.

**Mailgun** sends through SendWithMailgun 1.2.1 (`MailgunSender.SendAsync`). SendWithMailgun sends one body format per message, so the HTML body is sent; the plain-text rendering is kept for the File provider and tests. A missing API key or a rejected message is logged and the send reports failure.

## Layout

Every message uses the same layout:

1. A hidden preheader (the inbox preview line).
2. A card at most 600 px wide, fluid down to 360 px, on a light grey background.
3. The Mux logo, the heading, then the template's blocks.
4. A rule, then the footer: "Mux Cloud", a "Questions?" line with the support address, and links to the privacy policy and terms.

The HTML carries `color-scheme` meta tags and a `prefers-color-scheme: dark` style, so dark mail clients get dark surfaces and light text. Every value is HTML-encoded, so a machine named `studio <mac>` renders as text, never markup. Buttons render only for absolute http(s) URLs and are followed by the raw link for clients that block buttons.

## Templates

| Key | Sent when | Content |
| --- | --- | --- |
| `verify_email` | Signup, and verification resend | Confirm button. The link works once and expires in 48 hours. |
| `welcome` | First successful verification (or signup when verification is off) | How to connect a machine from each mux surface |
| `password_reset` | Forgot password | Reset button. The link works once and expires in 1 hour. Resetting signs out everywhere. |
| `password_changed` | Password reset or change | Time of change and a warning to act if it was not you |
| `machine_enrolled` | A new machine is enrolled (not re-enrollment of an existing fingerprint) | Machine, host, system, source IP, time, and a review link |
| `machine_revoked` | A machine is revoked | Which machine, and how to reconnect it |
| `account_deleted` | Account deletion | Confirmation that machines were disconnected and that conversations were never stored |
| `admin_test` | `POST /v1.0/api/admin/email/test` | Node and provider |

## Adding a template

1. Add a class in `Templates/` that derives from `EmailTemplate`, with typed properties for its values.
2. Return an `EmailDocument` from `Compose()`: subject, preheader, heading, and blocks.
3. Send it from `EmailService` (add an `IAccountNotifier` method if a Core service triggers it).
4. Add it to the rendering test in `src/Test.Shared/Suites/EmailSuites.cs`.

Write subjects and body text plainly, without em-dashes.

## Tests

`EmailSuites` renders every template and checks for a complete document, dark mode support, the support address, a text version, encoding of values, and the absence of em-dashes. It also checks that the File provider writes both files, that a blank recipient is skipped, and that an unconfigured Mailgun provider fails quietly. The HTTP suites drive signup and reset end to end through the File provider.
