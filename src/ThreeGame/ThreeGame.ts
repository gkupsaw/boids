import { RendererStats } from './debug/RendererStats';
import { WebGLRenderer, OrthographicCamera, Scene, HemisphereLight, Color, AxesHelper } from 'three';
import { GUI } from 'dat.gui';

import { EventSystem } from './../EventSystem/EventSystem';
import { SETTINGS } from '../Settings/Settings';
import { GameObject } from './../types/GameObject';
import { CanvasUtils } from '../CanvasUtils/CanvasUtils';

export class ThreeGame {
    private gui!: GUI;
    private rendererStats!: {
        domElement: HTMLElement;
        update: (renderer: WebGLRenderer) => void;
        dispose: () => void;
    };

    private id: string;
    private disposed: boolean;

    private renderer!: WebGLRenderer;
    private scene!: Scene;
    private camera!: OrthographicCamera;
    private gameObjects: GameObject[];

    static readonly SKY_COLOR = '#282c34';

    constructor() {
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
        const canvas = CanvasUtils.getCanvas();

        if (!canvas) {
            throw new Error(`No canvas found (selector #${CanvasUtils.CANVAS_ID})`);
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

    getRenderer = () => {
        return this.renderer;
    };

    getScene = () => {
        return this.scene;
    };

    start = (esys: EventSystem) => {
        if (!esys.isPaused()) {
            throw new Error('Attempted to start game that is already running.');
        }

        let isRendering = false,
            prevElapsed = 0,
            prevTick = 0;

        const render = (elapsed: number) => {
            if (esys.isPaused()) {
                isRendering = false;
                return;
            }
            // Convert to seconds
            elapsed /= 1000;

            // Skip large gaps between renders
            if (elapsed - prevElapsed > 1e-1) {
                prevElapsed = elapsed;
                return requestAnimationFrame(render);
            }

            // Calculate delta time
            const tick = elapsed - prevElapsed;

            // Update canvas on window resize
            if (ThreeGame.resizeRendererToDisplaySize(this.renderer)) {
                this.camera.updateProjectionMatrix();
            }

            // Update game objects
            this.gameObjects.forEach((o) => o.update(elapsed, tick, prevElapsed, prevTick));

            // Render the scene
            this.renderer.render(this.scene, this.camera);

            // Debug
            this.rendererStats?.update(this.renderer);

            // Track previous values
            prevElapsed = elapsed;
            prevTick = tick;

            requestAnimationFrame(render);
        };

        esys.addEventListener('play', () => {
            if (isRendering) {
                throw new Error('Attempted to initiate multiple render loops.');
            }
            isRendering = true;
            requestAnimationFrame(render);
        });

        esys.play();
    };

    addGameObject = (o: GameObject) => {
        this.gameObjects.push(o);
    };

    withUI = () => {
        this.gui = new GUI();

        Object.keys(SETTINGS).forEach((section) => {
            const folder = this.gui.addFolder(section.slice(0, 1).toUpperCase().concat(section.slice(1)));
            Object.keys(SETTINGS[section]).forEach((setting) => {
                folder.add(
                    SETTINGS[section],
                    setting,
                    0,
                    SETTINGS[section][setting] < 0 ? 1 : SETTINGS[section][setting] * 10
                );
            });
            folder.open();
        });

        return this;
    };

    withRendererStats = () => {
        this.rendererStats = RendererStats();
        console.log(this.rendererStats);

        return this;
    };

    withDebug = () => {
        this.scene.add(new AxesHelper(1));
        this.withRendererStats();

        return this;
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
        this.gui?.destroy();
        this.rendererStats?.dispose();
    };
}
