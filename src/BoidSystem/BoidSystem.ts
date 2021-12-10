import { Scene, Vector3 } from 'three';

import { GameObject } from '../types/GameObject';
import { ParticleSystem, ParticleSystemOptions } from '../ParticleSystem/ParticleSystem';

const DIMENSIONS = 2;

enum IAttributes {
    aPindex = 'aPindex',
    aInitialPosition = 'aInitialPosition',
    aVelocity = 'aVelocity',
    aTime = 'aTime',
}

type BB = {
    x: number;
    y: number;
    particles: number[];

    visited: boolean;
};

type SpatialPartitioning = {
    readonly width: number;
    readonly height: number;
    bbs: Record<number, BB>;
};

export class BoidSystem implements GameObject {
    private psys: ParticleSystem;

    constructor(scene: Scene, options: ParticleSystemOptions = {}) {
        this.psys = new ParticleSystem(scene, { ...options, count: 200, particleSize: 0.04 });
    }

    private avoidWalls = (pIndex: number) => {
        const iattributes = this.psys.getIAttributes();
        const particleSize = this.psys.getParticleSize();
        const speed = this.psys.getSpeed();
        const lowerBoundary = this.psys.lowerBoundary;
        const upperBoundary = this.psys.upperBoundary;

        const dimIndex = pIndex * 3;
        const initialPositions = iattributes[IAttributes.aInitialPosition].value;
        const velocities = iattributes[IAttributes.aVelocity].value;
        const times = iattributes[IAttributes.aTime].value;

        const time = times[pIndex];

        const awareness = particleSize;
        const sensitivity = 200;
        const w = [0, 0, 0];
        for (let i = 0; i < DIMENSIONS; i++) {
            const vi = velocities[dimIndex + i];
            const pf = initialPositions[dimIndex + i] + vi * time;

            if (pf <= lowerBoundary + awareness) {
                w[i] += (sensitivity * awareness) / Math.abs(pf);
            } else if (pf >= upperBoundary - awareness) {
                w[i] -= (sensitivity * awareness) / Math.abs(pf);
            }
        }

        const v = new Vector3(...w);
        if (v.lengthSq() > 0) {
            v.add(new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]))
                .normalize()
                .multiplyScalar(speed);
            this.psys.setParticleVelocity(pIndex, 0, v);
        }
    };

    private separateFromNeighbors = (pIndex: number) => {
        const iattributes = this.psys.getIAttributes();
        const particleSize = this.psys.getParticleSize();
        const count = this.psys.getCount();
        const speed = this.psys.getSpeed();

        const dimIndex = pIndex * 3;
        const initialPositions = iattributes[IAttributes.aInitialPosition].value;
        const velocities = iattributes[IAttributes.aVelocity].value;
        const p = new Vector3(
            initialPositions[dimIndex],
            initialPositions[dimIndex + 1],
            initialPositions[dimIndex + 2]
        );

        const vAdjustment = new Vector3();
        const awareness = particleSize;
        const sensitivity = 0.0001;
        for (let i = 0; i < count; i++) {
            if (i !== pIndex) {
                const pi = new Vector3(
                    initialPositions[i * 3],
                    initialPositions[i * 3 + 1],
                    initialPositions[i * 3 + 2]
                );
                const d = p.distanceToSquared(pi);

                if (d < awareness) {
                    const avoidanceDir = p.clone().sub(pi).normalize();
                    vAdjustment.add(avoidanceDir.multiplyScalar((awareness * sensitivity) / d));
                }
            }
        }

        if (vAdjustment.lengthSq() > 0) {
            vAdjustment
                .add(new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]))
                .normalize()
                .multiplyScalar(speed);

            this.psys.setParticleVelocity(pIndex, 0, vAdjustment);
        }
    };

    private alignWithNeighbors = (pIndex: number) => {
        const iattributes = this.psys.getIAttributes();
        const particleSize = this.psys.getParticleSize();
        const count = this.psys.getCount();
        const speed = this.psys.getSpeed();

        const dimIndex = pIndex * 3;
        const initialPositions = iattributes[IAttributes.aInitialPosition].value;
        const velocities = iattributes[IAttributes.aVelocity].value;
        const p = new Vector3(
            initialPositions[dimIndex],
            initialPositions[dimIndex + 1],
            initialPositions[dimIndex + 2]
        );

        const vAdjustment = new Vector3();
        const awareness = particleSize;
        const sensitivity = 0.001;
        let n = 0;
        for (let i = 0; i < count; i++) {
            if (i !== pIndex) {
                const pi = new Vector3(
                    initialPositions[i * 3],
                    initialPositions[i * 3 + 1],
                    initialPositions[i * 3 + 2]
                );
                const d = p.distanceToSquared(pi);

                if (d < awareness) {
                    n++;
                    vAdjustment.add(
                        new Vector3(velocities[i * 3], velocities[i * 3 + 1], velocities[i * 3 + 2]).multiplyScalar(
                            (sensitivity * awareness) / d
                        )
                    );
                }
            }
        }

        if (n > 0) {
            vAdjustment
                .add(new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]))
                .divideScalar(n + 1)
                .normalize()
                .multiplyScalar(speed);

            this.psys.setParticleVelocity(pIndex, 0, vAdjustment);
        }
    };

    private cohesion = () => {
        const centralAttraction = 0.0001;
        const speed = this.psys.getSpeed();
        const count = this.psys.getCount();
        const size = this.psys.getSize();

        const numBoxesPerDimension = 10;
        const boxLength = size / numBoxesPerDimension;

        const generateBBId = (x: number, y: number) => x + y * numBoxesPerDimension;
        const bbId = (bb: BB) => generateBBId(bb.x, bb.y);
        const spatialPartitioning: SpatialPartitioning = {
            width: numBoxesPerDimension,
            height: numBoxesPerDimension,
            bbs: {},
        };
        // const positionsMatrix = new Uint8Array(numBoxesPerDimension * numBoxesPerDimension);
        for (let pIndex = 0; pIndex < count; pIndex++) {
            const p = this.psys.getParticlePosition(pIndex);

            const boxX =
                Math.min(
                    spatialPartitioning.width / 2 - 1,
                    Math.max(-spatialPartitioning.width / 2, Math.floor(p.x / boxLength))
                ) +
                numBoxesPerDimension / 2;
            const boxY =
                Math.min(
                    spatialPartitioning.height / 2 - 1,
                    Math.max(-spatialPartitioning.height / 2, Math.floor(p.y / boxLength))
                ) +
                numBoxesPerDimension / 2;

            const id = generateBBId(boxX, boxY);

            if (spatialPartitioning.bbs[id]) {
                spatialPartitioning.bbs[id].particles.push(pIndex);
            } else {
                spatialPartitioning.bbs[id] = { x: boxX, y: boxY, particles: [pIndex], visited: false };
            }
        }

        // console.log('-----------------------');
        // for (let i = 0; i < numBoxesPerDimension; i++) {
        //     let s = `${i}: `;
        //     for (let j = 0; j < numBoxesPerDimension; j++) {
        //         s += positionsMatrix[i * numBoxesPerDimension + j];
        //         s += ' ';
        //     }
        //     console.log(s);
        // }
        // console.log('-----------------------');

        const activeBBs = Object.values(spatialPartitioning.bbs);
        const visited = new Uint8Array(numBoxesPerDimension * numBoxesPerDimension);
        const clusters = [];
        for (const bb of activeBBs) {
            if (visited[bbId(bb)] === 0) {
                const cluster = bfs(spatialPartitioning, bb);

                if (cluster.length > 1) clusters.push(cluster);
            }
        }

        for (const cluster of clusters) {
            const center = new Vector3();

            let pCount = 0;
            for (const bb of cluster) {
                pCount += bb.particles.length;
                center.add(
                    bb.particles.reduce((acc, pIndex) => acc.add(this.psys.getParticlePosition(pIndex)), new Vector3())
                );
            }

            center.multiplyScalar(1 / pCount);

            for (const bb of cluster) {
                for (const pIndex of bb.particles) {
                    const rayToCenter = center.clone().sub(this.psys.getParticlePosition(pIndex));
                    const w = rayToCenter.lengthSq();
                    // const w = Math.min(rayToCenter.lengthSq(), 1);
                    const v = rayToCenter.normalize().multiplyScalar(w * centralAttraction);
                    const vf = v.add(this.psys.getParticleVelocity(pIndex)).normalize().multiplyScalar(speed);
                    this.psys.setParticleVelocity(pIndex, 0, vf);
                }
            }
        }

        // console.log(clusters);
    };

    update = (elapsed: number, tick: number) => {
        const count = this.psys.getCount();
        const geometry = this.psys.getMesh().geometry;
        const times = this.psys.getIAttributes()[IAttributes.aTime].value;
        this.psys.getShader().uniforms.uTime.value = elapsed;

        for (let i = 0; i < count; i++) {
            this.avoidWalls(i);
            this.separateFromNeighbors(i);
            this.alignWithNeighbors(i);

            this.cohesion();

            times[i] += tick;
        }

        geometry.attributes.aTime.needsUpdate = true;
    };

    dispose = () => {
        this.psys.dispose();
    };
}

const bfs = (space: SpatialPartitioning, bb: BB) => {
    bb.visited = true;
    const valid = [bb];

    const stack: BB[] = [bb];
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
                const neighbor = space.bbs[neighborX + neighborY * space.height];

                if (
                    neighbor &&
                    !neighbor.visited &&
                    neighborX >= 0 &&
                    neighborX < space.height &&
                    neighborY >= 0 &&
                    neighborY < space.height
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
