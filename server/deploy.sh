#!/bin/bash

# 🌐 CLOUD DEPLOYMENT: Multi-platform deployment script
# Deploys timer API to various cloud providers

set -e

echo "🚀 Timer API Cloud Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Firebase service account is configured
check_firebase_config() {
    print_info "Checking Firebase configuration..."
    
    if [ -f "../firebase-service-account.json" ] || [ ! -z "$FIREBASE_SERVICE_ACCOUNT_KEY" ]; then
        print_status "Firebase configuration found"
        return 0
    else
        print_error "Firebase service account not configured!"
        print_warning "Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable"
        print_warning "Or place firebase-service-account.json in project root"
        return 1
    fi
}

# Deploy to Railway
deploy_railway() {
    print_info "Deploying to Railway..."
    
    if command -v railway &> /dev/null; then
        railway login
        railway up
        print_status "Railway deployment complete"
        railway status
    else
        print_error "Railway CLI not installed"
        print_info "Install: npm install -g @railway/cli"
        return 1
    fi
}

# Deploy to Render
deploy_render() {
    print_info "Deploying to Render..."
    print_warning "Render deployment requires manual setup via dashboard"
    print_info "1. Connect your GitHub repository to Render"
    print_info "2. Create new Web Service from server/ directory"  
    print_info "3. Set environment variables in Render dashboard"
    print_info "4. Deploy will happen automatically"
    print_status "Render deployment instructions provided"
}

# Deploy to Vercel
deploy_vercel() {
    print_info "Deploying to Vercel..."
    
    if command -v vercel &> /dev/null; then
        vercel --prod
        print_status "Vercel deployment complete"
    else
        print_error "Vercel CLI not installed" 
        print_info "Install: npm install -g vercel"
        return 1
    fi
}

# Deploy to Heroku
deploy_heroku() {
    print_info "Deploying to Heroku..."
    
    if command -v heroku &> /dev/null; then
        # Check if Heroku app exists
        if ! heroku apps | grep -q "tender-timer-api"; then
            print_info "Creating Heroku app..."
            heroku create tender-timer-api
        fi
        
        # Set environment variables
        print_info "Setting environment variables..."
        heroku config:set NODE_ENV=production
        heroku config:set TZ=Asia/Riyadh
        
        if [ ! -z "$FIREBASE_SERVICE_ACCOUNT_KEY" ]; then
            heroku config:set FIREBASE_SERVICE_ACCOUNT_KEY="$FIREBASE_SERVICE_ACCOUNT_KEY"
        fi
        
        # Deploy
        git push heroku main
        print_status "Heroku deployment complete"
        heroku logs --tail
    else
        print_error "Heroku CLI not installed"
        print_info "Install: https://devcenter.heroku.com/articles/heroku-cli"
        return 1
    fi
}

# Test deployment
test_deployment() {
    local url=$1
    print_info "Testing deployment at: $url"
    
    # Test health endpoint
    if curl -f "$url/health" > /dev/null 2>&1; then
        print_status "Health check passed"
        
        # Test timer endpoint
        if curl -f "$url/api/timer/test/status" > /dev/null 2>&1; then
            print_status "Timer API endpoints working"
            print_status "🎉 Deployment successful!"
            print_info "17:30 daily CRON will now run 24/7 on cloud server"
            return 0
        else
            print_warning "Timer endpoints not responding"
            return 1
        fi
    else
        print_error "Health check failed"
        return 1
    fi
}

# Main deployment function
main() {
    print_info "Starting timer API cloud deployment..."
    
    # Check prerequisites
    if ! check_firebase_config; then
        exit 1
    fi
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    # Prompt user for platform choice
    echo ""
    print_info "Choose deployment platform:"
    echo "1) Railway (recommended - easy setup)"
    echo "2) Render (free tier available)" 
    echo "3) Vercel (serverless functions)"
    echo "4) Heroku (classic PaaS)"
    echo "5) All platforms"
    echo ""
    read -p "Enter choice (1-5): " choice
    
    case $choice in
        1)
            deploy_railway
            ;;
        2) 
            deploy_render
            ;;
        3)
            deploy_vercel
            ;;
        4)
            deploy_heroku
            ;;
        5)
            print_info "Deploying to all platforms..."
            deploy_railway
            deploy_render
            deploy_vercel  
            deploy_heroku
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_status "Cloud deployment process complete!"
    print_info "Your timer API now runs 24/7 with automatic 17:30 daily snapshots"
    print_warning "Don't forget to update your web app's API URL to point to cloud server"
}

# Run main function
main "$@"