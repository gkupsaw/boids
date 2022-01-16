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
