# Production Deployment Guide

## Overview
This document covers the production deployment process for the Telco Analysis Platform, including common issues and their solutions.

## Production Environment
- **Domain**: `https://telco-platform.openbiocure.ai`
- **Server**: `172.16.13.246`
- **Deployment Path**: `/opt/telco-analysis`
- **Load Balancer**: Nginx

## Key Issues and Solutions

### 1. Mixed Content Error
**Problem**: Frontend making HTTP requests from HTTPS page
```
Mixed Content: The page at 'https://telco-platform.openbiocure.ai/' was loaded over HTTPS, 
but requested an insecure resource 'http://telco-platform.lab/api/capabilities/'
```

**Solution**: Updated API configuration to force HTTPS in production
- Modified `web/src/config/api.ts` to detect production environment
- Force HTTPS URLs when `window.location.hostname.includes('openbiocure.ai')`
- Updated all API calls to use `apiConfig.BASE_URL` instead of relative paths

### 2. Incorrect API Base URL
**Problem**: Frontend making requests to `https://127.0.0.1:8000/api/capabilities/`
**Solution**: 
- Updated `getApiConfig()` function to return correct production URL
- Added environment variable `VITE_API_BASE_URL=https://telco-platform.openbiocure.ai` in `start.sh`
- Updated all components to use `apiConfig.BASE_URL`

### 3. Build File Caching Issues
**Problem**: Production server serving old build files (`index-CztmqYLg.js` instead of `index-DRdd_7VG.js`)
**Solution**:
- Use `rsync` to sync local changes to production
- Clear all caches before rebuilding
- Force complete rebuild with cache clearing

### 4. Password Authentication Issues
**Problem**: Admin password (`admin/admin123`) not working in production
**Root Cause**: Inconsistent password hashing (SHA256 vs bcrypt)
**Solution**:
- Removed old `backend/utils/init_db.py` using SHA256
- Updated `backend/api/auth.py` to consistently use bcrypt
- Reset admin password using bcrypt

### 5. Vite Preview Host Issues
**Problem**: Vite blocking requests to production domain
```
Blocked request. This host ("telco-platform.openbiocure.ai") is not allowed.
```
**Solution**: Added production domain to `vite.config.ts`:
```typescript
preview: {
  allowedHosts: ['telco-platform.lab', 'telco-platform.openbiocure.ai']
}
```

## Deployment Process

### 1. Sync Code to Production
```bash
# From local development machine
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='venv' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='*.log' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  /Users/mohammad_shehab/develop/telco-web/ \
  root@172.16.13.246:/opt/telco-analysis/
```

### 2. Build Frontend
```bash
# On production server
cd /opt/telco-analysis/web
rm -rf dist
rm -rf node_modules/.vite
rm -rf node_modules/.cache
npm run build
```

### 3. Verify Build
```bash
# Check build file and URLs
ls -la dist/assets/
grep -o "https://telco-platform.openbiocure.ai" dist/assets/index-*.js | wc -l
grep -o "127.0.0.1:8000" dist/assets/index-*.js | wc -l
```

### 4. Start Services
```bash
# Kill existing processes
pkill -f 'python.*app.py'
pkill -f 'npm.*start:prod'
pkill -f 'node.*3000'
pkill -f 'vite.*preview'

# Start services
cd /opt/telco-analysis
./start.sh prod
```

### 5. Verify Services
```bash
# Check if services are running
ps aux | grep -E '(python.*app.py|vite.*preview)' | grep -v grep

# Test API
curl -s http://localhost:8000/api/capabilities | head -3

# Test frontend
curl -s http://localhost:3000 | head -5
```

## Environment Variables

### Production Environment
```bash
export VITE_API_BASE_URL=https://telco-platform.openbiocure.ai
export MODE=prod
```

### Development Environment
```bash
export VITE_API_BASE_URL=http://127.0.0.1:8000
export MODE=dev
```

## File Structure

### Critical Files
- `web/src/config/api.ts` - API configuration
- `web/vite.config.ts` - Vite configuration
- `start.sh` - Service startup script
- `backend/api/auth.py` - Authentication logic

### Build Output
- `web/dist/assets/index-*.js` - Frontend bundle
- `web/dist/index.html` - Main HTML file

## Troubleshooting

### Check Build File
```bash
# Verify correct build file is being served
curl -s https://telco-platform.openbiocure.ai | grep -o 'index-.*\.js'
```

### Check API Calls
```bash
# Monitor browser console for API calls
# Should see: https://telco-platform.openbiocure.ai/api/capabilities
# NOT: https://127.0.0.1:8000/api/capabilities
```

### Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache completely
- Check Network tab in DevTools for actual requests

### Restart Services
```bash
# Complete restart
cd /opt/telco-analysis
pkill -f 'python.*app.py'
pkill -f 'vite.*preview'
./start.sh prod
```

## Common Commands

### Sync and Deploy
```bash
# From local machine
rsync -avz --delete --exclude='node_modules' --exclude='venv' --exclude='.git' --exclude='dist' --exclude='*.log' --exclude='__pycache__' --exclude='*.pyc' /Users/mohammad_shehab/develop/telco-web/ root@172.16.13.246:/opt/telco-analysis/
```

### Rebuild Frontend
```bash
# On production server
cd /opt/telco-analysis/web
rm -rf dist && npm run build
```

### Check Services
```bash
# Check running processes
ps aux | grep -E '(python.*app.py|vite.*preview)' | grep -v grep

# Check logs
tail -f /opt/telco-analysis/web/frontend.log
tail -f /opt/telco-analysis/backend/backend.log
```

## Notes

1. **Build File Names**: The build file hash changes with each build (e.g., `index-DRdd_7VG.js`, `index-CztmqYLg.js`). This is normal.

2. **Caching**: Nginx may cache old build files. Clear Nginx cache if needed.

3. **Environment Detection**: The frontend detects production by checking if `window.location.hostname.includes('openbiocure.ai')`.

4. **API Configuration**: All API calls should use `apiConfig.BASE_URL` from `web/src/config/api.ts`.

5. **Service Management**: Use `start.sh prod` for production mode with `nohup` for background processes.

## Success Criteria

✅ Frontend loads without Mixed Content errors
✅ API calls go to `https://telco-platform.openbiocure.ai/api/*`
✅ Admin login works with `admin/admin123`
✅ All features function correctly
✅ No console errors related to API calls 