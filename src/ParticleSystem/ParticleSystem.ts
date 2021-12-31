import {
    BoxGeometry,
    BufferAttribute,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    LineBasicMaterial,
    Material,
    Mesh,
    MeshBasicMaterial,
    Scene,
    ShaderMaterial,
    SphereGeometry,
    Vector3,
} from 'three';

import {
    Attribute,
    Attributes,
    IAttributes,
    ParticleSystemOptions,
    ParticleSystemCopyOptions,
    ParticleId,
} from './ParticleSystemTypes';
import { VizMode } from '../SpatialPartitioning/SpatialPartitioningTypes';
import { GameObject } from '../types/GameObject';
import { Dimensions } from '../types/Dimensions';
import { SETTINGS } from '../Settings/Settings';

import { Shaders } from '../gl/shaders';
import { SpatialPartitioning } from '../SpatialPartitioning/SpatialPartitioning';
import { Cone } from '../Shapes/Cone';
import { Sphere } from '../Shapes/Sphere';
import { randInRange } from '../Util/misc';

enum BoidShape {
    CONE,
    SPHERE,
}

const BOID_SHAPE: BoidShape = BoidShape.CONE;

export class ParticleSystem implements GameObject<ParticleSystem> {
    private readonly count: number;
    private readonly size: number;
    private readonly particleSize: number;
    private readonly speed: number;

    private readonly shader: {
        uniforms: { [uniformName: string]: any };
        vert: string;
        frag: string;
    };
    private attributes!: { [key in Attributes]: Attribute };
    private iattributes!: { [key in IAttributes]: Attribute };
    private readonly mesh: Mesh;
    private readonly spatialPartitioning: SpatialPartitioning;
    private readonly spatialPartitioningBoxLength: number;

    private readonly cache: Map<ParticleId, { position?: Vector3; velocity?: Vector3 }>;

    // debug
    private viz!: Mesh;
    private highlight!: Mesh;

    private static readonly DEFAULT_SYSTEM_SIZE = 1;
    private static readonly DEFAULT_PARTICLE_SIZE = 1;
    private static readonly DEFAULT_SPEED = 1;
    private static readonly SPATIAL_PARTITION_RESOLUTION = 0.25;

    constructor(scene: Scene, options: ParticleSystemOptions) {
        this.count = options.count;
        this.size = options.size ?? ParticleSystem.DEFAULT_SYSTEM_SIZE;
        this.particleSize = options.particleSize ?? ParticleSystem.DEFAULT_PARTICLE_SIZE;
        this.speed = options.speed ?? ParticleSystem.DEFAULT_SPEED;

        if (this.particleSize >= this.size) {
            throw new Error('particleSize must be less than size');
        }

        const shaders = Shaders();
        this.shader = shaders.boids;
        this.shader.uniforms.uSize.value = this.particleSize;

        const geometry = new InstancedBufferGeometry();

        this.setupAttributes(geometry);
        this.setupInstancedAttributes(geometry);

        const material = new ShaderMaterial({
            uniforms: shaders.boids.uniforms,
            vertexShader: shaders.boids.vert,
            fragmentShader: shaders.boids.frag,
        });

        this.mesh = new Mesh(geometry, material);

        this.spatialPartitioningBoxLength = ParticleSystem.SPATIAL_PARTITION_RESOLUTION / this.particleSize;

        const numBoxesPerDimension = Math.ceil(this.spatialPartitioningBoxLength * this.size);
        this.spatialPartitioning = new SpatialPartitioning(
            this.size,
            numBoxesPerDimension,
            numBoxesPerDimension,
            numBoxesPerDimension,
            { trackClusters: true }
        );

        scene.add(this.mesh);

        this.cache = new Map<ParticleId, { position?: Vector3; velocity?: Vector3 }>();
    }

    private setupAttributes = (geometry: InstancedBufferGeometry) => {
        this.attributes = {
            [Attributes.position]: {
                count: 3,
                value:
                    SETTINGS.global.dimensions === Dimensions.xyz
                        ? BOID_SHAPE === BoidShape.SPHERE
                            ? new Float32Array(Sphere(8, 0.25))
                            : new Float32Array(Cone(20, 0.25, 0.75))
                        : new Float32Array([
                              // frontside
                              0.5, -0.5, 0, -0.5, -0.5, 0, 0, 0.5, 0,

                              // backside
                              -0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0,
                          ]),
            },
        };

        for (const attributeName of Object.keys(Attributes)) {
            const { count, value } = this.attributes[attributeName as Attributes];
            geometry.setAttribute(attributeName, new BufferAttribute(value, count));
        }
    };

