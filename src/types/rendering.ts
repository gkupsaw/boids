export interface Renderable {
    render: (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => void;
}
