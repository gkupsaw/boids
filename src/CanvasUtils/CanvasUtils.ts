export class CanvasUtils {
    static readonly CANVAS_ID = 'glCanvas';

    private static _canvas: HTMLElement | null = document.querySelector(`#${this.CANVAS_ID}`);
    private static _clientRect = this._canvas?.getBoundingClientRect();

    private static _checkCanvasData = () => {
        if (!this._canvas) {
            this._canvas = document.querySelector(`#${this.CANVAS_ID}`);
        }
        if (!this._clientRect) {
            this._clientRect = this._canvas?.getBoundingClientRect();
        }
    };

    private static _updateClientRect = (ev: UIEvent) => {
        this._clientRect = this._canvas?.getBoundingClientRect();
    };

    static _setupListeners = () => {
        document.addEventListener('resize', this._updateClientRect);
    };

    static getCanvas = () => {
        if (!this._canvas) {
            this._canvas = document.querySelector(`#${this.CANVAS_ID}`);
        }
        return this._canvas;
    };

    static getCanvasDimensions = () => {
        this._checkCanvasData();
        return this._clientRect;
    };

    static dispose = () => {
        document.removeEventListener('resize', this._updateClientRect);
    };
}

CanvasUtils._setupListeners();
