export interface PriceData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface TickerData {
    ticker: string;
    prices: PriceData[];
}

export interface FeatureRow {
    date: string;
    ticker: string;
    close: number;
    return: number;
    ma5: number;
    ma10: number;
    ma20: number;
    volatility10: number;
    volatility20: number;
    momentum5: number;
    momentum10: number;
    rsi14: number;
    macdHist: number;
    bollingerWidth: number;
    volumeRatio: number;
    target: number;
}

export interface NormStats {
    means: number[];
    stds: number[];
}

export function featureRowToArray(f: FeatureRow): number[] {
    return [
        f.return, f.ma5, f.ma10, f.ma20,
        f.volatility10, f.volatility20, f.momentum5, f.momentum10,
        f.rsi14, f.macdHist, f.bollingerWidth, f.volumeRatio,
    ];
}

export function computeNormStats(X: number[][]): NormStats {
    if (X.length === 0) return { means: [], stds: [] };
    const n = X[0].length;
    const means: number[] = new Array(n).fill(0);
    const stds: number[] = new Array(n).fill(1);
    for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let i = 0; i < X.length; i++) sum += X[i][j];
        means[j] = sum / X.length;
        let varSum = 0;
        for (let i = 0; i < X.length; i++) varSum += (X[i][j] - means[j]) ** 2;
        stds[j] = Math.sqrt(varSum / X.length) || 1;
    }
    return { means, stds };
}

export function normalizeMatrix(X: number[][], stats: NormStats): number[][] {
    return X.map(row => row.map((val, j) => (val - stats.means[j]) / stats.stds[j]));
}

export function calculateReturns(prices: number[]): number[] {
    const returns: number[] = [0];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
}

export function calculateMA(prices: number[], window: number): number[] {
    const ma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < window - 1) {
            ma.push(prices[i]);
        } else {
            const sum = prices.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
            ma.push(sum / window);
        }
    }
    return ma;
}

export function calculateVolatility(returns: number[], window: number): number[] {
    const volatility: number[] = [];
    for (let i = 0; i < returns.length; i++) {
        if (i < window - 1) {
            volatility.push(0);
        } else {
            const slice = returns.slice(i - window + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
            const variance = slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / slice.length;
            volatility.push(Math.sqrt(variance));
        }
    }
    return volatility;
}

export function calculateMomentum(returns: number[], window: number): number[] {
    const momentum: number[] = [];
    for (let i = 0; i < returns.length; i++) {
        if (i < window) {
            momentum.push(0);
        } else {
            momentum.push(returns.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0));
        }
    }
    return momentum;
}

export function calculateEMA(values: number[], period: number): number[] {
    const ema: number[] = [values[0]];
    const k = 2 / (period + 1);
    for (let i = 1; i < values.length; i++) {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
    const rsi: number[] = new Array(closes.length).fill(0.5);
    if (closes.length < period + 1) return rsi;
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        gains.push(diff > 0 ? diff : 0);
        losses.push(diff < 0 ? -diff : 0);
    }
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    rsi[period] = avgLoss === 0 ? 1 : 1 - 1 / (1 + avgGain / avgLoss);
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        rsi[i + 1] = avgLoss === 0 ? 1 : 1 - 1 / (1 + avgGain / avgLoss);
    }
    return rsi;
}

export function calculateMACD(closes: number[]): { hist: number[] } {
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calculateEMA(macdLine, 9);
    const hist = macdLine.map((v, i) => (v - signalLine[i]) / (closes[i] || 1));
    return { hist };
}

export function calculateBollingerWidth(closes: number[], period: number = 20): number[] {
    const width: number[] = new Array(closes.length).fill(0);
    for (let i = period - 1; i < closes.length; i++) {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
        const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
        width[i] = mean === 0 ? 0 : (4 * std) / mean;
    }
    return width;
}

export function calculateVolumeRatio(volumes: number[], period: number = 20): number[] {
    const ratio: number[] = new Array(volumes.length).fill(1);
    for (let i = period - 1; i < volumes.length; i++) {
        const avg = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        ratio[i] = avg === 0 ? 1 : volumes[i] / avg;
    }
    return ratio;
}

