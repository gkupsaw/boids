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

import { Dimensions, Attribute, Attributes, IAttributes, ParticleSystemOptions } from './ParticleSystemTypes';
import { VizMode } from '../SpatialPartitioning/SpatialPartitioningTypes';
import { GameObject } from '../types/GameObject';

import { Shaders } from '../gl/shaders';
import { SpatialPartitioning } from '../SpatialPartitioning/SpatialPartitioning';
import { Cone } from '../Shapes/Cone';

const randInRange = (min: number, max: number) => Math.random() * (max - min) + min;

const DIMENSIONS: Dimensions = Dimensions.xyz;

export class ParticleSystem implements GameObject {
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

    // debug
    private viz!: Mesh;
    private highlight!: Mesh;

    private static readonly DEFAULT_SYSTEM_SIZE = 1;
    private static readonly DEFAULT_PARTICLE_SIZE = 1;
    private static readonly DEFAULT_SPEED = 1;

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

        this.spatialPartitioning = new SpatialPartitioning(this.size, 20, 20, 20, { trackClusters: true });

        scene.add(this.mesh);
    }

    private setupAttributes = (geometry: InstancedBufferGeometry) => {
        this.attributes = {
            [Attributes.position]: {
                count: 3,
                value:
                    DIMENSIONS === Dimensions.xyz
                        ? new Float32Array(Cone(20, 0.25, 0.75))
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

            // TODO: automate dimension change (VectorX)
            const v = new Vector3(1, 0, 0)
                .applyAxisAngle(new Vector3(0, 0, 1), Math.random() * 2 * Math.PI)
                .multiplyScalar(this.speed);

            for (let dim = 0; dim < aPosition.count; dim++) {
                if (dim === DIMENSIONS) continue;

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

    private moveParticle = (particleId: number, tick: number) => {
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

    getParticlePosition = (particleId: number) => {
        const offset = particleId * this.getIAttributeDimensionality(IAttributes.aPosition);
        const positions = this.accessIAttribute(IAttributes.aPosition);
        return new Vector3(positions[offset], positions[offset + 1], positions[offset + 2]);
    };

    setParticlePosition = (particleId: number, p: number[]) => {
        const positionDimensionality = this.getIAttributeDimensionality(IAttributes.aPosition);
        const offset = particleId * positionDimensionality;
        const positions = this.accessIAttribute(IAttributes.aPosition);
        const geometry = this.mesh.geometry;

        for (let i = 0; i < positionDimensionality; i++) {
            positions[offset + i] = p[i];
        }

        geometry.attributes.aPosition.needsUpdate = true;
    };

    getParticleVelocity = (particleId: number) => {
        const offset = particleId * this.getIAttributeDimensionality(IAttributes.aVelocity);
        const velocities = this.accessIAttribute(IAttributes.aVelocity);
        return new Vector3(velocities[offset], velocities[offset + 1], velocities[offset + 2]);
    };

    setParticleVelocity = (particleId: number, v: number[]) => {
        const velocityDimensionality = this.getIAttributeDimensionality(IAttributes.aVelocity);
        const offset = particleId * velocityDimensionality;
        const velocities = this.accessIAttribute(IAttributes.aVelocity);
        const geometry = this.mesh.geometry;

        for (let i = 0; i < velocityDimensionality; i++) {
            velocities[offset + i] = v[i];
        }

        geometry.attributes.aVelocity.needsUpdate = true;
    };

    getParticleCluster = (particleId: number) => this.spatialPartitioning.getClusterForPoint(particleId);

    // Basic update for funsies
    update = (elapsed: number, tick: number) => {
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

        this.spatialPartitioning.withVisualization(this.mesh.parent, VizMode.BB);

        const geo = new BoxGeometry(this.size, this.size, this.size);

        const mat = new LineBasicMaterial({ color: 0x000000 });
        mat.transparent = true;
        mat.opacity = 0.5;

        this.viz = new Mesh(geo, mat);

        this.mesh.parent.add(this.viz);

        return this;
    };

    highlightParticle = (particleId: number) => {
        if (!this.highlight) {
            const mat = new MeshBasicMaterial({ color: 0xff0000 });
            mat.transparent = true;
            mat.opacity = 0.5;

            this.highlight = new Mesh(new SphereGeometry(this.particleSize, 10, 10), mat);
            this.mesh.parent?.add(this.highlight);
        }

        this.highlight.position.copy(this.getParticlePosition(particleId));
    };

    dispose = () => {
        this.mesh.geometry.dispose();
        (this.mesh.material as Material).dispose();

        if (this.viz) {
            this.viz.geometry.dispose();
            (this.viz.material as Material).dispose();
        }

        if (this.highlight) {
            this.highlight.geometry.dispose();
            (this.highlight.material as Material).dispose();
        }

        this.spatialPartitioning.dispose();
    };
}

export * from './ParticleSystemTypes';
