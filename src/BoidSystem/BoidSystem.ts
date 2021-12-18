import { EventSystem } from './../EventSystem/EventSystem';
import { Scene, Vector3 } from 'three';

import { GameObject } from '../types/GameObject';
import { ParticleSystem, ParticleSystemOptions } from '../ParticleSystem/ParticleSystem';
import { SETTINGS } from '../Settings/Settings';
import { CanvasUtils } from '../CanvasUtils/CanvasUtils';

type BoidRule = (particleId: number, tick: number) => Vector3;

export class BoidSystem implements GameObject {
    private readonly psys: ParticleSystem;
    private readonly centersOfAttraction: Record<string, Vector3>;
    private readonly rules: BoidRule[];

    constructor(scene: Scene, options: ParticleSystemOptions) {
        this.psys = new ParticleSystem(scene, options);
        this.centersOfAttraction = {};
        this.rules = [
            this.seekCentersOfAttraction,
            this.avoidWalls,
            this.separateFromNeighbors,
            this.alignWithNeighbors,
            this.tendTowardFlockCenter,
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

    private tendTowardFlockCenter = (particleId: number) => {
        const sensitivity = SETTINGS.cohesion.sensitivity;
        const speed = this.psys.getSpeed();
        const cluster = this.psys.getParticleCluster(particleId);

        if (sensitivity === 0 || !cluster) return new Vector3();

        const rayToCenter = cluster.center.clone().sub(this.psys.getParticlePosition(particleId));
        const w = rayToCenter.lengthSq();
        // const w = Math.min(rayToCenter.lengthSq(), 1);
        const v = rayToCenter.normalize().multiplyScalar(w * sensitivity);
        const vf = v.add(this.psys.getParticleVelocity(particleId)).normalize().multiplyScalar(speed);

        return vf;
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

        particleIds.forEach((particleId) => {
            const adjustmentDir = this.rules.reduce((acc, rule) => acc.add(rule(particleId, tick)), new Vector3());

            const vi = this.psys.getParticleVelocity(particleId);
            const vf = adjustmentDir.add(vi).normalize().multiplyScalar(speed);

            this.psys.setParticleVelocity(particleId, vf.toArray());
        });
    };

    withVisualization = () => {
        this.psys.withVisualization();
        return this;
    };

    dispose = () => {
        this.psys.dispose();
    };
}
