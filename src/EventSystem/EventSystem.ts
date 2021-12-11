import { EventDispatcher } from './EventDispatcher';

enum CustomEvent {
    pause = 'pause',
    play = 'play',
    mousemove = 'mousemove',
}

const _pauseEvent = { type: CustomEvent.pause };
const _playEvent = { type: CustomEvent.play };
const _mousemoveEvent = { type: CustomEvent.mousemove };

export class EventSystem extends EventDispatcher {
    private rootEl: HTMLElement;
    private paused: boolean;

    constructor(rootEl: HTMLElement) {
        super();

        this.rootEl = rootEl;
        this.paused = true;

        this.setupListeners();
    }

    private onKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
            case 'p':
                if (this.paused) {
                    this.play();
                } else {
                    this.pause();
                }
                break;
            default:
                break;
        }
    };

    private onMouseMove = (e: MouseEvent) => {
        this.dispatchEvent({ ..._mousemoveEvent, x: e.x, y: e.y });
    };

    private setupListeners = () => {
        this.rootEl.addEventListener('keydown', this.onKeyDown, false);
        this.rootEl.addEventListener('mousemove', this.onMouseMove, false);
    };

    isPaused = () => {
        return this.paused;
    };

    pause = () => {
        if (!this.paused) {
            this.paused = true;
            this.dispatchEvent(_pauseEvent);
        }
    };

    play = () => {
        if (this.paused) {
            this.paused = false;
            this.dispatchEvent(_playEvent);
        }
    };

    dispose = () => {
        this.rootEl.removeEventListener('keydown', this.onKeyDown);
        this.rootEl.removeEventListener('mousemove', this.onMouseMove);
    };
}
