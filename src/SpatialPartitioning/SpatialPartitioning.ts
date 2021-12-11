import { Vector3, Object3D, PlaneGeometry, MeshBasicMaterial, Mesh, Material, Line, BufferGeometry } from 'three';

export type BB = {
    x: number;
    y: number;
    particles: number[];

    visited: boolean;
};

export class SpatialPartitioning {
    private readonly size: number;
    private readonly width: number;
    private readonly height: number;
    private bbs: Record<number, BB>;
    private mesh!: Line;

    constructor(size: number, width: number, height: number) {
        this.size = size;
        this.width = width;
        this.height = height;
        this.bbs = {};
    }

    get boxWidth() {
        return this.size / this.width;
    }
    get boxHeight() {
        return this.size / this.height;
    }

    getSize = () => this.size;

    getWidth = () => this.width;

    getHeight = () => this.height;

    getBB = (x: number, y: number) => this.bbs[this.getBBIdFromPosition(x, y)];

    getBBId = (bb: BB) => this.getBBIdFromPosition(bb.x, bb.y);

    getBBIdFromPosition = (x: number, y: number): number => x + y * this.width;

    getOccupiedBBs = () => Object.values(this.bbs);

    insertParticle = (particleId: number, p: Vector3) => {
        const boxX =
            Math.min(this.width / 2 - 1, Math.max(-this.width / 2, Math.floor(p.x / this.boxWidth))) + this.width / 2;
        const boxY =
            Math.min(this.height / 2 - 1, Math.max(-this.height / 2, Math.floor(p.y / this.boxHeight))) +
            this.height / 2;

        const id = this.getBBIdFromPosition(boxX, boxY);

        if (this.bbs[id]) {
            this.bbs[id].particles.push(particleId);
        } else {
            this.bbs[id] = { x: boxX, y: boxY, particles: [particleId], visited: false };
        }
    };

    getCluster = (startingBB: BB) => {
        startingBB.visited = true;
        const valid = [startingBB];

        const stack: BB[] = [startingBB];
        while (stack.length > 0) {
            const currBB = stack.pop();

            if (currBB) {
                const currX = currBB.x;
                const currY = currBB.y;

                const neighbors = [
                    [currX + 1, currY],
                    [currX - 1, currY],
                    [currX, currY + 1],
                    [currX, currY - 1],
                ];

                for (const [neighborX, neighborY] of neighbors) {
                    const neighbor = this.bbs[neighborX + neighborY * this.height];

                    if (
                        neighbor &&
                        !neighbor.visited &&
                        neighborX >= 0 &&
                        neighborX < this.width &&
                        neighborY >= 0 &&
                        neighborY < this.height
                    ) {
                        valid.push(neighbor);
                        neighbor.visited = true;
                        stack.push(neighbor);
                    }
                }
            }
        }

        return valid;
    };

    clear = () => {
        this.bbs = {};
    };

    withVisualization = (parent: Object3D) => {
        const points = [];

        const offset = -this.size / 2;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                points.push(new Vector3(offset + j * this.boxWidth, offset + i * this.boxHeight, 0));
                points.push(new Vector3(offset + (j + 1) * this.boxWidth, offset + i * this.boxHeight, 0));
                points.push(new Vector3(offset + (j + 1) * this.boxWidth, offset + (i + 1) * this.boxHeight, 0));
                points.push(new Vector3(offset + j * this.boxWidth, offset + (i + 1) * this.boxHeight, 0));
                points.push(new Vector3(offset + j * this.boxWidth, offset + i * this.boxHeight, 0));
            }
            points.push(new Vector3(-offset - this.boxWidth, offset + (i + 1) * this.boxHeight, 0));
        }

        const geo = new BufferGeometry().setFromPoints(points);
        const mat = new MeshBasicMaterial({ color: 0xff0000 });
        this.mesh = new Line(geo, mat);

        this.mesh.scale.multiplyScalar(0.99);

        parent.add(this.mesh);

        return this;
    };

    dispose = () => {
        this.mesh?.geometry.dispose();
        (this.mesh?.material as Material).dispose();
    };
}
