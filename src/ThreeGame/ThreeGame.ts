import { ExternalSettingsNames, isInternalSetting } from './../Settings/Settings';
import {
    WebGLRenderer,
    OrthographicCamera,
    Scene,
    HemisphereLight,
    Color,
    AxesHelper,
    PerspectiveCamera,
    Light,
} from 'three';
import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { EventSystem } from '../EventSystem/EventSystem';
import { SETTINGS, SettingSection } from '../Settings/Settings';
import { GameObject } from '../types/GameObject';
import { CanvasUtils } from '../CanvasUtils/CanvasUtils';
import { RendererStats, RendererStatsObject } from './debug/RendererStats';

export class ThreeGame {
    private gui!: GUI;
    private rendererStats!: RendererStatsObject;

    private readonly id: string;
    private disposed: boolean;

    private renderer!: WebGLRenderer;
    private scene!: Scene;
    private lights!: Light[];
    private controls!: OrbitControls;
    private camera!: PerspectiveCamera | OrthographicCamera;
    private readonly gameObjects: GameObject<any>[];

    static readonly SKY_COLOR = SETTINGS.bean.envColor; //'#282c34';

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
        this.lights = [];

        const color = 0xffffff;
        const intensity = 1;
        const sun = new HemisphereLight(0xcdcdca, color, intensity);
        sun.position.set(-1, 2, 4);
        this.lights.push(sun);

        this.scene.add(...this.lights);
    };

    private setupCamera = () => {
        if (SETTINGS.global.is3D) {
            this.camera = new PerspectiveCamera();
            this.camera.position.z += 2;
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.scene.add(this.camera);
        } else {
            this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
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
            if (!esys.isTimePaused()) {
                this.gameObjects.forEach((o) => o.update(elapsed, tick, prevElapsed, prevTick));
            }

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

    addGameObject = (o: GameObject<any>) => {
        this.gameObjects.push(o);
    };

    withUI = () => {
        this.gui = new GUI();

        Object.values(SettingSection).forEach((section) => {
            const folder = this.gui.addFolder(section.slice(0, 1).toUpperCase().concat(section.slice(1)));
            Object.keys(SETTINGS[section]).forEach((setting) => {
                if (!isInternalSetting(setting)) {
                    if (setting === ExternalSettingsNames.is3D) {
                        folder.add(SETTINGS[section], setting, 0, 1).onChange(this.toggle3D);
                    } else if (setting === ExternalSettingsNames.envColor) {
                        folder.addColor(SETTINGS[section], setting).onChange((hex: number) => {
                            this.scene.background = new Color(hex);
                            this.lights.forEach((l) => l.color.setHex(hex));
                        });
                    } else {
                        folder.add(SETTINGS[section], setting, 0, 1);
                    }
                }
            });
            folder.open();
        });

        return this;
    };

    withRendererStats = () => {
        this.rendererStats = RendererStats();

        return this;
    };

    withDebug = () => {
        this.scene.add(new AxesHelper(1));

        return this;
    };

    toggle3D = () => {
        this.scene.remove(this.camera);

        this.setupCamera();

        this.gameObjects.forEach((o, i) => {
            this.gameObjects[i] = o.copy();
            o.dispose();
        });
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
