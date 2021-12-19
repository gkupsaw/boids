export interface GameObject<T> {
    update: (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => void;
    dispose: () => void;
    copy: () => T;
}
