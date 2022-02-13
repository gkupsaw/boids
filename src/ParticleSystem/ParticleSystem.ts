import {
    BufferAttribute,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    Material,
    Mesh,
    Scene,
    ShaderMaterial,
    Vector3,
} from 'three';

import {
    Attribute,
    Attributes,
    IAttributes,
    ParticleSystemOptions,
    ParticleSystemCopyOptions,
    ParticleId,
    BoidShape,
    InitialState,
} from './ParticleSystemTypes';
import { Dimensions, GameObject } from '../types';
import { PARAMETERS } from '../Settings/Parameters';
import { SETTINGS } from '../Settings/Settings';

import { Shaders, Shader } from '../gl/shaders';
import { SpatialPartitioning } from '../SpatialPartitioning/SpatialPartitioning';
import { Cone } from '../Shapes/Cone';
import { Sphere } from '../Shapes/Sphere';
import { randInRange, randVec3InRange } from '../Util/misc';
import { ParticleSystemVisualization } from './ParticleSystemVisualization';
import { NeighborManager } from '../SpatialPartitioning/NeighborManager';

export class ParticleSystem implements GameObject<ParticleSystem> {
    private readonly count: number;
    private readonly size: number;
    private readonly particleSize: number;
    private speed: number;

    private readonly shader: Shader;
    private readonly attributes: { [key in Attributes]: Attribute };
    private readonly iattributes: { [key in IAttributes]: Attribute };
    private readonly mesh: Mesh;
    private readonly spatialPartitioning: SpatialPartitioning;
    private readonly neighborManager: NeighborManager;

    private readonly cache: Map<ParticleId, { position?: Vector3; velocity?: Vector3 }>;

    private static readonly USE_CACHE = false;

    // debug
    private viz!: ParticleSystemVisualization;

    private static readonly DEFAULT_SYSTEM_SIZE = 1;
    private static readonly DEFAULT_PARTICLE_SIZE = 1;
    private static readonly DEFAULT_SPEED = 1;
    private static readonly SPATIAL_PARTITION_RESOLUTION = 0.25;

    // Stores initial state in case the user wants to save it
    // Could be more robust, but this works
    private readonly INITIAL_STATE: InitialState = {
        aPindex: [],
        aPosition: [],
        aVelocity: [],
    };

    constructor(scene: Scene, options: ParticleSystemOptions) {
        this.count = options.count;
        this.size = options.size ?? ParticleSystem.DEFAULT_SYSTEM_SIZE;
        this.particleSize = options.particleSize ?? ParticleSystem.DEFAULT_PARTICLE_SIZE;
        this.speed = options.speed ?? ParticleSystem.DEFAULT_SPEED;
        this.cache = new Map<ParticleId, { position?: Vector3; velocity?: Vector3 }>();

        if (this.particleSize >= this.size) {
            throw new Error('particleSize must be less than size');
        }

        this.shader = this.setupShader();

        this.mesh = this.setupParticleMesh();

        this.attributes = this.setupAttributes();

        this.iattributes = this.setupInstancedAttributes(options.initialState);

        this.spatialPartitioning = this.setupSpatialPartitioning();

        const awareness = SETTINGS.global.perception * this.particleSize;
        const attentiveness = SETTINGS.global.attentiveness;
        this.neighborManager = new NeighborManager(this.spatialPartitioning, awareness, attentiveness);

        if (!options.initialState && PARAMETERS.ParticleSystem.generateClusters) {
            this.clusterParticles();
        }

        scene.add(this.mesh);
    }

    private get lowerBoundary() {
        return -(this.size / 2 - this.particleSize / 2);
    }

    private get upperBoundary() {
        return this.size / 2 - this.particleSize / 2;
    }

    private setupShader = () => {
        const shaders = Shaders();
        const shader = shaders.boids;
        shader.uniforms.uSize.value = this.particleSize;

        return shader;
    };

