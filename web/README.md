# Stock Analysis Bot - Web Interface

Modern web interface for the Stock Analysis Bot, built with Next.js 15 and deployed on Vercel.

## Features

- ⚡ Quick Analysis: Fast data collection and basic metrics
- 🤖 Deep Analysis: 10 AI agents providing comprehensive analysis
- 📊 Real-time stock data from Yahoo Finance
- 🇮🇳 India-specific metrics (Promoter holding, FII/DII, F&O)
- 📱 Responsive design with Tailwind CSS

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. Push this repository to GitHub
2. Import the project in Vercel Dashboard
3. Set the root directory to `web`
4. Configure environment variables:
   - `ANTHROPIC_API_KEY` (required for deep analysis)

### Environment Variables

Create `.env.local` for local development:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

In Vercel, add these environment variables in the project settings.

## API Routes

### `GET /api/analyze`

Analyze a stock symbol.

**Parameters:**
- `symbol` (required): Stock symbol (e.g., RELIANCE.NS, TCS.BO)
- `type` (optional): `quick` or `deep` (default: `quick`)

**Example:**
```
GET /api/analyze?symbol=RELIANCE.NS&type=quick
```

**Response:**
```json
{
  "symbol": "RELIANCE",
  "market": "INDIA",
  "price": { ... },
  "fundamentals": { ... },
  "technicals": { ... },
  "indiaSpecific": { ... }
}
```

## Connecting to Backend

The web app is designed to work with the stock analysis backend located in the parent directory.

To enable full functionality:

1. Install backend dependencies in parent directory
2. Build backend: `cd .. && npm run build`
3. Import analysis functions in API routes
4. Configure ANTHROPIC_API_KEY for multi-agent analysis

## Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Deployment**: Vercel

## Project Structure

```
web/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts      # Stock analysis API endpoint
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   └── globals.css            # Global styles
├── components/                # React components (future)
├── lib/                       # Utility functions (future)
├── public/                    # Static assets
└── package.json
```

## Roadmap

- [ ] Connect to actual backend analysis functions
- [ ] Add real-time price updates (WebSocket)
- [ ] Implement user authentication
- [ ] Save analysis history
- [ ] Create shareable analysis reports
- [ ] Add portfolio tracking
- [ ] Implement alert system

## License

MIT
