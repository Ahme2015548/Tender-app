# 🌐 Timer API Cloud Deployment Guide

## 🎯 Overview
Deploy your timer API to run **24/7 in the cloud** with automatic 17:30 daily snapshots, ensuring timer scheduling works even when your PC is off.

## ✅ Benefits of Cloud Deployment
- **24/7 Operation**: Timer snapshots at 17:30 daily, even when PC is off
- **No Interruption**: App closed, PC sleeping, browser inactive - doesn't matter  
- **Automatic Scaling**: Cloud handles traffic and uptime
- **Backup Scheduling**: Redundant timer snapshot creation
- **Zero Maintenance**: Cloud provider handles server updates

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended - Easiest)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Deploy with one command
cd server
chmod +x deploy.sh
./deploy.sh
# Choose option 1 (Railway)
```

**Why Railway**: 
- ✅ $5/month for hobby projects
- ✅ Automatic HTTPS
- ✅ Easy environment variables
- ✅ GitHub integration

### Option 2: Render (Free Tier Available)
```bash
# 1. Push code to GitHub
# 2. Connect GitHub to Render.com
# 3. Create Web Service from server/ directory
# 4. Set environment variables (see below)
# 5. Auto-deploy from GitHub
```

**Why Render**:
- ✅ Free tier (750 hours/month)
- ✅ Automatic deployments from Git
- ✅ Easy dashboard configuration

### Option 3: Vercel (Serverless)
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
cd server
vercel --prod
```

**Why Vercel**:
- ✅ Serverless functions (pay per use)
- ✅ Automatic scaling
- ✅ Fast global CDN

## 📋 Pre-Deployment Setup

### Step 1: Get Firebase Service Account
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download JSON file

### Step 2: Set Environment Variables
Copy the entire Firebase service account JSON as one line:

```bash
# Example environment variable
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nYourPrivateKey\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@your-project.iam.gserviceaccount.com"}'
```

### Step 3: Configure Platform Environment Variables

#### Railway Environment Variables:
```
NODE_ENV=production
TZ=Asia/Riyadh  
FIREBASE_SERVICE_ACCOUNT_KEY={your-firebase-json}
```

#### Render Environment Variables:
```
NODE_ENV=production
TZ=Asia/Riyadh
FIREBASE_SERVICE_ACCOUNT_KEY={your-firebase-json}
```

#### Vercel Environment Variables:
```
NODE_ENV=production
TZ=Asia/Riyadh
FIREBASE_SERVICE_ACCOUNT_KEY={your-firebase-json}
```

## 🔧 Deployment Process

### Automatic Deployment (Windows)
```cmd
cd server
deploy.bat
```

### Automatic Deployment (Linux/Mac)
```bash
cd server
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment Steps

#### Railway Manual Setup:
1. Create account at [railway.app](https://railway.app)
2. Install CLI: `npm install -g @railway/cli`
3. Login: `railway login`
4. Deploy: `railway up`
5. Set environment variables in dashboard
6. Done! 🎉

#### Render Manual Setup:
1. Create account at [render.com](https://render.com)  
2. Connect your GitHub repository
3. Create new "Web Service"
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables
7. Deploy automatically

#### Vercel Manual Setup:
1. Create account at [vercel.com](https://vercel.com)
2. Install CLI: `npm install -g vercel`
3. Run: `vercel --prod` in server directory
4. Set environment variables in dashboard
5. Deploy complete

## ✅ Verify Cloud Deployment

### Test Your Deployed API:
```bash
# Replace YOUR_CLOUD_URL with your actual deployment URL

# Test health endpoint
curl https://YOUR_CLOUD_URL/health

# Test timer status
curl https://YOUR_CLOUD_URL/api/timer/test-user/status

# Test manual snapshot
curl -X POST https://YOUR_CLOUD_URL/api/timer/snapshot \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user"}'
```

### Expected Response:
```json
{
  "status": "Timer API Server running",
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

## 🔗 Update Web App (Optional)
If you want your web app to use the cloud API:

```javascript
// In your web app, update API URL
const TIMER_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-cloud-api.railway.app'  // Your cloud URL
  : 'http://localhost:3001';              // Local development
```

**Note**: This is optional - your existing timer system continues working without any changes.

## 🕰️ Cloud Timer Schedule Verification

Your cloud API will now:
- ✅ Run 17:30 daily CRON automatically
- ✅ Create timer snapshots in Firebase
- ✅ Work 24/7 even when your PC is off
- ✅ Use same database as your web app
- ✅ Preserve all existing functionality

### Check Logs:
```bash
# Railway
railway logs

# Render  
Check logs in Render dashboard

# Vercel
vercel logs YOUR_DEPLOYMENT_URL
```

Look for:
```
✅ 17:30 daily CRON scheduler active
🕰️ Timezone: Asia/Riyadh
✅ Firestore database connection established
```

## 🎉 Success! Your Timer is Now Cloud-Powered

### What Happens Now:
1. **PC Off**: ✅ Timer snapshots still created at 17:30
2. **App Closed**: ✅ Cloud server runs independently  
3. **Internet Down**: ✅ Cloud server continues (when internet returns, data syncs)
4. **Browser Closed**: ✅ No impact on server-side scheduling

### Your Web App:
- ✅ Works exactly the same as before
- ✅ Uses same Firebase database
- ✅ All existing functionality preserved
- ✅ Now has backup cloud scheduling

## 💰 Cost Estimates
- **Railway**: $5/month (recommended)
- **Render**: Free tier (750 hours) or $7/month  
- **Vercel**: Pay per use (likely $0-5/month for timer API)
- **Heroku**: $7/month (basic plan)

## 🔧 Troubleshooting

### Common Issues:

#### Firebase Connection Error:
```bash
# Check environment variable is set correctly
echo $FIREBASE_SERVICE_ACCOUNT_KEY

# Verify JSON is valid
node -e "JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)"
```

#### CRON Not Running:
- ✅ Check timezone: `TZ=Asia/Riyadh`
- ✅ Check logs for CRON messages
- ✅ Verify 24/7 server (not serverless for CRON)

#### API Not Responding:
```bash
# Check server status
curl https://your-api-url/health

# Check environment
curl https://your-api-url/health | jq .
```

## 📞 Support
- Railway: [railway.app/help](https://railway.app/help)
- Render: [render.com/docs](https://render.com/docs)  
- Vercel: [vercel.com/support](https://vercel.com/support)

Your timer system is now enterprise-grade with 24/7 cloud backup! 🚀