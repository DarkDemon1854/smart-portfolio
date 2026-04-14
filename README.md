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
│   │   ├── auto-cashout/route.ts          # Auto-sell based on prediction threshold
│   │   ├── auto-invest/route.ts           # Auto-buy with optimized allocations
│   │   ├── auto-trade/route.ts            # Combined cycle: train + optimize + buy/sell
│   │   ├── backtest/route.ts              # Backtesting engine
│   │   ├── chart/route.ts                 # Chart series endpoint
│   │   ├── cron/
│   │   │   ├── config/route.ts            # Persist automation config
│   │   │   └── run/route.ts               # Scheduled execution endpoint
│   │   ├── data/
│   │   │   ├── route.ts                   # Fetch market data
│   │   │   └── export/route.ts            # Export dataset to CSV/XLSX
│   │   ├── history/route.ts               # Trading history endpoint
│   │   ├── invest/route.ts                # Manual investment endpoint
│   │   ├── optimize/route.ts              # Portfolio optimization (Simulated Annealing)
│   │   ├── portfolio/route.ts             # Portfolio read/update endpoint
│   │   ├── predictions/cache/route.ts     # Cached model predictions
│   │   ├── recommend/route.ts             # Recommendation scan endpoint
│   │   ├── search/route.ts                # Ticker/company search endpoint
│   │   ├── sell/route.ts                  # Manual sell endpoint
│   │   ├── sell-all/route.ts              # Liquidate all holdings endpoint
│   │   ├── settings/
│   │   │   ├── tickers/route.ts           # Persist default ticker list
│   │   │   └── profile/route.ts           # User/system config endpoint
│   │   ├── stop-loss/route.ts             # Stop-loss scanner and execution
│   │   ├── train/route.ts                 # Model training + inference endpoint
│   │   └── wallet/route.ts                # Wallet balances/positions endpoint
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # Main dashboard
├── components/
│   ├── dashboard/               # Stats, allocation, backtest, auto trade cards
│   ├── ui/                      # shadcn/ui components
│   ├── company-select.tsx       # Symbol selection with search
│   ├── stock-search.tsx         # Stock search input
│   ├── nav.tsx                  # Top navigation
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── finance.ts               # Feature engineering utilities
│   ├── metrics.ts               # Performance metrics
│   ├── yahoo.ts                 # Yahoo Finance integration
│   ├── stocks.ts                # Stock helper methods
│   ├── prisma.ts                # Prisma client singleton
│   ├── db.ts                    # DB utility layer
│   ├── models/
│   │   ├── rf.ts                # Random Forest
│   │   ├── gb.ts                # Gradient Boosting
│   │   └── cnn.ts               # TensorFlow.js CNN
│   ├── optimizer/
│   │   └── sa.ts                # Simulated Annealing
│   └── utils.ts
├── prisma/
│   └── schema.prisma            # Data model (wallet/settings/history)
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

## Detailed Algorithm Explanations

This section explains each major algorithm used in the project, including why it exists, how it works in this app, and where it is implemented.

### 1) Feature Engineering Algorithms (Input Signal Layer)

#### Daily Return
- Why used:
  - Returns are scale-invariant compared to raw prices, so AAPL and TSLA can be modeled in the same feature space.
  - Almost every downstream model and risk metric is return-based.
- How used:
  - Computes day-over-day percentage change: `(P_t - P_{t-1}) / P_{t-1}`.
  - Also used to create the supervised label (`target = next day return`).
- Where used:
  - `lib/finance.ts` in `calculateReturns` and `engineerFeatures`.

#### Moving Averages (MA5, MA10, MA20)
- Why used:
  - Encodes trend regime (short-term vs medium-term direction).
  - Smooths noisy daily movement.
- How used:
  - Rolling means are computed, then converted to relative features via `close / MA` to normalize across tickers.
- Where used:
  - `lib/finance.ts` in `calculateMA` and `engineerFeatures`.

