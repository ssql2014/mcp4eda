# Domain Setup Guide for mcp4eda.com

## Important Note
GitHub Pages only supports ONE custom domain per repository. Since you want both .cn and .com domains, you have two options:

### Option A: Use .com as primary (Recommended)
- Set www.mcp4eda.com as the primary domain on GitHub
- Use domain forwarding to redirect .cn to .com

### Option B: Use .cn as primary
- Keep www.mcp4eda.cn as the primary domain
- Use domain forwarding to redirect .com to .cn

## Step 1: Purchase Domain from Porkbun

1. Go to https://porkbun.com
2. Search for "mcp4eda.com"
3. Add to cart ($10.37/year)
4. Create account and complete purchase
5. **Important**: Enable WHOIS Privacy (free)

## Step 2: Configure DNS (Option A - Recommended)

### For GitHub Pages (www.mcp4eda.com):
- **Type**: CNAME
- **Host**: www
- **Answer**: ssql2014.github.io
- **TTL**: 600

### For apex domain (mcp4eda.com):
Add these 4 A records:
- **Type**: A
- **Host**: (leave blank)
- **Answer**: 185.199.108.153
- **TTL**: 600

Repeat for: 185.199.109.153, 185.199.110.153, 185.199.111.153

## Step 3: Set Up Domain Forwarding for .cn

In your .cn domain registrar:
1. Set up URL forwarding
2. Forward www.mcp4eda.cn → www.mcp4eda.com
3. Enable 301 permanent redirect

## Alternative: Use Cloudflare for Both Domains

If you want both domains to work independently:
1. Add both domains to Cloudflare (free plan)
2. Use Cloudflare Page Rules to manage redirects
3. Point both domains to the same GitHub Pages site