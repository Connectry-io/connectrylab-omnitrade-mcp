# Security Policy

## OmniTrade Security Model

OmniTrade is designed with security as a core principle:

- **100% Local Execution** — All code runs on your machine
- **No Cloud Storage** — Your API keys never leave your computer
- **No Telemetry** — Zero data collection or tracking
- **Open Source** — Fully auditable codebase

## API Key Safety

When using OmniTrade:

1. **Use API keys with minimal permissions**
   - Enable only what you need (read-only for portfolio viewing)
   - Never enable withdrawal permissions
   
2. **Keys are stored locally**
   - Configuration file: `~/.omnitrade/config.json`
   - The file is only readable by your user account

3. **Never share your config file**
   - It contains your encrypted credentials

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.8.x   | ✅ Current         |
| 0.7.x   | ⚠️ Security fixes  |
| < 0.7   | ❌ No support      |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please email us at: **security@connectry.io**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

### What to Expect

- **Response Time**: Within 48 hours
- **Updates**: We'll keep you informed of progress
- **Credit**: We'll credit you in the release notes (unless you prefer anonymity)

### Safe Harbor

We consider security research conducted in accordance with this policy to be:
- Authorized
- Exempt from legal action
- Helpful and appreciated

Thank you for helping keep OmniTrade and its users safe! 🔒
