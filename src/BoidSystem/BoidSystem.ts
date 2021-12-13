import { EventSystem } from './../EventSystem/EventSystem';
import { Scene, Vector3 } from 'three';

import { GameObject } from '../types/GameObject';
import { ParticleSystem, ParticleSystemOptions } from '../ParticleSystem/ParticleSystem';
import { BB, SpatialPartitioning } from '../SpatialPartitioning/SpatialPartitioning';
import { SETTINGS } from '../Settings/Settings';
import { CanvasUtils } from '../CanvasUtils/CanvasUtils';

type BoidRule = (particleId: number, tick: number) => Vector3;

export class BoidSystem implements GameObject {
    private psys: ParticleSystem;
    private spatialPartitioning: SpatialPartitioning;
    private centersOfAttraction: Record<string, Vector3>;
    private rules: BoidRule[];

    constructor(scene: Scene, options: ParticleSystemOptions = {}) {
        this.psys = new ParticleSystem(scene, { ...options, count: 400, particleSize: 0.04 });

        this.spatialPartitioning = new SpatialPartitioning(this.psys.getSize(), 20, 20).withVisualization(scene);

        this.centersOfAttraction = {};

        this.rules = [
            this.seekCentersOfAttraction,
            this.avoidWalls,
            this.separateFromNeighbors,
            this.alignWithNeighbors,
        ];
    }

    private seekCentersOfAttraction = (particleId: number) => {
        const centersOfAttraction = Object.values(this.centersOfAttraction);
        if (centersOfAttraction.length === 0) return new Vector3();

        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.attraction.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.attraction.sensitivity;

        let n = 0;
        const dir = new Vector3();

        for (const pOther of centersOfAttraction) {
            const d = pOther.distanceToSquared(p);

            if (d < awareness) {
                const attractionDir = pOther.clone().sub(p).normalize();
                dir.add(attractionDir.multiplyScalar(d));
                n++;
            }
        }

        if (n === 0) return new Vector3();

        return dir.divideScalar(n).normalize().multiplyScalar(sensitivity);
    };

    private avoidWalls = (particleId: number, tick: number) => {
        const particleSize = this.psys.getParticleSize();
        const lowerBoundary = this.psys.lowerBoundary;
        const upperBoundary = this.psys.upperBoundary;

        const awareness = SETTINGS.obstacles.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.obstacles.sensitivity;

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

        return dir.normalize().multiplyScalar(sensitivity);
    };

    private separateFromNeighbors = (particleId: number) => {
        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.separation.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.separation.sensitivity;

        let n = 0;
        const dir = new Vector3();

        if (sensitivity === 0) return dir;

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

        if (n === 0) return new Vector3();

        return dir.divideScalar(n).normalize().multiplyScalar(sensitivity);
    };

    private alignWithNeighbors = (particleId: number) => {
        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.alignment.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.alignment.sensitivity * 0.75;

        let n = 0;
        const dir = new Vector3();

        if (sensitivity === 0) return dir;

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

        if (n === 0) return new Vector3();

        return dir.divideScalar(n).normalize().multiplyScalar(sensitivity);
    };

    private cohesion = () => {
        const sensitivity = SETTINGS.cohesion.sensitivity;
        const speed = this.psys.getSpeed();

        if (sensitivity === 0) return;

        // Initialize spatial partition
        this.psys.getParticleIds().forEach((particleId) => {
            const p = this.psys.getParticlePosition(particleId);
            this.spatialPartitioning.insertParticle(particleId, p);
        });

        // Gather clusters
        const activeBBs = this.spatialPartitioning.getOccupiedBBs();
        const clusters: BB[][] = [];
        for (const bb of activeBBs) {
            if (!this.spatialPartitioning.getBB(bb.x, bb.y).visited) {
                const cluster = this.spatialPartitioning.getCluster(bb);

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

    // API

    setCenterOfAttraction = (id: string, p: Vector3) => {
        this.centersOfAttraction[id] = p;
    };

    removeCenterOfAttraction = (id: string) => {
        delete this.centersOfAttraction[id];
    };

    subscribeToEvents = (esys: EventSystem) => {
        const onMousemove = (e: MouseEvent) => {
            const canvasDimensions = CanvasUtils.getCanvasDimensions();

            if (canvasDimensions) {
                const psysSize = this.psys.getSize();
                const mousecenter = new Vector3(
                    psysSize * (e.x / canvasDimensions.width - 1 / 2),
                    -psysSize * (e.y / canvasDimensions.height - 1 / 2),
                    0
                );
                this.setCenterOfAttraction('mousecenter', mousecenter);
            }
        };
        esys.addEventListener('mousemove', onMousemove);
        return () => esys.removeEventListener('mousemove', onMousemove);
    };

    update = (elapsed: number, tick: number) => {
        this.psys.update(elapsed, tick);
        this.spatialPartitioning.clear();
        const particleIds = this.psys.getParticleIds();
        const speed = this.psys.getSpeed();

        particleIds.forEach((particleId) => {
            const adjustmentDir = this.rules
                .reduce((acc, rule) => acc.add(rule(particleId, tick)), new Vector3())
                .normalize()
                .multiplyScalar(speed);

            const vi = this.psys.getParticleVelocity(particleId);
            const vf = adjustmentDir.add(vi).normalize().multiplyScalar(speed);

            this.psys.setParticleVelocity(particleId, vf);
        });

        this.cohesion();
    };

    dispose = () => {
        this.psys.dispose();
        this.spatialPartitioning.dispose();
    };
}