    private setupParticleMesh = () => {
        if (this.mesh) return this.mesh;

        const geometry = new InstancedBufferGeometry();

        const material = new ShaderMaterial({
            uniforms: this.shader.uniforms,
            vertexShader: this.shader.vert,
            fragmentShader: this.shader.frag,
        });

        const mesh = new Mesh(geometry, material);

        return mesh;
    };

    private setupAttributes = () => {
        const geometry = this.mesh.geometry;

        const attributes = {
            [Attributes.position]: {
                count: 3,
                value:
                    SETTINGS.global.dimensions === Dimensions.xyz
                        ? PARAMETERS.ParticleSystem.boidShape === BoidShape.SPHERE
                            ? new Float32Array(Sphere(8, 0.25))
                            : PARAMETERS.ParticleSystem.boidShape === BoidShape.CONE
                            ? new Float32Array(Cone(20, 0.25, 0.75))
                            : new Float32Array()
                        : new Float32Array([
                              // frontside
                              0.5, -0.5, 0, -0.5, -0.5, 0, 0, 0.5, 0,

                              // backside
                              -0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0,
                          ]),
            },
        };

        for (const attributeName of Object.keys(Attributes)) {
            const { count, value } = attributes[attributeName as Attributes];
            geometry.setAttribute(attributeName, new BufferAttribute(value, count));
        }

        return attributes;
    };

    private setupInstancedAttributes = (initialState: InitialState | undefined) => {
        const geometry = this.mesh.geometry;

        const iattributes = {
            [IAttributes.aPindex]: {
                count: 1,
                value: initialState
                    ? new Uint16Array([...initialState[IAttributes.aPindex]])
                    : new Uint16Array(this.count),
            },
            [IAttributes.aPosition]: {
                count: 3,
                value: initialState
                    ? new Float32Array([...initialState[IAttributes.aPosition]])
                    : new Float32Array(this.count * 3),
            },
            [IAttributes.aVelocity]: {
                count: 3,
                value: initialState
                    ? new Float32Array([...initialState[IAttributes.aVelocity]])
                    : new Float32Array(this.count * 3),
            },
        };

        const aPindex = iattributes[IAttributes.aPindex];
        const aPosition = iattributes[IAttributes.aPosition];
        const aVelocity = iattributes[IAttributes.aVelocity];

        if (!initialState) {
            for (let i = 0; i < this.count; i++) {
                aPindex.value[i] = i;

                const v = new Vector3().randomDirection().multiplyScalar(this.speed);

                for (let dim = 0; dim < aPosition.count; dim++) {
                    if (dim === SETTINGS.global.dimensions) continue;

                    aPosition.value[i * aPosition.count + dim] = randInRange(this.lowerBoundary, this.upperBoundary);
                    aVelocity.value[i * aVelocity.count + dim] = v.getComponent(dim);
                }
            }
        }

        for (const iattributeName of Object.keys(IAttributes)) {
            const { count, value } = iattributes[iattributeName as IAttributes];
            geometry.setAttribute(iattributeName, new InstancedBufferAttribute(value, count, false));
        }

        this.INITIAL_STATE.aPindex = Array.from(aPindex.value);
        this.INITIAL_STATE.aPosition = Array.from(aPosition.value);
        this.INITIAL_STATE.aVelocity = Array.from(aVelocity.value);

        return iattributes;
    };

    private setupSpatialPartitioning = () => {
        const spatialPartitioningBoxLength = ParticleSystem.SPATIAL_PARTITION_RESOLUTION / this.particleSize;
        const numBoxesPerDimension = Math.ceil(spatialPartitioningBoxLength * this.size);
        return new SpatialPartitioning(this.size, numBoxesPerDimension, numBoxesPerDimension, numBoxesPerDimension);
    };

