# Smart Financial Portfolio Optimization

A production-quality, AI-powered financial portfolio optimization web application built with Next.js 14, TypeScript, and TailwindCSS. Deploy instantly to Vercel.

## Features

- **Market Data Integration**: Real-time data from Yahoo Finance with demo mode fallback
- **Advanced ML Models**: Random Forest, Gradient Boosting, and 1D CNN for return prediction
- **Portfolio Optimization**: Simulated Annealing with multiple objectives (Max Sharpe, Min Volatility, Custom)
- **Comprehensive Backtesting**: Compare optimized portfolio against equal-weight and benchmark
- **Premium UI**: Dark mode, glassmorphism effects, responsive charts with Recharts
- **Serverless Architecture**: Fully compatible with Vercel's serverless functions

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Charts**: Recharts
- **ML**: TensorFlow.js (CNN), custom RF/GB implementations
- **Data**: yahoo-finance2

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Usage

### 1. Fetch Data
- Enter tickers (comma-separated): `AAPL,MSFT,GOOG,TSLA,SPY`
- Select date range (default: last 3 years)
- Toggle **Demo Mode** if Yahoo Finance API fails or rate-limits
- Click **Fetch Data**

### 2. Train Model
- Select prediction model:
  - **Random Forest**: Ensemble of decision trees
  - **Gradient Boosting**: Sequential residual-based trees
  - **1D CNN**: TensorFlow.js time-series regression (fast mode enabled)
- Click **Train Model**
- View MAE and RMSE metrics

### 3. Optimize Portfolio
- Select optimization objective:
  - **Max Sharpe**: Maximize risk-adjusted returns
  - **Min Volatility**: Minimize portfolio risk
  - **Max Return - λ × Vol**: Custom risk-return tradeoff
- Adjust sliders:
  - **Max Weight**: Maximum allocation per asset (default: 0.4)
  - **Risk-Free Rate**: For Sharpe calculation (default: 0.0)
  - **Lambda (λ)**: Risk aversion parameter (for custom objective)
- Click **Optimize Portfolio**
- View optimal weights, expected return, volatility, and Sharpe ratio

### 4. Run Backtest
- Click **Run Backtest**
- Compare performance:
  - **Optimized Portfolio**: Using ML-predicted returns + SA optimization
  - **Equal Weight**: Naive 1/N allocation
  - **Benchmark**: SPY (if available) or first ticker
- View metrics: CAGR, Max Drawdown, Volatility, Sharpe Ratio

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option 2: Deploy via GitHub

1. Push code to GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Click **Import Project**
4. Select your repository
5. Click **Deploy**

### Option 3: Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/smart-portfolio)

## Environment Variables

No environment variables required. The app works out of the box.

## Project Structure

```
smart-portfolio/
├── app/
│   ├── api/
│   │   ├── data/route.ts        # Fetch market data
│   │   ├── train/route.ts       # Train ML models
│   │   ├── optimize/route.ts    # Portfolio optimization
│   │   └── backtest/route.ts    # Backtesting
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # Main dashboard
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── finance.ts               # Feature engineering utilities
│   ├── metrics.ts               # Performance metrics
│   ├── models/
│   │   ├── rf.ts                # Random Forest
│   │   ├── gb.ts                # Gradient Boosting
│   │   └── cnn.ts               # TensorFlow.js CNN
│   ├── optimizer/
│   │   └── sa.ts                # Simulated Annealing
│   └── utils.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

## Key Implementation Details

### Feature Engineering
From OHLCV data, the app computes:
- Daily returns
- Moving averages (MA5, MA10, MA20)
- Rolling volatility (10-day, 20-day)
- Momentum indicators (5-day, 10-day)
- Target: next-day return

### Models
- **Random Forest**: Custom implementation with bootstrapping and feature sampling
- **Gradient Boosting**: Residual-based sequential tree building
- **1D CNN**: TensorFlow.js with Conv1D layers, fast mode (5 epochs) for serverless compatibility

### Optimization
- **Simulated Annealing**: Geometric cooling schedule, constraint projection to simplex
- **Constraints**: Weights sum to 1, non-negative, max weight per asset
- **Objectives**: Sharpe ratio, volatility, custom risk-return

### Backtesting
- Train/test split: 80/20
- Starting capital: $10,000
- Comparisons: Optimized vs Equal-weight vs Benchmark
- Metrics: CAGR, Max Drawdown, Volatility, Sharpe

## Performance Considerations

- **Fast Mode**: CNN uses 5 epochs to stay within Vercel's 10s serverless limit
- **Caching**: In-memory caching reduces redundant API calls
- **Demo Mode**: Deterministic built-in dataset for testing without API limits

## License

MIT

## Author

Built with Next.js 14, TypeScript, and TailwindCSS.