    private setupInstancedAttributes = (geometry: InstancedBufferGeometry) => {
        this.iattributes = {
            [IAttributes.aPindex]: {
                count: 1,
                value: new Uint16Array(this.count),
            },
            [IAttributes.aPosition]: {
                count: 3,
                value: new Float32Array(this.count * 3),
            },
            [IAttributes.aVelocity]: {
                count: 3,
                value: new Float32Array(this.count * 3),
            },
        };

        const aPindex = this.iattributes[IAttributes.aPindex];
        const aPosition = this.iattributes[IAttributes.aPosition];
        const aVelocity = this.iattributes[IAttributes.aVelocity];

        const coverWholeSpace = true;
        for (let i = 0; i < this.count; i++) {
            aPindex.value[i] = i;

            const v = new Vector3().randomDirection().multiplyScalar(this.speed);

            for (let dim = 0; dim < aPosition.count; dim++) {
                if (dim === SETTINGS.global.dimensions) continue;

                aPosition.value[i * aPosition.count + dim] = coverWholeSpace
                    ? randInRange(this.lowerBoundary, this.upperBoundary)
                    : randInRange(this.upperBoundary * 0.5, this.upperBoundary);
                aVelocity.value[i * aVelocity.count + dim] = v.getComponent(dim);
            }
        }

        for (const iattributeName of Object.keys(IAttributes)) {
            const { count, value } = this.iattributes[iattributeName as IAttributes];
            geometry.setAttribute(iattributeName, new InstancedBufferAttribute(value, count, false));
        }
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

    get lowerBoundary() {
        return -(this.size / 2 - this.particleSize / 2);
    }

    get upperBoundary() {
        return this.size / 2 - this.particleSize / 2;
    }

    getSize = () => this.size;

    getCount = () => this.count;

    getParticleSize = () => this.particleSize;

    getSpeed = () => this.speed;

    getAttributes = () => this.attributes;

    getIAttributes = () => this.iattributes;

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
        } else {
            this.cache.set(particleId, { position: p });
        }

        return p;
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
        } else {
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
        } else {
            this.cache.set(particleId, { velocity: v });
        }

        return v;
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
        } else {
            this.cache.set(particleId, { velocity: new Vector3(...v) });
        }

        geometry.attributes.aVelocity.needsUpdate = true;
    };

    getParticleCluster = (particleId: ParticleId) => {
        return this.spatialPartitioning.getClusterForPoint(particleId);
    };

    getPerceptibleParticles = (particleId: ParticleId, perceptionDistance: number): ParticleId[] => {
        return this.spatialPartitioning.getPointsInRangeOfPoint(particleId, perceptionDistance);
    };

    update = (elapsed: number, tick: number) => {
        this.cache.clear();

        this.shader.uniforms.uTick.value = tick;

        this.spatialPartitioning.update(
            Array.from(this.getParticleIds()).map((id) => ({ id, p: this.getParticlePosition(id) }))
        );

        this.getParticleIds().forEach((particleId) => {
            this.moveParticle(particleId, tick);
        });
    };

    withVisualization = () => {
        if (this.viz || !this.mesh.parent) return this;

        this.spatialPartitioning.withVisualization(this.mesh.parent, VizMode.CLUSTER);

        const geo = new BoxGeometry(this.size, this.size, this.size);

        const mat = new LineBasicMaterial({ color: 0x000000 });
        mat.transparent = true;
        mat.opacity = 0.5;

        this.viz = new Mesh(geo, mat);

        this.mesh.parent.add(this.viz);

        return this;
    };

    highlightParticle = (particleId: ParticleId) => {
        if (!this.highlight) {
            const mat = new MeshBasicMaterial({ color: 0xff0000 });
            mat.transparent = true;
            mat.opacity = 0.5;

            this.highlight = new Mesh(new SphereGeometry(this.particleSize, 10, 10), mat);
            this.mesh.parent?.add(this.highlight);
        }

        this.highlight.position.copy(this.getParticlePosition(particleId));
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

        return new ParticleSystem(scene, options);
    };

    dispose = () => {
        this.mesh.geometry.dispose();
        (this.mesh.material as Material).dispose();
        this.mesh.removeFromParent();

        if (this.viz) {
            this.viz.geometry.dispose();
            (this.viz.material as Material).dispose();
            this.viz.removeFromParent();
        }

        if (this.highlight) {
            this.highlight.geometry.dispose();
            (this.highlight.material as Material).dispose();
            this.highlight.removeFromParent();
        }

        this.spatialPartitioning.dispose();
    };
}

export * from './ParticleSystemTypes';
