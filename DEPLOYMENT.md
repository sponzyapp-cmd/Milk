# Deployment Guide

## Vercel Deployment (Recommended)

### Quick Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project directory
vercel
```

### Configuration
The app requires minimal configuration since it's fully offline-first. Vercel automatically handles:
- Next.js optimization
- Service Worker serving
- Static asset caching
- HTTPS (required for PWA)

### Environment Variables
No required environment variables for local-first operation. The `.env.example` file shows optional configurations for future expansions.

## Self-Hosted Deployment

### Prerequisites
- Node.js 18+ and pnpm
- A web server (nginx, Apache, or Node.js server)

### Build Steps
```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Verify build output
ls .next/

# Test locally
pnpm start
# Visit http://localhost:3000
```

### HTTPS Requirement
PWA features require HTTPS in production. Options:
- Let's Encrypt (free)
- Cloudflare (automatic)
- Self-signed for local testing

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy dependencies
COPY package*.json pnpm-lock.yaml ./

# Install
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3000

# Start
CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t milk-tracker .
docker run -p 3000:3000 milk-tracker
```

## nginx Configuration

```nginx
upstream app {
  server localhost:3000;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Service Worker cache
  location /sw.js {
    proxy_pass http://app;
    add_header Cache-Control "public, max-age=86400" always;
    add_header Service-Worker-Allowed "/" always;
  }

  # Manifest
  location /manifest.json {
    proxy_pass http://app;
    add_header Cache-Control "public, max-age=3600" always;
  }

  # App
  location / {
    proxy_pass http://app;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Static assets (images, CSS, JS)
  location /_next/static {
    proxy_pass http://app;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
  }
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$server_name$request_uri;
}
```

## Performance Optimization

### Before Deployment
```bash
# Check build size
pnpm build
npm run analyze # if @next/bundle-analyzer installed

# Test PWA functionality
# - Open Chrome DevTools
# - Application → Service Workers
# - Check offline support
# - Check Lighthouse score
```

### Lighthouse Checklist
- **Performance**: > 90
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90
- **PWA**: All green

To test:
1. Chrome DevTools → Lighthouse
2. Audit page in production
3. Verify 90+ scores

## CDN Configuration

### Cloudflare
1. Add your domain to Cloudflare
2. Update nameservers
3. Enable automatic HTTPS
4. Set cache rules:
   - `sw.js`: Cache Standard (1 day)
   - `manifest.json`: Cache Standard (1 hour)
   - `/_next/static/*`: Cache Everything (1 year)
   - `/api/*`: Cache Default

### Vercel Edge Network (Automatic)
Vercel automatically handles CDN caching for:
- Static files (images, CSS, JS)
- Generated static pages
- API routes

## Database Backup

Since the app uses IndexedDB (client-side):
- **No server backup needed**
- Each device stores its own data locally
- Users can export data via Settings → Export

For cloud backup (future feature):
1. Export all user data weekly
2. Store encrypted JSON blobs
3. Allow restore from export

## Monitoring

### Key Metrics
- Service Worker registration rate
- App install rate
- Offline usage
- Cache hit rate

### Error Tracking (Optional)
For future: integrate with Sentry or similar:
```typescript
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./instrumentation.edge')
  }
}
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] Service Worker signed
- [ ] No sensitive data in IndexedDB
- [ ] XSS protection via React escape
- [ ] CSRF protection via Next.js
- [ ] Content Security Policy headers
- [ ] Rate limiting on future API endpoints
- [ ] Input validation on all forms

## Scaling Considerations

The current app is optimized for:
- Millions of users (client-side storage)
- Zero backend infrastructure
- Infinite offline usage

To add cloud features later:
1. Add authentication layer
2. Implement sync mechanism
3. Add PostgreSQL/MongoDB backend
4. Use Dexie Cloud or similar sync library

## Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
pnpm install
pnpm build
```

### Service Worker Not Updating
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check DevTools → Application → Cache Storage
4. Update SW version in `sw.js`

### PWA Won't Install
1. Verify HTTPS is enabled
2. Check `manifest.json` is valid
3. Ensure icons are accessible
4. Test with Chrome DevTools → Manifest

## Post-Deployment

1. **Test on devices**:
   - Android Chrome
   - iPhone Safari
   - Desktop Chrome
   - Firefox

2. **Verify PWA**:
   - Install on home screen
   - Test offline functionality
   - Check notification permissions

3. **Monitor**:
   - Check Vercel Analytics
   - Monitor error rates
   - Track install metrics

## Update Strategy

To deploy updates:
```bash
git push origin main
# Vercel auto-deploys

# Users get updates on next app open (Service Worker)
# Manual refresh available in Settings
```

For critical updates:
1. Update Service Worker cache keys
2. Force refresh with toast notification
3. Deploy immediately

## Cost

### Vercel Hosting
- Free tier: 1 GB bandwidth/month
- Pro: $20/month, unlimited bandwidth
- Cost scales with usage

### Self-Hosted
- Server: $5-50/month
- Bandwidth: Included or ~$0.10/GB
- Total: $5-100/month depending on scale

The app uses < 10MB storage per user, so costs scale with user count, not data volume.
