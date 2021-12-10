import { Vector3 } from 'three';

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

    constructor(size: number, width: number, height: number) {
        this.size = size;
        this.width = width;
        this.height = height;
        this.bbs = {};
    }

    getSize = () => this.size;

    getWidth = () => this.width;

    getHeight = () => this.height;

    getBB = (x: number, y: number) => this.bbs[this.getBBIdFromPosition(x, y)];

    getBBId = (bb: BB) => this.getBBIdFromPosition(bb.x, bb.y);

    getBBIdFromPosition = (x: number, y: number): number => x + y * this.width;

    getOccupiedBBs = () => Object.values(this.bbs);

    insertParticle = (particleId: number, p: Vector3) => {
        const boxWidth = this.size / this.width;
        const boxHeight = this.size / this.height;

        const boxX =
            Math.min(this.width / 2 - 1, Math.max(-this.width / 2, Math.floor(p.x / boxWidth))) + this.width / 2;
        const boxY =
            Math.min(this.height / 2 - 1, Math.max(-this.height / 2, Math.floor(p.y / boxHeight))) + this.height / 2;

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
}
