import * as tf from "@tensorflow/tfjs";
import { FeatureRow, featureRowToArray, computeNormStats, normalizeMatrix, NormStats } from "../finance";

export class CNNRegressor {
    private model: tf.LayersModel | null = null;
    private normStats: NormStats | null = null;

    async build(inputShape: number): Promise<void> {
        this.model = tf.sequential({
            layers: [
                tf.layers.reshape({ inputShape: [inputShape], targetShape: [inputShape, 1] }),
                tf.layers.conv1d({ filters: 32, kernelSize: 3, activation: "relu", padding: "same" }),
                tf.layers.batchNormalization(),
                tf.layers.maxPooling1d({ poolSize: 2 }),
                tf.layers.conv1d({ filters: 16, kernelSize: 3, activation: "relu", padding: "same" }),
                tf.layers.batchNormalization(),
                tf.layers.flatten(),
                tf.layers.dense({ units: 32, activation: "relu" }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 16, activation: "relu" }),
                tf.layers.dense({ units: 1 }),
            ],
        });

        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: "meanSquaredError",
        });
    }

    async fit(X: number[][], y: number[], epochs: number = 15): Promise<void> {
        this.normStats = computeNormStats(X);
        const Xn = normalizeMatrix(X, this.normStats);

        if (!this.model) {
            await this.build(X[0].length);
        }

        const xTensor = tf.tensor2d(Xn);
        const yTensor = tf.tensor2d(y, [y.length, 1]);

        await this.model!.fit(xTensor, yTensor, {
            epochs,
            batchSize: 32,
            verbose: 0,
            shuffle: true,
        });

        xTensor.dispose();
        yTensor.dispose();
    }

    predict(X: number[][]): number[] {
        if (!this.model) return [];
        const Xn = this.normStats ? normalizeMatrix(X, this.normStats) : X;
        const xTensor = tf.tensor2d(Xn);
        const predictions = this.model.predict(xTensor) as tf.Tensor;
        const result = Array.from(predictions.dataSync());
        xTensor.dispose();
        predictions.dispose();
        return result;
    }

    dispose(): void {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
    }
}

export async function trainCNN(features: FeatureRow[], fastMode: boolean = true): Promise<{
    model: CNNRegressor;
}> {
    const X = features.map(f => featureRowToArray(f));
    const y = features.map(f => f.target);
    const model = new CNNRegressor();
    const epochs = fastMode ? 15 : 50;
    await model.fit(X, y, epochs);
    return { model };
}
