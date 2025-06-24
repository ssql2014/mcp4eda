# Authentication Guide

Some semiconductor B2B platforms require authentication to access their data. This MCP server supports multiple authentication methods.

## Supported Sites

### DesignReuse
- Requires username and password
- Session cookies are automatically managed
- Credentials stored locally in `~/.semiconductor-mcp/auth.json`

### AnySilicon
- Currently public access (no auth required)
- API key support planned for premium features

## Configuration Methods

### 1. Environment Variables

Set credentials via environment variables:

```bash
export DESIGNREUSE_USERNAME="your_username"
export DESIGNREUSE_PASSWORD="your_password"
```

### 2. Configuration File

Create `~/.semiconductor-mcp/auth.json`:

```json
{
  "designreuse": {
    "username": "your_username",
    "password": "your_password"
  }
}
```

### 3. Interactive Setup

Use the `setup_auth` tool:

```
Tool: setup_auth
Arguments: {"site": "designreuse"}
```

### 4. Pass Credentials in Tool Calls

Some tools accept optional auth parameters:

```json
{
  "tool": "find_ip_vendors",
  "arguments": {
    "category": "PHY",
    "auth": {
      "username": "user",
      "password": "pass"
    }
  }
}
```

## Security Considerations

1. **Local Storage**: Credentials are stored locally in your home directory
2. **Encryption**: Consider using OS keychain integration (planned feature)
3. **Session Management**: Sessions are cached to minimize login requests
4. **No Cloud Storage**: Credentials never leave your machine

## Handling Authentication Failures

If authentication fails:
1. Check credentials are correct
2. Verify account is active on the platform
3. Some sites may require CAPTCHA (use headless: false for manual intervention)
4. Check for IP rate limiting

## Best Practices

1. Use dedicated API accounts when available
2. Rotate credentials regularly
3. Monitor usage to avoid rate limits
4. Use caching to minimize requests

## Troubleshooting

### "Authentication required" error
- Run `setup_auth` tool to configure credentials
- Check `~/.semiconductor-mcp/auth.json` exists and is valid

### "Login failed" error
- Verify credentials are correct
- Try logging in manually to check for CAPTCHA or account issues
- Set `headless: false` in scraper options for debugging

### Session expires frequently
- Normal behavior for security
- Sessions auto-renew on next request
- Consider implementing refresh token logic