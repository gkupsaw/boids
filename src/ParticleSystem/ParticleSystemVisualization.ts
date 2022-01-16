import {
    BoxGeometry,
    ColorRepresentation,
    LineBasicMaterial,
    Material,
    Mesh,
    Object3D,
    Vector3,
    MeshBasicMaterial,
    SphereGeometry,
    ArrowHelper,
    Euler,
    Color,
} from 'three';

import { Visualization } from '../types/Visualization';
import { ParticleId } from './ParticleSystemTypes';
import { EPSILON } from '../Util/math';

type ParticleSystemVisualizationOptions = {
    color?: ColorRepresentation;
    opacity?: number;
};

export class ParticleSystemVisualization implements Visualization {
    private readonly parent: Object3D;
    private readonly size: number;
    private readonly particleSize: number;
    private readonly color: ColorRepresentation | undefined;
    private readonly opacity: number;

    private boundary!: Mesh;
    private pointHighlight!: Mesh;
    private forceColorMap!: Map<string, ColorRepresentation>;
    private forces!: Map<ParticleId, Map<string, ArrowHelper>>;

    constructor(
        parent: Object3D,
        size: number,
        particleSize: number,
        options: ParticleSystemVisualizationOptions = {}
    ) {
        this.parent = parent;
        this.size = size;
        this.particleSize = particleSize;
        this.color = options.color;
        this.opacity = options.opacity ?? 1;

        return this;
    }

    withBoundaryVisualization = () => {
        if (this.boundary) this.disposeBoundary();

        const geo = new BoxGeometry(this.size, this.size, this.size);

        const mat = new LineBasicMaterial({ color: this.color ?? 0x000000 });
        mat.transparent = true;
        mat.opacity = this.opacity;

        const boundary = new Mesh(geo, mat);
        this.parent.add(boundary);

        this.boundary = boundary;

        return this;
    };

    withPointHighlight = () => {
        if (this.pointHighlight) this.disposePointHighlight();

        const mat = new MeshBasicMaterial({ color: 0xff0000 });
        mat.transparent = true;
        mat.opacity = this.opacity;

        const pointHighlight = new Mesh(new SphereGeometry(this.particleSize, 10, 10), mat);
        this.parent.add(pointHighlight);

        this.pointHighlight = pointHighlight;

        return this;
    };

    withForceHighlight = (particleIds: ParticleId[]) => {
        this.forceColorMap = new Map<string, ColorRepresentation>();
        this.forces = (particleIds ?? []).reduce(
            (acc, id) => acc.set(id, new Map<string, ArrowHelper>()),
            new Map<ParticleId, Map<string, ArrowHelper>>()
        );

        return this;
    };

    highlightPoint = (position: Vector3) => {
        if (!this.pointHighlight) return;

        this.pointHighlight.position.copy(position);
    };

    highlightForce = (particleId: ParticleId, forceName: string, particlePosition: Vector3, direction: Vector3) => {
        if (!this.forces) return;

        const particleForces = this.forces.get(particleId);
        if (!particleForces) {
            return console.error(`ParticleSystemVisualization.updateParticleForce: Not tracking ${particleId}`);
        }

        const normalizedDir = direction.clone().normalize();
        const force = particleForces.get(forceName);
        if (force) {
            if (normalizedDir.lengthSq() < EPSILON) {
                particleForces.get(forceName)?.position.copy(new Vector3(Infinity, Infinity, Infinity));
            } else {
                force.position.copy(particlePosition);
                force.setRotationFromEuler(new Euler(normalizedDir.x, normalizedDir.y, normalizedDir.z));
            }
        } else {
            let color = this.forceColorMap.get(forceName);

            if (!color) {
                color = new Color();
                color.setHex(Math.random() * 0xffffff);
                console.log('Color for', forceName, 'is (', ...color.toArray().map((v) => v.toFixed(2)), ')');
                this.forceColorMap.set(forceName, color);
            }

            const ray = new ArrowHelper(normalizedDir, particlePosition, this.particleSize * 2, color);
            particleForces.set(forceName, ray);
            this.parent.add(ray);
        }
    };

    update = (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => {};

    private disposeBoundary = () => {
        if (this.boundary) {
            this.boundary.geometry.dispose();
            (this.boundary.material as Material).dispose();
            this.boundary.removeFromParent();
        }
    };

    private disposePointHighlight = () => {
        if (this.pointHighlight) {
            this.pointHighlight.geometry.dispose();
            (this.pointHighlight.material as Material).dispose();
            this.pointHighlight.removeFromParent();
        }
    };

    dispose = () => {
        this.disposeBoundary();
        this.disposePointHighlight();
    };
}
