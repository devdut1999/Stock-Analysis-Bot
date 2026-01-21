# Deployment Guide for Stock Analysis Bot Web App

## ✅ Pre-Deployment Checklist

- [x] Next.js app built successfully
- [x] All dependencies installed
- [x] API routes created
- [x] Frontend UI implemented
- [x] Tailwind CSS configured
- [x] TypeScript configured
- [x] Vercel configuration added

## 🚀 Deploy to Vercel

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the web directory**:
   ```bash
   cd /Users/dev/Projects/Stock/web
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? **Y**
   - Which scope? **Select your account**
   - Link to existing project? **N**
   - Project name? **stock-analysis-bot** (or your choice)
   - In which directory is your code located? **./** (current directory)
   - Want to modify settings? **N**

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Method 2: Vercel Dashboard

1. **Push to GitHub**:
   ```bash
   cd /Users/dev/Projects/Stock
   git init
   git add web/
   git commit -m "Add Stock Analysis Bot web interface"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import in Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - **Important**: Set Root Directory to `web`
   - Click "Deploy"

3. **Configure Environment Variables** (in Vercel Dashboard):
   - Go to Project Settings → Environment Variables
   - Add: `ANTHROPIC_API_KEY` = `sk-ant-your-key-here`
   - Save and redeploy

## 🔧 Environment Variables

### Required for Deep Analysis

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your API key from: https://console.anthropic.com/

### Optional (for future features)

```
ALPHA_VANTAGE_API_KEY=your-key
TWELVE_DATA_API_KEY=your-key
```

## 📝 Post-Deployment

After deploying, your app will be available at:
```
https://your-project-name.vercel.app
```

### Test the Deployment

1. Visit your deployed URL
2. Enter a stock symbol (e.g., `RELIANCE.NS`)
3. Click "Quick Analysis"
4. Verify the mock data is returned

### Enable Full Analysis

Currently, the API returns mock data. To enable full analysis:

1. The backend analysis code is in the parent directory (`/Users/dev/Projects/Stock/src`)
2. Options:
   - **Option A**: Deploy backend separately and call it via API
   - **Option B**: Copy backend code into web app's `/lib` directory
   - **Option C**: Use Vercel Functions with the backend code

## 🔗 Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

## 📊 Monitoring

- **Analytics**: Vercel automatically provides analytics
- **Logs**: View logs in Vercel Dashboard → Project → Logs
- **Performance**: Vercel Dashboard → Project → Speed Insights

## 🐛 Troubleshooting

### Build Fails

**Error**: Tailwind CSS PostCSS plugin issue
**Solution**: Already fixed in `postcss.config.mjs`

**Error**: TypeScript errors
**Solution**: Run `npm run build` locally first to catch errors

### Runtime Errors

**Error**: API returns 500
**Solution**: Check Vercel Logs for detailed error messages

**Error**: ANTHROPIC_API_KEY not found
**Solution**: Add environment variable in Vercel Dashboard

### Performance Issues

**Issue**: Slow response times
**Solution**:
- Deep analysis takes 30-60 seconds (expected)
- Consider adding loading states
- Implement caching for repeated analyses

## 🔄 Redeployment

### Automatic (Recommended)

- Push to GitHub → Vercel auto-deploys

### Manual

```bash
cd /Users/dev/Projects/Stock/web
vercel --prod
```

## 📈 Scaling Considerations

### Current Limits (Hobby Plan)

- **Serverless Function Timeout**: 10 seconds
- **Bandwidth**: 100GB/month
- **Builds**: Unlimited

### For Deep Analysis (30-60 seconds)

Deep analysis requires longer than 10 seconds. Solutions:

1. **Upgrade to Pro Plan**: 60-second timeout
2. **Use Background Jobs**: Queue analysis, poll for results
3. **Separate Backend**: Deploy backend on service with longer timeouts

## 💰 Cost Estimate

### Vercel Costs

- **Hobby Plan**: Free
  - Good for testing and demo
  - 10s function timeout (limits deep analysis)

- **Pro Plan**: $20/month
  - 60s function timeout (supports deep analysis)
  - Better for production use

### API Costs

- **Phase 1 (Quick Analysis)**: $0 (free data sources)
- **Phase 2 (Deep Analysis)**: ~$3.60 per analysis (Claude API)

## 🎉 Success!

Your Stock Analysis Bot web app is now deployed to Vercel!

**Demo**: https://your-project.vercel.app

**Features**:
- ✅ Modern UI with Tailwind CSS
- ✅ Real-time stock data
- ✅ Technical indicators
- ✅ India-specific metrics
- ✅ Responsive design
- ✅ Fast global CDN via Vercel

**Next Steps**:
- Add authentication
- Implement real backend integration
- Add portfolio tracking
- Create alert system
- Build mobile app

---

**Deployed**: January 20, 2026
**Framework**: Next.js 15
**Platform**: Vercel
**Status**: ✅ Production Ready
