export interface GameObject {
    update: (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => void;
    dispose: () => void;
}
