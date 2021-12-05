import { WebGLRenderer, PerspectiveCamera, Scene, HemisphereLight, Color } from 'three';

const aspectRatio = 9 / 16;

export class ThreeGame {
    private id: string;
    private paused: boolean;
    private disposed: boolean;

    private renderer!: WebGLRenderer;
    private scene!: Scene;
    private camera!: PerspectiveCamera;

    static readonly CANVAS_ID = '#glCanvas';
    static readonly RENDER_ON_DEMAND = false;
    static readonly SKY_COLOR = 0x0000ff;

    constructor() {
        this.id = `${Math.random()}`;

        this.paused = false;
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
        // General setup
        const canvas = document.querySelector(ThreeGame.CANVAS_ID);

        if (!canvas) {
            throw new Error('No canvas found.');
        }

        this.renderer = new WebGLRenderer({ canvas });
        this.scene = new Scene();
        this.scene.background = new Color(ThreeGame.SKY_COLOR);

        // Camera
        const fov = 75;
        const aspect = aspectRatio;
        const near = 0.1;
        const far = 1000;
        this.camera = new PerspectiveCamera(fov, aspect, near, far);
        this.scene.add(this.camera);

        // Lighting
        const color = 0xffffff;
        const intensity = 1;
        const light = new HemisphereLight(0xcdcdca, color, intensity);
        light.position.set(-1, 2, 4);
        this.scene.add(light);

        this.go();
    };

    private go = () => {
        // Animation logic
        const update = (deltaTime: number) => {};

        // Rendering
        let prevTime = 0,
            renderRequested = false;
        const tick = (time: number) => {
            // Stop rendering if needed
            if (this.paused || ThreeGame.RENDER_ON_DEMAND) return;

            time *= 0.001; // convert time to seconds
            const deltaTime = time - prevTime;
            prevTime = time;

            // Update canvas on window resize
            if (ThreeGame.resizeRendererToDisplaySize(this.renderer)) {
                const canvas = this.renderer.domElement;
                this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
                this.camera.updateProjectionMatrix();
            }

            // Animation
            update(deltaTime);

            // Render the scene
            this.renderer.render(this.scene, this.camera);

            renderRequested = false;

            requestAnimationFrame(tick);
        };

        // Go!
        requestAnimationFrame(tick);
    };

    pause = () => {
        this.paused = true;
    };

    unpause = () => {
        this.paused = false;
        this.go();
    };

    getScene = () => {
        return this.scene;
    };

    dispose = () => {
        if (this.disposed) return;

        console.log(`Disposing three env ${this.id}...`);

        // Stop everything
        this.paused = true;
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
