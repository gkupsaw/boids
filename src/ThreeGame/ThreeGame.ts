import { WebGLRenderer, OrthographicCamera, Scene, HemisphereLight, Color } from 'three';

export class ThreeGame {
    private id: string;
    private disposed: boolean;

    private renderer!: WebGLRenderer;
    private scene!: Scene;
    private camera!: OrthographicCamera;

    static readonly CANVAS_ID = 'glCanvas';
    static readonly SKY_COLOR = '#282c34';

    constructor() {
        this.id = `${Math.floor(Math.random() * 100000)}`;

        this.disposed = false;

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

    private update = (deltaTime: number) => {};

    // API

    render = (elapsed: number, tick: number) => {
        // Update canvas on window resize
        if (ThreeGame.resizeRendererToDisplaySize(this.renderer)) {
            this.camera.updateProjectionMatrix();
        }

        this.update(tick);

        // Render the scene
        this.renderer.render(this.scene, this.camera);
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
    };
}
