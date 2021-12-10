import { Scene, Vector3 } from 'three';

import { GameObject } from '../types/GameObject';
import { ParticleSystem, ParticleSystemOptions } from '../ParticleSystem/ParticleSystem';
import { BB, SpatialPartitioning } from '../SpatialPartitioning/SpatialPartitioning';
import { SETTINGS } from '../Settings/Settings';

export class BoidSystem implements GameObject {
    private psys: ParticleSystem;

    constructor(scene: Scene, options: ParticleSystemOptions = {}) {
        this.psys = new ParticleSystem(scene, { ...options, count: 400, particleSize: 0.04 });
    }

    private avoidWalls = (particleId: number, tick: number) => {
        const particleSize = this.psys.getParticleSize();
        const speed = this.psys.getSpeed();
        const lowerBoundary = this.psys.lowerBoundary;
        const upperBoundary = this.psys.upperBoundary;

        const awareness = 2 * particleSize;
        const sensitivity = 0.001;

        const pi = this.psys.getParticlePosition(particleId);
        const vi = this.psys.getParticleVelocity(particleId);
        const pf = pi.add(vi.multiplyScalar(tick));
        const dir = new Vector3(
            pf.x <= lowerBoundary + awareness
                ? 1 / Math.abs(pf.x)
                : pf.x >= upperBoundary - awareness
                ? -1 / Math.abs(pf.x)
                : 0,

            pf.y <= lowerBoundary + awareness
                ? 1 / Math.abs(pf.y)
                : pf.y >= upperBoundary - awareness
                ? -1 / Math.abs(pf.y)
                : 0,

            pf.z <= lowerBoundary + awareness
                ? 1 / Math.abs(pf.z)
                : pf.z >= upperBoundary - awareness
                ? -1 / Math.abs(pf.z)
                : 0
        );

        if (dir.lengthSq() > 0) {
            dir.normalize().multiplyScalar(sensitivity);
            const vf = dir.add(vi).normalize().multiplyScalar(speed);
            this.psys.setParticleVelocity(particleId, vf);
        }
    };

    private separateFromNeighbors = (particleId: number) => {
        const particleSize = this.psys.getParticleSize();
        const speed = this.psys.getSpeed();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.separation.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.separation.sensitivity;

        let n = 0;
        const dir = new Vector3();

        this.psys.getParticleIds().forEach((otherParticleId) => {
            if (otherParticleId !== particleId) {
                const pOther = this.psys.getParticlePosition(otherParticleId);
                const d = p.distanceToSquared(pOther);

                if (d < awareness) {
                    const avoidanceDir = p.clone().sub(pOther).normalize();
                    // this might be redundant
                    dir.add(avoidanceDir.multiplyScalar(1 / d));
                    n++;
                }
            }
        });

        if (n > 0) {
            dir.divideScalar(n).normalize().multiplyScalar(sensitivity);
            const vi = this.psys.getParticleVelocity(particleId);
            const vf = dir.add(vi).normalize().multiplyScalar(speed);

            this.psys.setParticleVelocity(particleId, vf);
        }
    };

    private alignWithNeighbors = (particleId: number) => {
        const particleSize = this.psys.getParticleSize();
        const speed = this.psys.getSpeed();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.alignment.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.alignment.sensitivity * 0.75;

        let n = 0;
        const dir = new Vector3();

        this.psys.getParticleIds().forEach((otherParticleId) => {
            if (otherParticleId !== particleId) {
                const pOther = this.psys.getParticlePosition(otherParticleId);
                const vOther = this.psys.getParticleVelocity(otherParticleId);
                const d = p.distanceToSquared(pOther);

                if (d < awareness) {
                    dir.add(vOther.multiplyScalar(1 / d));
                    n++;
                }
            }
        });

        if (n > 0) {
            dir.divideScalar(n).normalize().multiplyScalar(sensitivity);
            const vi = this.psys.getParticleVelocity(particleId);
            const vf = dir.add(vi).normalize().multiplyScalar(speed);

            this.psys.setParticleVelocity(particleId, vf);
        }
    };

    private cohesion = () => {
        const sensitivity = SETTINGS.cohesion.sensitivity;
        const speed = this.psys.getSpeed();
        const size = this.psys.getSize();
        const spaceSize = size;
        const numBoxesPerDimension = 20;

        // Initialize spatial partition
        const spatialPartitioning = new SpatialPartitioning(spaceSize, numBoxesPerDimension, numBoxesPerDimension);
        this.psys.getParticleIds().forEach((particleId) => {
            const p = this.psys.getParticlePosition(particleId);
            spatialPartitioning.insertParticle(particleId, p);
        });

        // Gather clusters
        const activeBBs = spatialPartitioning.getOccupiedBBs();
        const visited = new Uint8Array(numBoxesPerDimension * numBoxesPerDimension);
        const clusters: BB[][] = [];
        for (const bb of activeBBs) {
            if (visited[spatialPartitioning.getBBId(bb)] === 0) {
                const cluster = spatialPartitioning.getCluster(bb);

                if (cluster.length > 1) clusters.push(cluster);
            }
        }

        for (const cluster of clusters) {
            // Calculate cluster centers
            const center = new Vector3();
            let pCount = 0;
            for (const bb of cluster) {
                pCount += bb.particles.length;

                center.add(
                    bb.particles.reduce(
                        (acc, particleId) => acc.add(this.psys.getParticlePosition(particleId)),
                        new Vector3()
                    )
                );
            }
            center.multiplyScalar(1 / pCount);

            // Push particles towards cluster center
            for (const bb of cluster) {
                for (const particleId of bb.particles) {
                    const rayToCenter = center.clone().sub(this.psys.getParticlePosition(particleId));
                    const w = rayToCenter.lengthSq();
                    // const w = Math.min(rayToCenter.lengthSq(), 1);
                    const v = rayToCenter.normalize().multiplyScalar(w * sensitivity);
                    const vf = v.add(this.psys.getParticleVelocity(particleId)).normalize().multiplyScalar(speed);
                    this.psys.setParticleVelocity(particleId, vf);
                }
            }
        }
    };

    update = (elapsed: number, tick: number) => {
        this.psys.update(elapsed, tick);
        const particleIds = this.psys.getParticleIds();

        particleIds.forEach((particleId) => {
            this.avoidWalls(particleId, tick);
            this.separateFromNeighbors(particleId);
            this.alignWithNeighbors(particleId);
        });

        // this.cohesion();
    };

    dispose = () => {
        this.psys.dispose();
    };
}
