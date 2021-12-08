import { EventSystem } from './../EventSystem/EventSystem';
import { GameObject } from './../types/GameObject';
import { WebGLRenderer, OrthographicCamera, Scene, HemisphereLight, Color } from 'three';

export class ThreeGame {
    private esys: EventSystem;

    private id: string;
    private disposed: boolean;

    private renderer!: WebGLRenderer;
    private scene!: Scene;
    private camera!: OrthographicCamera;
    private gameObjects: GameObject[];

    static readonly CANVAS_ID = 'glCanvas';
    static readonly SKY_COLOR = '#282c34';

    constructor(esys: EventSystem) {
        this.esys = esys;

        this.id = `${Math.floor(Math.random() * 100000)}`;
        this.disposed = false;
        this.gameObjects = [];

        this.setup();
    }

    private static resizeRendererToDisplaySize(renderer: WebGLRenderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    private setup = () => {
        console.log(`Initializing three env ${this.id}...`);

        // General setup
        const canvas = document.querySelector(`#${ThreeGame.CANVAS_ID}`);

        if (!canvas) {
            throw new Error(`No canvas found (selector #${ThreeGame.CANVAS_ID})`);
        }

        this.renderer = new WebGLRenderer({ canvas });

        // Scene
        this.setupScene();

        // Lights
        this.setupLights();

        // Camera
        this.setupCamera();
    };

    private setupScene = () => {
        this.scene = new Scene();
        this.scene.background = new Color(ThreeGame.SKY_COLOR);
    };

    private setupLights = () => {
        const color = 0xffffff;
        const intensity = 1;
        const light = new HemisphereLight(0xcdcdca, color, intensity);
        light.position.set(-1, 2, 4);
        this.scene.add(light);
    };

    private setupCamera = () => {
        this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.scene.add(this.camera);
    };

    // API

    start = () => {
        if (!this.esys.isPaused()) {
            return console.error('Attempted to start game that is already running.');
        }

        let isRendering = false,
            prevElapsed = 0,
            prevTick = 0;

        const render = (elapsed: number) => {
            if (this.esys.isPaused()) {
                isRendering = false;
                prevElapsed = 0;
                return;
            }

            // Convert to seconds
            elapsed /= 1000;

            const tick = elapsed - prevElapsed;

            // Update canvas on window resize
            if (ThreeGame.resizeRendererToDisplaySize(this.renderer)) {
                this.camera.updateProjectionMatrix();
            }

            // Update game objects
            this.gameObjects.forEach((o) => o.update(elapsed, tick, prevElapsed, prevTick));

            // Render the scene
            this.renderer.render(this.scene, this.camera);

            // Track previous values
            prevElapsed = elapsed;
            prevTick = tick;

            requestAnimationFrame(render);
        };

        this.esys.onPlay(() => {
            if (isRendering) {
                throw new Error('Attempted to initiate multiple render loops.');
            }
            isRendering = true;
            requestAnimationFrame(render);
        });
        this.esys.play();
    };

    addGameObject = (o: GameObject) => {
        this.gameObjects.push(o);
    };

    getScene = () => {
        return this.scene;
    };

    dispose = () => {
        if (this.disposed) return;

        console.log(`Disposing three env ${this.id}...`);

        // Stop everything
        this.disposed = true;

        // Free up resources
        if (this.renderer) {
            this.renderer.renderLists.dispose();
            this.renderer.dispose();
        }
        if (this.scene) {
            this.scene.clear();
        }

        this.gameObjects.forEach((o) => o.dispose());
        this.esys.dispose();
    };
}