    private clusterParticles = () => {
        const numClusters = randInRange(2, 7);
        const clusterBreakpoint = Math.floor(this.count / numClusters);
        const clusterSize = this.size / (2 * numClusters);

        const dimensions = this.getIAttributeDimensionality(IAttributes.aPosition);
        const clusterCenter = randVec3InRange(this.lowerBoundary, this.upperBoundary);

        for (let i = 0; i < this.count; i++) {
            if (i % clusterBreakpoint === 0) {
                clusterCenter.copy(randVec3InRange(this.lowerBoundary, this.upperBoundary));
            }

            const p = new Array(dimensions).fill(0);
            for (let dim = 0; dim < dimensions; dim++) {
                if (dim === SETTINGS.global.dimensions) continue;

                p[dim] = randInRange(
                    Math.max(this.lowerBoundary, clusterCenter.getComponent(dim) - clusterSize),
                    Math.min(this.upperBoundary, clusterCenter.getComponent(dim) + clusterSize)
                );
            }

            this.setParticlePosition(i, p);
        }

        this.INITIAL_STATE.aPindex = Array.from(this.accessIAttribute(IAttributes.aPindex));
        this.INITIAL_STATE.aPosition = Array.from(this.accessIAttribute(IAttributes.aPosition));
        this.INITIAL_STATE.aVelocity = Array.from(this.accessIAttribute(IAttributes.aVelocity));
    };

    private accessIAttribute = (iattr: IAttributes) => {
        return this.iattributes[iattr].value;
    };

    private getIAttributeDimensionality = (iattr: IAttributes) => {
        return this.iattributes[iattr].count;
    };

    private moveParticle = (particleId: ParticleId, tick: number) => {
        const p = this.getParticlePosition(particleId);
        const v = this.getParticleVelocity(particleId);
        this.setParticlePosition(particleId, p.add(v.multiplyScalar(tick)).toArray());
    };

    getSize = () => this.size;

    getCount = () => this.count;

    getParticleSize = () => this.particleSize;

    getSpeed = () => this.speed;

    setSpeed = (speed: number) => (this.speed = speed);

    getAttributes = () => this.attributes;

    getIAttributes = () => this.iattributes;

    getInitialStateData = () => JSON.stringify(this.INITIAL_STATE);

    getShader = () => this.shader;

    getMesh = () => this.mesh;

    getParticleIds = () => {
        return this.iattributes.aPindex.value;
    };

    getParticlePosition = (particleId: ParticleId) => {
        const cached = this.cache.get(particleId);

        if (cached?.position) {
            return cached.position;
        }

        const offset = particleId * this.getIAttributeDimensionality(IAttributes.aPosition);
        const positions = this.accessIAttribute(IAttributes.aPosition);
        const p = new Vector3(positions[offset], positions[offset + 1], positions[offset + 2]);

        if (cached) {
            cached.position = p;
        } else if (ParticleSystem.USE_CACHE) {
            this.cache.set(particleId, { position: p });
        }

        return p.clone();
    };

    setParticlePosition = (particleId: ParticleId, p: number[]) => {
        const positionDimensionality = this.getIAttributeDimensionality(IAttributes.aPosition);
        const offset = particleId * positionDimensionality;
        const positions = this.accessIAttribute(IAttributes.aPosition);
        const geometry = this.mesh.geometry;

        for (let i = 0; i < positionDimensionality; i++) {
            positions[offset + i] = p[i];
        }

        const cached = this.cache.get(particleId);
        if (cached) {
            cached.position = new Vector3(...p);
        } else if (ParticleSystem.USE_CACHE) {
            this.cache.set(particleId, { position: new Vector3(...p) });
        }

        geometry.attributes.aPosition.needsUpdate = true;
    };

    getParticleVelocity = (particleId: ParticleId) => {
        const cached = this.cache.get(particleId);

        if (cached?.velocity) {
            return cached.velocity;
        }

        const offset = particleId * this.getIAttributeDimensionality(IAttributes.aVelocity);
        const velocities = this.accessIAttribute(IAttributes.aVelocity);
        const v = new Vector3(velocities[offset], velocities[offset + 1], velocities[offset + 2]);

        if (cached) {
            cached.velocity = v;
        } else if (ParticleSystem.USE_CACHE) {
            this.cache.set(particleId, { velocity: v });
        }

        return v.clone();
    };

