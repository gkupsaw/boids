export interface GameObject {
    render: (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => void;
}
