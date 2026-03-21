import { FeatureRow, featureRowToArray } from "../finance";

interface DecisionTree {
    featureIndex?: number;
    threshold?: number;
    left?: DecisionTree;
    right?: DecisionTree;
    value?: number;
}

export class RandomForestRegressor {
    private trees: DecisionTree[] = [];
    private nTrees: number;
    private maxDepth: number;
    private minSamplesSplit: number;

    constructor(nTrees: number = 100, maxDepth: number = 10, minSamplesSplit: number = 10) {
        this.nTrees = nTrees;
        this.maxDepth = maxDepth;
        this.minSamplesSplit = minSamplesSplit;
    }

    private buildTree(X: number[][], y: number[], depth: number): DecisionTree {
        const n = X.length;

        if (depth >= this.maxDepth || n < this.minSamplesSplit) {
            const value = y.reduce((a, b) => a + b, 0) / y.length;
            return { value };
        }

        let bestFeature = 0;
        let bestThreshold = 0;
        let bestScore = Infinity;

        const nFeatures = X[0].length;
        const featuresToTry = Math.floor(Math.sqrt(nFeatures));

        const features = Array.from({ length: nFeatures }, (_, i) => i)
            .sort(() => Math.random() - 0.5)
            .slice(0, featuresToTry);

        for (const feature of features) {
            const values = X.map(row => row[feature]).sort((a, b) => a - b);
            const uniqueValues = [...new Set(values)];

            for (let i = 0; i < uniqueValues.length - 1; i++) {
                const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

                const leftY: number[] = [];
                const rightY: number[] = [];

                for (let j = 0; j < n; j++) {
                    if (X[j][feature] <= threshold) {
                        leftY.push(y[j]);
                    } else {
                        rightY.push(y[j]);
                    }
                }

                if (leftY.length === 0 || rightY.length === 0) continue;

                const leftMean = leftY.reduce((a, b) => a + b, 0) / leftY.length;
                const rightMean = rightY.reduce((a, b) => a + b, 0) / rightY.length;

                const score = leftY.reduce((sum, val) => sum + (val - leftMean) ** 2, 0) +
                    rightY.reduce((sum, val) => sum + (val - rightMean) ** 2, 0);

                if (score < bestScore) {
                    bestScore = score;
                    bestFeature = feature;
                    bestThreshold = threshold;
                }
            }
        }

        const leftX: number[][] = [];
        const leftY: number[] = [];
        const rightX: number[][] = [];
        const rightY: number[] = [];

        for (let i = 0; i < n; i++) {
            if (X[i][bestFeature] <= bestThreshold) {
                leftX.push(X[i]);
                leftY.push(y[i]);
            } else {
                rightX.push(X[i]);
                rightY.push(y[i]);
            }
        }

        return {
            featureIndex: bestFeature,
            threshold: bestThreshold,
            left: this.buildTree(leftX, leftY, depth + 1),
            right: this.buildTree(rightX, rightY, depth + 1),
        };
    }

    private predictTree(tree: DecisionTree, x: number[]): number {
        if (tree.value !== undefined) {
            return tree.value;
        }

        if (x[tree.featureIndex!] <= tree.threshold!) {
            return this.predictTree(tree.left!, x);
        } else {
            return this.predictTree(tree.right!, x);
        }
    }

    fit(X: number[][], y: number[]): void {
        this.trees = [];
        for (let i = 0; i < this.nTrees; i++) {
            const indices = Array.from({ length: X.length }, () => Math.floor(Math.random() * X.length));
            const bootstrapX = indices.map(idx => X[idx]);
            const bootstrapY = indices.map(idx => y[idx]);
            this.trees.push(this.buildTree(bootstrapX, bootstrapY, 0));
        }
    }

    predict(X: number[][]): number[] {
        return X.map(x => {
            const predictions = this.trees.map(tree => this.predictTree(tree, x));
            return predictions.reduce((a, b) => a + b, 0) / predictions.length;
        });
    }
}

export function trainRandomForest(features: FeatureRow[], fast: boolean = false): {
    model: RandomForestRegressor;
} {
    const X = fast
        ? features.map(f => [f.return, f.ma5, f.ma10, f.ma20, f.volatility10, f.volatility20, f.momentum5, f.momentum10])
        : features.map(f => featureRowToArray(f));
    const y = features.map(f => f.target);
    const model = fast
        ? new RandomForestRegressor(10, 5, 5)
        : new RandomForestRegressor(100, 10, 10);
    model.fit(X, y);
    return { model };
}
