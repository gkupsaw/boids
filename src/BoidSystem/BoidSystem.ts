import { Euler, Matrix4, Scene, Vector3 } from 'three';

import { GameObject } from '../types/GameObject';
import {
    ParticleSystem,
    ParticleSystemOptions,
    ParticleSystemCopyOptions,
    ParticleId,
    InitialState,
} from '../ParticleSystem/ParticleSystem';
import { SETTINGS } from '../Settings/Settings';
import { CanvasUtils } from '../CanvasUtils/CanvasUtils';
import { BoidStats, BoidStatsObject } from './debug/BoidStats';
import { EventSystem } from '../EventSystem/EventSystem';
import { Boundary } from '../Bounding/abstract/Boundary';
import { EPSILON } from '../Util/math';
import { InvertedBoundingBox } from '../Bounding/InvertedBoundingBox';

const MAX_FORCE_INFLUENCE = 1e1;
type BoidForce = (particleId: ParticleId, tick: number) => Vector3;

export class BoidSystem implements GameObject<BoidSystem> {
    private psys: ParticleSystem;
    private readonly centersOfAttraction: Record<string, Vector3>;
    private readonly obstacles: Record<string, Boundary>;
    private readonly forces: Record<string, BoidForce>;

    private boidStats!: BoidStatsObject;
    private boidOfInterest!: number;

    constructor(scene: Scene, options: ParticleSystemOptions) {
        this.psys = new ParticleSystem(scene, options);

        this.centersOfAttraction = {};
        this.obstacles = {};
        this.forces = {};

        this.setupCentersOfAttraction();
        this.setupObstacles(scene);
        this.setupForces();
    }

    private setupCentersOfAttraction = () => {
        this.centersOfAttraction['Central'] = new Vector3();
    };

    private setupObstacles = (scene: Scene) => {
        const psysSize = this.psys.getSize();
        this.obstacles['Walls'] = new InvertedBoundingBox(
            scene,
            new Matrix4().makeScale(psysSize, psysSize, psysSize),
            new Matrix4().makeRotationFromEuler(new Euler(0, 0, 0)),
            new Matrix4().makeTranslation(0, 0, 0)
        );
    };

    private setupForces = () => {
        this.forces['Attraction'] = this.seekCentersOfAttraction;
        this.forces['Obstacles'] = this.avoidObstacles;
        this.forces['Separation'] = this.separateFromNeighbors;
        this.forces['Alignment'] = this.alignWithNeighbors;
        this.forces['Cohesion'] = this.tendTowardFlockCenter;
    };

    private seekCentersOfAttraction = (particleId: ParticleId) => {
        const centersOfAttraction = Object.values(this.centersOfAttraction);
        if (centersOfAttraction.length === 0) return new Vector3();

        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.attraction.perception * particleSize;
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.attraction.sensitivity;

        let n = 0;
        const dir = new Vector3();

        for (const pOther of centersOfAttraction) {
            const d = pOther.distanceToSquared(p);

            if (d < awareness) {
                const attractionDir = pOther.clone().sub(p).normalize();
                const influence = Math.min(1 / d, MAX_FORCE_INFLUENCE);
                dir.add(attractionDir.multiplyScalar(influence));
                n++;
            }
        }

        if (n === 0) return new Vector3();

        return dir.normalize().multiplyScalar(sensitivity);
    };

    private avoidObstacles = (particleId: ParticleId) => {
        const particleSize = this.psys.getParticleSize();

        const awareness = SETTINGS.obstacles.perception * particleSize;
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.obstacles.sensitivity;

        const pi = this.psys.getParticlePosition(particleId);

        for (const obstacle of Object.values(this.obstacles)) {
            const intersectionData = obstacle.intersectPoint(pi);

            if (intersectionData?.face && intersectionData.distance < awareness) {
                const dir = intersectionData.face.normal.clone(); //vi.clone().reflect(intersectionData.face.normal).normalize();
                const influence = Math.min(1 / (intersectionData.distance + EPSILON), MAX_FORCE_INFLUENCE);
                return dir.multiplyScalar(sensitivity * influence);
            }
        }

        return new Vector3();
    };

