export class Counter {
    private count: number;

    constructor() {
        this.count = 0;
    }

    next = () => this.count++;

    reset = () => (this.count = 0);
}

export const randInRange = (min: number, max: number) => Math.random() * (max - min) + min;
