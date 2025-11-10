#!/bin/bash
set -e

echo ""
echo "================================================"
echo "   Frontend Deployment Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo -e "${RED}❌ Error: Must run from referencecheck-frontend directory${NC}"
    exit 1
fi

# Step 1: Build
echo -e "${YELLOW}🔨 Step 1/4: Building frontend...${NC}"
cd frontend-example
npm run build
cd ..
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 2: Copy to public
echo -e "${YELLOW}📦 Step 2/4: Copying built files to public/...${NC}"
rm -rf public/*
cp -r frontend-example/dist/* public/
echo -e "${GREEN}✅ Files copied${NC}"
echo ""

# Step 3: Verify backend URL
echo -e "${YELLOW}🔍 Step 3/4: Verifying backend URL...${NC}"
BACKEND_URL=$(grep -o "referencecheck-backend-[a-z0-9]*" public/assets/*.js | head -1 | cut -d'-' -f3 | cut -d'"' -f1)
echo "   Backend URL in build: referencecheck-backend-${BACKEND_URL}"

# Check if it's the correct one
EXPECTED="e485f62r5"
if [ "$BACKEND_URL" == "$EXPECTED" ]; then
    echo -e "${GREEN}✅ Correct backend URL${NC}"
else
    echo -e "${RED}⚠️  WARNING: Backend URL is ${BACKEND_URL}, expected ${EXPECTED}${NC}"
    echo "   Update source files before deploying!"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 4: Deploy
echo -e "${YELLOW}🚀 Step 4/4: Deploying to Vercel...${NC}"
vercel --prod
echo ""

echo -e "${GREEN}================================================"
echo "   ✅ Deployment Complete!"
echo "================================================${NC}"
echo ""
echo "⚠️  IMPORTANT: Test the deployment:"
echo "   1. Open the deployment URL above"
echo "   2. Open browser console (F12)"
echo "   3. Check API calls go to correct backend"
echo ""