export function engineerFeatures(tickerData: TickerData): FeatureRow[] {
    const { ticker, prices } = tickerData;
    const closes = prices.map(p => p.close);
    const volumes = prices.map(p => p.volume);
    const returns = calculateReturns(closes);
    const ma5raw = calculateMA(closes, 5);
    const ma10raw = calculateMA(closes, 10);
    const ma20raw = calculateMA(closes, 20);
    const volatility10 = calculateVolatility(returns, 10);
    const volatility20 = calculateVolatility(returns, 20);
    const momentum5 = calculateMomentum(returns, 5);
    const momentum10 = calculateMomentum(returns, 10);
    const rsi14 = calculateRSI(closes);
    const { hist: macdHist } = calculateMACD(closes);
    const bollingerWidth = calculateBollingerWidth(closes);
    const volumeRatio = calculateVolumeRatio(volumes);

    const features: FeatureRow[] = [];
    for (let i = 0; i < prices.length - 1; i++) {
        features.push({
            date: prices[i].date,
            ticker,
            close: closes[i],
            return: returns[i],
            ma5: ma5raw[i] === 0 ? 1 : closes[i] / ma5raw[i],
            ma10: ma10raw[i] === 0 ? 1 : closes[i] / ma10raw[i],
            ma20: ma20raw[i] === 0 ? 1 : closes[i] / ma20raw[i],
            volatility10: volatility10[i],
            volatility20: volatility20[i],
            momentum5: momentum5[i],
            momentum10: momentum10[i],
            rsi14: rsi14[i],
            macdHist: macdHist[i],
            bollingerWidth: bollingerWidth[i],
            volumeRatio: volumeRatio[i],
            target: returns[i + 1],
        });
    }

    return features.slice(35);
}

export function alignTickerData(tickersData: TickerData[]): TickerData[] {
    if (tickersData.length === 0) return [];
    const allDates = new Set<string>();
    tickersData.forEach(td => td.prices.forEach(p => allDates.add(p.date)));
    const commonDates = Array.from(allDates)
        .filter(date => tickersData.every(td => td.prices.some(p => p.date === date)))
        .sort();
    return tickersData.map(td => ({
        ticker: td.ticker,
        prices: commonDates.map(date => td.prices.find(p => p.date === date)!),
    }));
}

export function calculateCovarianceMatrix(tickersData: TickerData[]): number[][] {
    const n = tickersData.length;
    const returns = tickersData.map(td => {
        const closes = td.prices.map(p => p.close);
        return calculateReturns(closes);
    });
    const means = returns.map(r => r.reduce((a, b) => a + b, 0) / r.length);
    const cov: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < returns[i].length; k++) {
                sum += (returns[i][k] - means[i]) * (returns[j][k] - means[j]);
            }
            cov[i][j] = sum / (returns[i].length - 1);
        }
    }
    return cov;
}

function mulberry32(seed: number): () => number {
    let t = seed | 0;
    return () => {
        t = (t + 0x6D2B79F5) | 0;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

function generateDemoData(ticker: string, startPrice: number, seed: number, days: number = 252): PriceData[] {
    const rand = mulberry32(seed);
    const data: PriceData[] = [];
    let price = startPrice;
    const startDate = new Date("2021-01-04");
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const dailyReturn = (rand() - 0.48) * 0.03;
        price = price * (1 + dailyReturn);
        const open = price * (1 + (rand() - 0.5) * 0.01);
        const close = price;
        const high = Math.max(open, close) * (1 + rand() * 0.01);
        const low = Math.min(open, close) * (1 - rand() * 0.01);
        const volume = Math.floor(50000000 + rand() * 50000000);
        data.push({
            date: date.toISOString().split("T")[0],
            open, high, low, close, volume,
        });
    }
    return data;
}

export const DEMO_DATA: Record<string, PriceData[]> = {
    AAPL: generateDemoData("AAPL", 130, 1001),
    MSFT: generateDemoData("MSFT", 220, 2002),
    GOOG: generateDemoData("GOOG", 1750, 3003),
    TSLA: generateDemoData("TSLA", 730, 4004),
    SPY: generateDemoData("SPY", 370, 5005),
};
