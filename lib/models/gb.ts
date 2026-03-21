import { FeatureRow, featureRowToArray } from "../finance";

interface GBTree {
    featureIndex: number;
    threshold: number;
    leftValue?: number;
    rightValue?: number;
    left?: GBTree | null;
    right?: GBTree | null;
}

export class GradientBoostingRegressor {
    private trees: GBTree[] = [];
    private learningRate: number;
    private nEstimators: number;
    private maxDepth: number;
    private initialPrediction: number = 0;

    constructor(nEstimators: number = 100, learningRate: number = 0.05, maxDepth: number = 5) {
        this.nEstimators = nEstimators;
        this.learningRate = learningRate;
        this.maxDepth = maxDepth;
    }

    private buildTree(X: number[][], residuals: number[], depth: number): GBTree | null {
        const n = X.length;

        if (depth >= this.maxDepth || n < 5) {
            return null;
        }

        let bestFeature = 0;
        let bestThreshold = 0;
        let bestScore = Infinity;

        const nFeatures = X[0].length;

        for (let feature = 0; feature < nFeatures; feature++) {
            const values = X.map(row => row[feature]).sort((a, b) => a - b);
            const uniqueValues = [...new Set(values)];

            for (let i = 0; i < uniqueValues.length - 1; i++) {
                const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

                const leftResiduals: number[] = [];
                const rightResiduals: number[] = [];

                for (let j = 0; j < n; j++) {
                    if (X[j][feature] <= threshold) {
                        leftResiduals.push(residuals[j]);
                    } else {
                        rightResiduals.push(residuals[j]);
                    }
                }

                if (leftResiduals.length === 0 || rightResiduals.length === 0) continue;

                const leftMean = leftResiduals.reduce((a, b) => a + b, 0) / leftResiduals.length;
                const rightMean = rightResiduals.reduce((a, b) => a + b, 0) / rightResiduals.length;

                const score = leftResiduals.reduce((sum, val) => sum + (val - leftMean) ** 2, 0) +
                    rightResiduals.reduce((sum, val) => sum + (val - rightMean) ** 2, 0);

                if (score < bestScore) {
                    bestScore = score;
                    bestFeature = feature;
                    bestThreshold = threshold;
                }
            }
        }

        const leftX: number[][] = [];
        const leftResiduals: number[] = [];
        const rightX: number[][] = [];
        const rightResiduals: number[] = [];

        for (let i = 0; i < n; i++) {
            if (X[i][bestFeature] <= bestThreshold) {
                leftX.push(X[i]);
                leftResiduals.push(residuals[i]);
            } else {
                rightX.push(X[i]);
                rightResiduals.push(residuals[i]);
            }
        }

        const node: GBTree = {
            featureIndex: bestFeature,
            threshold: bestThreshold,
        };

        if (leftX.length > 0 && depth < this.maxDepth - 1) {
            node.left = this.buildTree(leftX, leftResiduals, depth + 1);
            if (!node.left) {
                node.leftValue = leftResiduals.reduce((a, b) => a + b, 0) / leftResiduals.length;
            }
        } else if (leftX.length > 0) {
            node.leftValue = leftResiduals.reduce((a, b) => a + b, 0) / leftResiduals.length;
        }

        if (rightX.length > 0 && depth < this.maxDepth - 1) {
            node.right = this.buildTree(rightX, rightResiduals, depth + 1);
            if (!node.right) {
                node.rightValue = rightResiduals.reduce((a, b) => a + b, 0) / rightResiduals.length;
            }
        } else if (rightX.length > 0) {
            node.rightValue = rightResiduals.reduce((a, b) => a + b, 0) / rightResiduals.length;
        }

        return node;
    }

    private predictTree(tree: GBTree | null, x: number[]): number {
        if (!tree) return 0;

        if (x[tree.featureIndex] <= tree.threshold) {
            if (tree.left) {
                return this.predictTree(tree.left, x);
            }
            return tree.leftValue || 0;
        } else {
            if (tree.right) {
                return this.predictTree(tree.right, x);
            }
            return tree.rightValue || 0;
        }
    }

    fit(X: number[][], y: number[]): void {
        this.initialPrediction = y.reduce((a, b) => a + b, 0) / y.length;
        let predictions = Array(y.length).fill(this.initialPrediction);

        for (let i = 0; i < this.nEstimators; i++) {
            const residuals = y.map((val, idx) => val - predictions[idx]);
            const tree = this.buildTree(X, residuals, 0);
            if (tree) {
                this.trees.push(tree);
                predictions = predictions.map((pred, idx) =>
                    pred + this.learningRate * this.predictTree(tree, X[idx])
                );
            }
        }
    }

    predict(X: number[][]): number[] {
        return X.map(x => {
            let prediction = this.initialPrediction;
            for (const tree of this.trees) {
                prediction += this.learningRate * this.predictTree(tree, x);
            }
            return prediction;
        });
    }
}

export function trainGradientBoosting(features: FeatureRow[], fast: boolean = false): {
    model: GradientBoostingRegressor;
} {
    const X = fast
        ? features.map(f => [f.return, f.ma5, f.ma10, f.ma20, f.volatility10, f.volatility20, f.momentum5, f.momentum10])
        : features.map(f => featureRowToArray(f));
    const y = features.map(f => f.target);
    const model = fast
        ? new GradientBoostingRegressor(10, 0.1, 3)
        : new GradientBoostingRegressor(100, 0.05, 5);
    model.fit(X, y);
    return { model };
}
