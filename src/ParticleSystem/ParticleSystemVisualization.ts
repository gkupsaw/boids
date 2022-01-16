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
} from 'three';

import { Visualization } from '../types/Visualization';

type ParticleSystemVisualizationOptions = {
    color?: ColorRepresentation;
    opacity?: number;
};

export class ParticleSystemVisualization implements Visualization {
    private readonly size: number;
    private readonly particleSize: number;
    private readonly color: ColorRepresentation | undefined;
    private readonly opacity: number;

    private readonly boundary: Mesh;
    private readonly pointHighlight: Mesh;

    constructor(
        parent: Object3D,
        size: number,
        particleSize: number,
        options: ParticleSystemVisualizationOptions = {}
    ) {
        this.size = size;
        this.particleSize = particleSize;
        this.color = options.color;
        this.opacity = options.opacity ?? 1;

        this.boundary = this.generateBoundary(parent);
        this.pointHighlight = this.generatePointHighlight(parent);

        return this;
    }

    private generateBoundary = (parent: Object3D) => {
        if (this.boundary) this.disposeBoundary();

        const geo = new BoxGeometry(this.size, this.size, this.size);

        const mat = new LineBasicMaterial({ color: this.color ?? 0x000000 });
        mat.transparent = true;
        mat.opacity = this.opacity;

        const boundary = new Mesh(geo, mat);
        parent.add(boundary);

        return boundary;
    };

    private generatePointHighlight = (parent: Object3D) => {
        if (this.pointHighlight) this.disposePointHighlight();

        const mat = new MeshBasicMaterial({ color: 0xff0000 });
        mat.transparent = true;
        mat.opacity = this.opacity;

        const pointHighlight = new Mesh(new SphereGeometry(this.particleSize, 10, 10), mat);
        parent.add(pointHighlight);

        return pointHighlight;
    };

    highlightPoint = (position: Vector3) => {
        this.pointHighlight.position.copy(position);
    };

    update = (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => {};

    private disposeBoundary = () => {
        this.boundary.geometry.dispose();
        (this.boundary.material as Material).dispose();
        this.boundary.removeFromParent();
    };

    private disposePointHighlight = () => {
        this.pointHighlight.geometry.dispose();
        (this.pointHighlight.material as Material).dispose();
        this.pointHighlight.removeFromParent();
    };

    dispose = () => {
        this.disposeBoundary();
        this.disposePointHighlight();
    };
}
