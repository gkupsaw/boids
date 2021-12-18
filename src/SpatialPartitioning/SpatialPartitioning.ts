import {
    Vector3,
    Object3D,
    Material,
    Line,
    Mesh,
    LineBasicMaterial,
    BufferGeometry,
    Float32BufferAttribute,
} from 'three';

export type BB = {
    x: number;
    y: number;
    z: number;
    particles: number[];

    visited: boolean;
};

export class SpatialPartitioning {
    private readonly size: number;
    private readonly width: number;
    private readonly height: number;
    private readonly depth: number;
    private bbs: Record<number, BB>;
    private mesh!: Line | Mesh;

    constructor(size: number, width: number, height: number, depth: number) {
        this.size = size;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.bbs = {};
    }

    get boxWidth() {
        return this.size / this.width;
    }

    get boxHeight() {
        return this.size / this.height;
    }

    get boxDepth() {
        return this.size / this.depth;
    }

    private isBBWithinSpace = (x: number, y: number, z: number) =>
        x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth;

    getSize = () => this.size;

    getWidth = () => this.width;

    getHeight = () => this.height;

    getDepth = () => this.depth;

    getBB = (x: number, y: number, z: number) => this.bbs[this.getBBIdFromPosition(x, y, z)];

    getBBId = (bb: BB) => this.getBBIdFromPosition(bb.x, bb.y, bb.z);

    getBBIdFromPosition = (x: number, y: number, z: number): number =>
        x + y * this.width + z * this.width * this.height;

    getOccupiedBBs = () => Object.values(this.bbs);

    insertParticle = (particleId: number, p: Vector3) => {
        const boxX =
            Math.min(this.width / 2 - 1, Math.max(-this.width / 2, Math.floor(p.x / this.boxWidth))) + this.width / 2;
        const boxY =
            Math.min(this.height / 2 - 1, Math.max(-this.height / 2, Math.floor(p.y / this.boxHeight))) +
            this.height / 2;
        const boxZ =
            Math.min(this.depth / 2 - 1, Math.max(-this.depth / 2, Math.floor(p.y / this.boxDepth))) + this.depth / 2;

        const id = this.getBBIdFromPosition(boxX, boxY, boxZ);

        if (this.bbs[id]) {
            this.bbs[id].particles.push(particleId);
        } else {
            this.bbs[id] = { x: boxX, y: boxY, z: boxZ, particles: [particleId], visited: false };
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
                const currZ = currBB.z;

                const neighbors: [number, number, number][] = [
                    [currX + 1, currY, currZ],
                    [currX - 1, currY, currZ],
                    [currX, currY + 1, currZ],
                    [currX, currY - 1, currZ],
                    [currX, currY, currZ + 1],
                    [currX, currY, currZ - 1],
                ];

                for (const [neighborX, neighborY, neighborZ] of neighbors) {
                    if (this.isBBWithinSpace(neighborX, neighborY, neighborZ)) {
                        const neighborId = this.getBBIdFromPosition(neighborX, neighborY, neighborZ);
                        const neighbor = this.bbs[neighborId];

                        if (neighbor && !neighbor.visited) {
                            valid.push(neighbor);
                            neighbor.visited = true;
                            stack.push(neighbor);
                        }
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
        const positions = [];
        const colors = [];

        const offset = -this.size / 2;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                positions.push(offset + j * this.boxWidth, offset + i * this.boxHeight, 0);
                colors.push(1, 0, 0);
                positions.push(offset + j * this.boxWidth, offset + (i + 1) * this.boxHeight, 0);
                colors.push(1, 0, 0);
                positions.push(offset + (j + 1) * this.boxWidth, offset + (i + 1) * this.boxHeight, 0);
                colors.push(1, 0, 0);
                positions.push(offset + (j + 1) * this.boxWidth, offset + i * this.boxHeight, 0);
                colors.push(1, 0, 0);
            }
            positions.push(offset, offset + i * this.boxHeight, 0);
            colors.push(1, 0, 0);
        }

        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new Float32BufferAttribute(colors, 3));

        const mat = new LineBasicMaterial({ vertexColors: true });

        this.mesh = new Line(geo, mat).computeLineDistances();
        this.mesh.scale.multiplyScalar(0.99);

        parent.add(this.mesh);

        colors[1] = 1;
        colors[2] = 1;

        geo.attributes.color.needsUpdate = true;

        return this;
    };

    dispose = () => {
        this.mesh?.geometry.dispose();
        (this.mesh?.material as Material).dispose();
    };
}