    private separateFromNeighbors = (particleId: ParticleId) => {
        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.separation.perception * particleSize;
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.separation.sensitivity;

        const dir = new Vector3();

        if (sensitivity === 0) return dir;

        const surroundingParticles = this.psys.getPerceptibleParticles(particleId, awareness);

        if (surroundingParticles.length === 0) return new Vector3();

        surroundingParticles.forEach((otherParticleId) => {
            if (otherParticleId !== particleId) {
                const pOther = this.psys.getParticlePosition(otherParticleId);
                const d = p.distanceToSquared(pOther);
                const influence = Math.min(1 / d, MAX_FORCE_INFLUENCE);

                const avoidanceDir = p.clone().sub(pOther).normalize();
                dir.add(avoidanceDir.multiplyScalar(influence));
            }
        });

        return dir.normalize().multiplyScalar(sensitivity);
    };

    private alignWithNeighbors = (particleId: ParticleId) => {
        const particleSize = this.psys.getParticleSize();

        const p = this.psys.getParticlePosition(particleId);

        const awareness = SETTINGS.alignment.perception * particleSize;
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
                const influence = Math.min(1 / d, MAX_FORCE_INFLUENCE);

                dir.add(vOther.multiplyScalar(influence));
            }
        });

        return dir.normalize().multiplyScalar(sensitivity);
    };

    private tendTowardFlockCenter = (particleId: ParticleId) => {
        const particleSize = this.psys.getParticleSize();

        const awareness = SETTINGS.cohesion.perception * particleSize;
        const sensitivity = SETTINGS.global.sensitivity * SETTINGS.cohesion.sensitivity;

        const centroid = this.psys.getParticleClusterCentroid(particleId, awareness);

        if (sensitivity === 0 || centroid.lengthSq() === 0) return new Vector3();

        const attractionDir = centroid.clone().sub(this.psys.getParticlePosition(particleId)).normalize();
        // const w = 1 / rayToCenter.lengthSq();
        // const w = Math.min(rayToCenter.lengthSq(), 1);

        return attractionDir.multiplyScalar(sensitivity);
    };

    // API

    setSpeed = (speed: number) => {
        this.psys.setSpeed(speed);
    };

    getInitalStateData = () => this.psys.getInitialStateData();

    setCenterOfAttraction = (id: string, p: Vector3) => {
        this.centersOfAttraction[id] = p.clone();
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
            const adjustment = Object.keys(this.forces).reduce((acc, name) => {
                const force = this.forces[name];
                const val = force(particleId, tick);

                if (name === 'Cohesion') this.psys.highlightForce(particleId, name, val);

                if (this.boidStats) {
                    if (particleId === this.boidOfInterest) {
                        indivForces.push({ name, val });
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
            const vf = adjustment.add(vi).normalize().multiplyScalar(speed);

            this.psys.setParticleVelocity(particleId, vf.toArray());
        });

        if (this.boidStats) {
            this.psys.highlightParticle(this.boidOfInterest);

            indivForces.forEach(({ name, val }) => {
                this.psys.highlightForce(this.boidOfInterest, name, val);
            });

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
        if (!this.boidStats) {
            this.boidStats = BoidStats();
        }

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

    restart = (initialStateData: InitialState | undefined = undefined) => {
        const scene = this.psys.getMesh().parent as Scene;

        const options: ParticleSystemCopyOptions = {
            count: this.psys.getCount(),
            size: this.psys.getSize(),
            particleSize: this.psys.getParticleSize(),
            speed: this.psys.getSpeed(),
            initialState: initialStateData,
        };

        this.psys.dispose();

        this.psys = new ParticleSystem(scene, options);
    };

    dispose = () => {
        this.psys.dispose();

        if (this.boidStats) this.boidStats.dispose();

        Object.values(this.obstacles).forEach((o) => o.dispose());
    };
}
