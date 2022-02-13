import { Vector3 } from 'three';
export class Counter {
    private count: number;

    constructor() {
        this.count = 0;
    }

    next = () => this.count++;

    reset = () => (this.count = 0);
}

export const randInRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const randVec3InRange = (min: number, max: number) =>
    new Vector3(randInRange(min, max), randInRange(min, max), randInRange(min, max));

export const shuffleArray = (arr: any[]) => arr.sort(() => 0.5 - Math.random());

// Side-effect of shuffling the original array in-place
export const sampleArray = (arr: any[], n: number, skipShuffle: boolean = false) => {
    if (n < 0) return [];

    if (n >= arr.length) return arr;

    if (!skipShuffle) shuffleArray(arr);

    const sampled = arr.slice(0, n);

    return sampled;
};
