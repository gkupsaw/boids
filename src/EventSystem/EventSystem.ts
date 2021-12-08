export class EventSystem {
    private paused: boolean;
    private onPlayCallback: () => void;

    constructor() {
        this.paused = true;
        this.onPlayCallback = () => {};

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

    private setupListeners = () => {
        window.addEventListener('keydown', this.onKeyDown);
    };

    isPaused = () => {
        return this.paused;
    };

    pause = () => {
        this.paused = true;
    };

    play = () => {
        if (this.paused) {
            this.paused = false;
            this.onPlayCallback();
        }
    };

    onPlay = (cb: () => void) => {
        this.onPlayCallback = cb;
    };

    dispose = () => {
        window.removeEventListener('keydown', this.onKeyDown);
    };
}