    setParticleVelocity = (particleId: ParticleId, v: number[]) => {
        const velocityDimensionality = this.getIAttributeDimensionality(IAttributes.aVelocity);
        const offset = particleId * velocityDimensionality;
        const velocities = this.accessIAttribute(IAttributes.aVelocity);
        const geometry = this.mesh.geometry;

        for (let i = 0; i < velocityDimensionality; i++) {
            velocities[offset + i] = v[i];
        }

        const cached = this.cache.get(particleId);
        if (cached) {
            cached.velocity = new Vector3(...v);
        } else if (ParticleSystem.USE_CACHE) {
            this.cache.set(particleId, { velocity: new Vector3(...v) });
        }

        geometry.attributes.aVelocity.needsUpdate = true;
    };

    getParticleClusterCentroid = (particleId: ParticleId) => {
        const particles = this.getPerceptibleParticles(particleId);

        if (particles.length === 0) return new Vector3();

        return particles
            .reduce((acc, p) => acc.add(this.getParticlePosition(p)), new Vector3())
            .divideScalar(particles.length);
    };

    getPerceptibleParticles = (particleId: ParticleId): ParticleId[] => {
        return this.neighborManager.getParticleNeighbors(particleId);
    };

    update = (elapsed: number, tick: number) => {
        if (!ParticleSystem.USE_CACHE && this.cache.size > 0) {
            throw new Error('Cache should be empty');
        }

        this.cache.clear();

        this.shader.uniforms.uTick.value = tick;

        const particleIdsArray = Array.from(this.getParticleIds());

        this.spatialPartitioning.update(particleIdsArray.map((id) => ({ id, p: this.getParticlePosition(id) })));

        this.neighborManager.update(particleIdsArray);

        this.getParticleIds().forEach((particleId) => {
            this.moveParticle(particleId, tick);
        });
    };

    withVisualization = () => {
        if (this.viz || !this.mesh.parent) return this;

        this.viz = new ParticleSystemVisualization(this.mesh.parent, this.size, this.particleSize, {
            opacity: 0.5,
        });

        if (PARAMETERS.ParticleSystem.withBoundaryVisualization) {
            this.viz.withBoundaryVisualization();
        }
        if (PARAMETERS.ParticleSystem.withBoundaryVisualization) {
            this.viz.withPointHighlight();
        }
        if (PARAMETERS.ParticleSystem.withBoundaryVisualization) {
            this.viz.withForceHighlight(Array.from(this.getParticleIds()));
        }
        if (PARAMETERS.ParticleSystem.withSpatialPartitioningVisualization) {
            this.withSpatialPartitioningVisualization();
        }

        return this;
    };

    withSpatialPartitioningVisualization = () => {
        if (!this.mesh.parent) return this;

        this.spatialPartitioning.withVisualization(this.mesh.parent, PARAMETERS.SpatialPartitioning.vizMode);
    };

    highlightParticle = (particleId: ParticleId) => {
        this.viz?.highlightPoint(this.getParticlePosition(particleId));
    };

    highlightForce = (particleId: ParticleId, forceName: string, direction: Vector3) => {
        this.viz?.highlightForce(particleId, forceName, this.getParticlePosition(particleId), direction);
    };

    copy = () => {
        const scene = this.mesh.parent as Scene;

        this.dispose();

        const options: ParticleSystemCopyOptions = {
            count: this.count,
            size: this.size,
            particleSize: this.particleSize,
            speed: this.speed,
        };

        if (!scene) {
            throw new Error('No scene parent found for mesh');
        }

        const psys = new ParticleSystem(scene, options);

        if (this.viz) {
            psys.withVisualization();
        }

        return psys;
    };

    dispose = () => {
        this.mesh.geometry.dispose();
        (this.mesh.material as Material).dispose();
        this.mesh.removeFromParent();

        if (this.viz) {
            this.viz.dispose();
        }

        this.spatialPartitioning.dispose();
    };
}

export * from './ParticleSystemTypes';
