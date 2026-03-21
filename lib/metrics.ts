export function calculateMAE(actual: number[], predicted: number[]): number {
    if (actual.length !== predicted.length || actual.length === 0) return 0;
    const sum = actual.reduce((acc, val, i) => acc + Math.abs(val - predicted[i]), 0);
    return sum / actual.length;
}

export function calculateRMSE(actual: number[], predicted: number[]): number {
    if (actual.length !== predicted.length || actual.length === 0) return 0;
    const sum = actual.reduce((acc, val, i) => acc + Math.pow(val - predicted[i], 2), 0);
    return Math.sqrt(sum / actual.length);
}

export function calculateSharpe(returns: number[], riskFreeRate: number = 0): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    if (std === 0) return 0;
    return (mean * 252 - riskFreeRate) / (std * Math.sqrt(252));
}

export function calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252);
}

export function calculateCAGR(values: number[]): number {
    if (values.length < 2) return 0;
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const years = values.length / 252;
    return Math.pow(endValue / startValue, 1 / years) - 1;
}

export function calculateMaxDrawdown(values: number[]): number {
    if (values.length === 0) return 0;
    let maxDrawdown = 0;
    let peak = values[0];

    for (const value of values) {
        if (value > peak) {
            peak = value;
        }
        const drawdown = (peak - value) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    return maxDrawdown;
}

export function calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
    return weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
}

export function calculatePortfolioVolatility(weights: number[], covMatrix: number[][]): number {
    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
        for (let j = 0; j < weights.length; j++) {
            variance += weights[i] * weights[j] * covMatrix[i][j];
        }
    }
    return Math.sqrt(variance * 252);
}

export function calculatePortfolioSharpe(
    weights: number[],
    expectedReturns: number[],
    covMatrix: number[][],
    riskFreeRate: number
): number {
    const ret = calculatePortfolioReturn(weights, expectedReturns) * 252;
    const vol = calculatePortfolioVolatility(weights, covMatrix);
    if (vol === 0) return 0;
    return (ret - riskFreeRate) / vol;
}