#### Rolling Volatility (10-day and 20-day)
- Why used:
  - Captures local risk state.
  - Helps the model distinguish stable vs unstable periods.
- How used:
  - Standard deviation of rolling return windows.
- Where used:
  - `lib/finance.ts` in `calculateVolatility` and `engineerFeatures`.

#### Momentum (5-day and 10-day)
- Why used:
  - Captures short-window persistence or reversal pressure.
  - Adds directional context not captured by one-day return alone.
- How used:
  - Rolling sum of recent returns.
- Where used:
  - `lib/finance.ts` in `calculateMomentum` and `engineerFeatures`.

#### RSI(14)
- Why used:
  - Measures relative buying/selling pressure (overbought/oversold behavior).
  - Adds oscillator-style signal beyond trend features.
- How used:
  - Computes average gains/losses over period and maps to RSI-equivalent normalized score.
- Where used:
  - `lib/finance.ts` in `calculateRSI` and `engineerFeatures`.

#### MACD Histogram
- Why used:
  - Captures trend acceleration and turning behavior.
  - Useful for identifying momentum shifts.
- How used:
  - EMA12 - EMA26, then subtract EMA9 signal and scale by price.
- Where used:
  - `lib/finance.ts` in `calculateMACD` and `engineerFeatures`.

#### Bollinger Width
- Why used:
  - Detects volatility compression/expansion regimes.
  - Useful for breakout-sensitive behavior.
- How used:
  - Uses rolling standard deviation and mean (`4 * std / mean`).
- Where used:
  - `lib/finance.ts` in `calculateBollingerWidth` and `engineerFeatures`.

#### Volume Ratio
- Why used:
  - Distinguishes low-conviction moves from high-participation moves.
  - Gives context for signal reliability.
- How used:
  - `current volume / rolling average volume`.
- Where used:
  - `lib/finance.ts` in `calculateVolumeRatio` and `engineerFeatures`.

---

### 2) Prediction Algorithms (Return Forecast Layer)

#### Random Forest Regressor
- Why used:
  - Strong tabular baseline for engineered financial features.
  - Robust to noisy features and outliers due to ensemble averaging.
- How used:
  - Builds many trees on bootstrap samples.
  - Uses random feature sub-sampling per split.
  - Final prediction is mean of tree predictions.
- Where used:
  - Implementation: `lib/models/rf.ts`.
  - Called from: `app/api/train/route.ts` when `model = rf` and inside `ensemble` flow.

#### Gradient Boosting Regressor
- Why used:
  - Captures structured non-linear interactions by fitting residuals iteratively.
  - Often improves fit where pure bagging underfits.
- How used:
  - Starts from global mean prediction.
  - Sequentially adds shallow trees minimizing residual error.
  - Applies learning rate shrinkage for stability.
- Where used:
  - Implementation: `lib/models/gb.ts`.
  - Called from: `app/api/train/route.ts` when `model = boosting` and inside `ensemble` flow.

#### 1D CNN Regressor (TensorFlow.js)
- Why used:
  - Adds a deep learning model that can learn richer local feature interactions than hand-crafted tree splits.
  - Provides architectural diversity against tree-based models.
- How used:
  - Input reshape -> Conv1D -> BatchNorm -> Pooling -> Dense layers -> single regression output.
  - Uses normalization statistics from training data for consistent inference.
- Where used:
  - Implementation: `lib/models/cnn.ts`.
  - Called from: `app/api/train/route.ts` when `model = cnn`.

#### Ensemble (RF + GB)
- Why used:
  - Reduces model-specific bias and variance by combining two diverse tree ensembles.
  - Improves prediction stability in changing market regimes.
- How used:
  - Trains RF and GB independently.
  - Averages their test and live predictions.
- Where used:
  - Logic in: `app/api/train/route.ts` when `model = ensemble`.

#### Fast Mode vs Full Mode
- Why used:
  - Keep training latency practical for interactive UI/serverless limits.
- How used:
  - RF/GB reduce trees/depth in fast mode.
  - CNN reduces epochs in fast mode.
