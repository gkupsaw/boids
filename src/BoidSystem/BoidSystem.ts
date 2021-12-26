import { Scene, Vector3 } from 'three';

import { GameObject } from '../types/GameObject';
import {
    ParticleSystem,
    ParticleSystemOptions,
    ParticleSystemCopyOptions,
    ParticleId,
} from '../ParticleSystem/ParticleSystem';
import { SETTINGS } from '../Settings/Settings';
import { CanvasUtils } from '../CanvasUtils/CanvasUtils';
import { BoidStats, BoidStatsObject } from './debug/BoidStats';
import { EventSystem } from './../EventSystem/EventSystem';

type BoidForce = (particleId: ParticleId, tick: number) => Vector3;

export class BoidSystem implements GameObject<BoidSystem> {
    private readonly psys: ParticleSystem;
    private readonly centersOfAttraction: Record<string, Vector3>;
    private readonly forces: { name: string; force: BoidForce }[];

    private boidStats!: BoidStatsObject;
    private boidOfInterest!: number;

    constructor(scene: Scene, options: ParticleSystemOptions) {
        this.psys = new ParticleSystem(scene, options);
        this.centersOfAttraction = {};
        this.forces = [
            // { name: 'Attraction', force: this.seekCentersOfAttraction },
            { name: 'Obstacles', force: this.avoidWalls },
            { name: 'Separation', force: this.separateFromNeighbors },
            { name: 'Alignment', force: this.alignWithNeighbors },
            { name: 'Cohesion', force: this.tendTowardFlockCenter },
        ];
    }

    private seekCentersOfAttraction = (particleId: ParticleId) => {
        const centersOfAttraction = Object.values(this.centersOfAttraction);
        if (centersOfAttraction.length === 0) return new Vector3();

        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.attraction.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.attraction.sensitivity;

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

    private avoidWalls = (particleId: ParticleId, tick: number) => {
        const particleSize = this.psys.getParticleSize();
        const lowerBoundary = this.psys.lowerBoundary;
        const upperBoundary = this.psys.upperBoundary;

        const awareness = SETTINGS.obstacles.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.obstacles.sensitivity;

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

    private separateFromNeighbors = (particleId: ParticleId) => {
        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.separation.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.separation.sensitivity;

        const dir = new Vector3();

        if (sensitivity === 0) return dir;

        const surroundingParticles = this.psys.getPerceptibleParticles(particleId, awareness);

        if (surroundingParticles.length === 0) return new Vector3();

        surroundingParticles.forEach((otherParticleId) => {
            if (otherParticleId !== particleId) {
                const pOther = this.psys.getParticlePosition(otherParticleId);
                const d = p.distanceToSquared(pOther);

                const avoidanceDir = p.clone().sub(pOther).normalize();
                dir.add(avoidanceDir.multiplyScalar(1 / d));
            }
        });

        return dir.divideScalar(surroundingParticles.length).normalize().multiplyScalar(sensitivity);
    };

    private alignWithNeighbors = (particleId: ParticleId) => {
        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.alignment.awarenessFactor * particleSize;
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.alignment.sensitivity;

        const dir = new Vector3();

        if (sensitivity === 0) return dir;

        const surroundingParticles = this.psys.getPerceptibleParticles(particleId, awareness);

        if (surroundingParticles.length === 0) return new Vector3();

        surroundingParticles.forEach((otherParticleId) => {
            if (otherParticleId !== particleId) {
                const pOther = this.psys.getParticlePosition(otherParticleId);
                const vOther = this.psys.getParticleVelocity(otherParticleId);
                const d = p.distanceToSquared(pOther);

                dir.add(vOther.multiplyScalar(1 / d));
            }
        });

        return dir.divideScalar(surroundingParticles.length).normalize().multiplyScalar(sensitivity);
    };

    private tendTowardFlockCenter = (particleId: ParticleId) => {
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.cohesion.sensitivity;
        const cluster = this.psys.getParticleCluster(particleId);

        if (sensitivity === 0 || !cluster) return new Vector3();

        const rayToCenter = cluster.center.clone().sub(this.psys.getParticlePosition(particleId));
        // const w = 1 / rayToCenter.lengthSq();
        const w = Math.min(rayToCenter.lengthSq(), 1);

        return rayToCenter.normalize().multiplyScalar(w * sensitivity);
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
        const particleIds = this.psys.getParticleIds();
        const speed = this.psys.getSpeed();

        const indivForces: { name: string; val: Vector3 }[] = [];
        const avgForces: { [name: string]: Vector3 } = {};
        particleIds.forEach((particleId) => {
            const adjustmentDir = this.forces.reduce((acc, { name, force }) => {
                const val = force(particleId, tick);

                if (this.boidStats) {
                    if (particleId === this.boidOfInterest) {
                        indivForces.push({ name: name, val });
                    }

                    if (avgForces[name]) {
                        avgForces[name].add(val);
                    } else {
                        avgForces[name] = val.clone();
                    }
                }

                return acc.add(val);
            }, new Vector3());

            const vi = this.psys.getParticleVelocity(particleId);
            const vf = adjustmentDir.add(vi).normalize().multiplyScalar(speed);

            this.psys.setParticleVelocity(particleId, vf.toArray());
        });

        if (this.boidStats) {
            this.psys.highlightParticle(this.boidOfInterest);
            this.boidStats.update({
                id: this.boidOfInterest,
                p: this.psys.getParticlePosition(this.boidOfInterest),
                v: this.psys.getParticleVelocity(this.boidOfInterest),
                forces: indivForces,
                avgForces: avgForces,
            });
        }
    };

    withVisualization = () => {
        this.psys.withVisualization();

        return this;
    };

    withDebug = (boidOfInterest: number = 0) => {
        this.boidStats = BoidStats();
        this.boidOfInterest = boidOfInterest;

        return this;
    };

    copy = () => {
        const scene = this.psys.getMesh().parent as Scene;

        const options: ParticleSystemCopyOptions = {
            count: this.psys.getCount(),
            size: this.psys.getSize(),
            particleSize: this.psys.getParticleSize(),
            speed: this.psys.getSpeed(),
        };

        this.dispose();

        if (!scene) {
            throw new Error('No scene parent found for mesh');
        }

        return new BoidSystem(scene, options);
    };

    dispose = () => {
        this.psys.dispose();

        if (this.boidStats) this.boidStats.dispose();
    };
}
