export interface SAParams {
    maxWeight: number;
    riskFreeRate: number;
    lambda: number;
    objective: "sharpe" | "minVol" | "maxReturn";
}

export interface SAResult {
    weights: number[];
    expectedReturn: number;
    volatility: number;
    sharpe: number;
    iterations: number;
}

function projectToSimplex(weights: number[], maxWeight: number): number[] {
    const n = weights.length;
    let w = weights.map(x => Math.max(0, Math.min(x, maxWeight)));

    const sum = w.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) < 1e-6) return w;

    w = w.map(x => x / sum);

    for (let iter = 0; iter < 100; iter++) {
        const violations = w.filter(x => x > maxWeight);
        if (violations.length === 0) break;

        const excess = w.reduce((sum, x) => sum + Math.max(0, x - maxWeight), 0);
        const numBelow = w.filter(x => x < maxWeight).length;

        if (numBelow === 0) {
            return Array(n).fill(1 / n);
        }

        const adjustment = excess / numBelow;

        w = w.map(x => {
            if (x > maxWeight) return maxWeight;
            return x + adjustment;
        });

        const newSum = w.reduce((a, b) => a + b, 0);
        w = w.map(x => x / newSum);
    }

    return w;
}

function calculateObjective(
    weights: number[],
    expectedReturns: number[],
    covMatrix: number[][],
    params: SAParams
): number {
    const ret = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0) * 252;

    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
        for (let j = 0; j < weights.length; j++) {
            variance += weights[i] * weights[j] * covMatrix[i][j];
        }
    }
    const vol = Math.sqrt(variance * 252);

    if (params.objective === "sharpe") {
        return vol === 0 ? 0 : -(ret - params.riskFreeRate) / vol;
    } else if (params.objective === "minVol") {
        return vol;
    } else {
        return -(ret - params.lambda * vol);
    }
}

export function simulatedAnnealing(
    expectedReturns: number[],
    covMatrix: number[][],
    params: SAParams
): SAResult {
    const n = expectedReturns.length;

    let weights = Array(n).fill(1 / n);
    weights = projectToSimplex(weights, params.maxWeight);

    let bestWeights = [...weights];
    let bestScore = calculateObjective(weights, expectedReturns, covMatrix, params);

    let temperature = 1.0;
    const coolingRate = 0.99;
    const minTemperature = 0.0001;
    const maxIterations = 5000;
    let iterations = 0;

    while (temperature > minTemperature && iterations < maxIterations) {
        const newWeights = [...weights];

        const numToPerturb = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numToPerturb; i++) {
            const idx = Math.floor(Math.random() * n);
            const perturbation = (Math.random() - 0.5) * 0.2 * temperature;
            newWeights[idx] += perturbation;
        }

        const projectedWeights = projectToSimplex(newWeights, params.maxWeight);
        const newScore = calculateObjective(projectedWeights, expectedReturns, covMatrix, params);

        const delta = newScore - bestScore;
        const acceptanceProbability = delta < 0 ? 1 : Math.exp(-delta / temperature);

        if (Math.random() < acceptanceProbability) {
            weights = projectedWeights;
            if (newScore < bestScore) {
                bestScore = newScore;
                bestWeights = [...projectedWeights];
            }
        }

        temperature *= coolingRate;
        iterations++;
    }

    const expectedReturn = bestWeights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0) * 252;

    let variance = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            variance += bestWeights[i] * bestWeights[j] * covMatrix[i][j];
        }
    }
    const volatility = Math.sqrt(variance * 252);

    const sharpe = volatility === 0 ? 0 : (expectedReturn - params.riskFreeRate) / volatility;

    return {
        weights: bestWeights,
        expectedReturn,
        volatility,
        sharpe,
        iterations,
    };
}