- Where used:
  - `app/api/train/route.ts`, `lib/models/rf.ts`, `lib/models/gb.ts`, `lib/models/cnn.ts`.

---

### 3) Optimization Algorithms (Allocation Layer)

#### Simulated Annealing (SA)
- Why used:
  - Portfolio objective landscape is non-convex with practical constraints.
  - SA can escape local minima by probabilistically accepting worse solutions early on.
- How used:
  - Start from equal weights.
  - Randomly perturb one or more weights.
  - Project candidate to valid feasible set.
  - Accept/reject based on objective delta and temperature.
  - Gradually cool temperature until convergence.
- Where used:
  - Implementation: `lib/optimizer/sa.ts`.
  - Called from: `app/api/optimize/route.ts`.

#### Feasibility Projection (Simplex + Weight Cap)
- Why used:
  - Ensure every candidate allocation obeys portfolio constraints.
  - Prevent invalid portfolios from entering objective evaluation.
- How used:
  - Clamp to `[0, maxWeight]`.
  - Normalize to `sum(weights) = 1`.
  - Iteratively re-distribute excess weight from violating assets.
- Where used:
  - `projectToSimplex` in `lib/optimizer/sa.ts`.

#### Objective Functions
- Sharpe objective:
  - Why: maximize risk-adjusted return.
  - How: minimizes negative Sharpe in optimizer.
- MinVol objective:
  - Why: conservative capital preservation profile.
  - How: directly minimizes annualized volatility.
- MaxReturn - lambda * Vol objective:
  - Why: custom return-risk preference.
  - How: penalty factor `lambda` controls risk aversion.
- Where used:
  - `calculateObjective` in `lib/optimizer/sa.ts`.

---

### 4) Risk and Evaluation Algorithms

#### Covariance Matrix
- Why used:
  - Portfolio volatility depends on both individual variance and cross-asset covariance.
- How used:
  - Computes pairwise covariance over aligned asset return series.
- Where used:
  - `lib/finance.ts` in `calculateCovarianceMatrix`.
  - Consumed by `app/api/optimize/route.ts` and SA objective calculations.

#### MAE and RMSE
- Why used:
  - MAE gives average absolute prediction error.
  - RMSE penalizes large misses more heavily.
- How used:
  - Compare test predictions vs true next-day returns from the holdout split.
- Where used:
  - `lib/metrics.ts` and `app/api/train/route.ts`.

#### Sharpe, Volatility, CAGR, Max Drawdown
- Why used:
  - These collectively evaluate return quality, stability, and downside risk.
- How used:
  - Annualized statistics computed from simulated portfolio return paths.
- Where used:
  - Implemented in `lib/metrics.ts`.
  - Used in `app/api/backtest/route.ts` and optimization outputs.

---

### 5) Backtesting Methodology

#### Time-Based Split (80/20)
- Why used:
  - Prevents look-ahead leakage and keeps chronology intact.
- How used:
  - First 80% is model-fitting context, last 20% is evaluation horizon.
- Where used:
  - `app/api/train/route.ts` and `app/api/backtest/route.ts`.

#### Portfolio Path Simulation
- Why used:
  - Converts static weights into an equity curve for realistic strategy evaluation.
- How used:
  - For each step, compute weighted asset return and compound portfolio value.
- Where used:
  - `app/api/backtest/route.ts`.

#### Baseline Comparisons
- Why used:
  - Validate that model + optimizer add value over simpler alternatives.
- How used:
  - Compares against:
    - Equal-weight allocation.
    - Benchmark (SPY if available, fallback to first ticker).
- Where used:
  - `app/api/backtest/route.ts`.

## Performance Considerations

- **Fast Mode**: CNN uses 5 epochs to stay within Vercel's 10s serverless limit
- **Caching**: In-memory caching reduces redundant API calls
- **Demo Mode**: Deterministic built-in dataset for testing without API limits

## License

MIT

## Author

Built with Next.js 14, TypeScript, and TailwindCSS.
