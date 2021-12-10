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

import { GameObject } from '../types/GameObject';
import { Shaders } from '../gl/shaders';

const randInRange = (min: number, max: number) => Math.random() * (max - min) + min;

export type ParticleSystemOptions = {
    size?: number;
    count?: number;
    particleSize?: number;
    speed?: number;
};

type Attribute = {
    count: number;
    value: Float64Array | Float32Array | Int32Array | Int16Array | Int8Array | Uint32Array | Uint16Array | Uint8Array;
};

enum Attributes {
    position = 'position',
}

enum IAttributes {
    aPindex = 'aPindex',
    aPosition = 'aPosition',
    aVelocity = 'aVelocity',
}

export class ParticleSystem implements GameObject {
    private count: number;
    private size: number;
    private particleSize: number;
    private speed: number;

    private shader: { uniforms: { [uniformName: string]: any }; vert: string; frag: string };
    private attributes!: { [key in Attributes]: Attribute };
    private iattributes!: { [key in IAttributes]: Attribute };
    private mesh: Mesh;

    constructor(scene: Scene, { size = 2, count = 500, particleSize = 0.04, speed = 0.3 }: ParticleSystemOptions = {}) {
        if (particleSize >= size) {
            throw new Error('particleSize must be less than size');
        }

        this.size = size;
        this.count = count;
        this.particleSize = particleSize;
        this.speed = speed;

        const shaders = Shaders();
        this.shader = shaders.boids;
        this.shader.uniforms.uSize.value = particleSize;

        const geometry = new InstancedBufferGeometry();

        this.setupAttributes(geometry);
        this.setupInstancedAttributes(geometry);

        const material = new ShaderMaterial({
            uniforms: shaders.boids.uniforms,
            vertexShader: shaders.boids.vert,
            fragmentShader: shaders.boids.frag,
        });

        this.mesh = new Mesh(geometry, material);

        scene.add(this.mesh);
    }

    private setupAttributes = (geometry: InstancedBufferGeometry) => {
        this.attributes = {
            [Attributes.position]: {
                count: 3,
                value: new Float32Array([
                    -0.5, 0, 0, 0.5, 0, 0, -0.5, 0.5, 0,

                    0.5, 0, 0, -0.5, 0, 0, -0.5, -0.5, 0,
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

        const b = true;
        for (let i = 0; i < this.count; i++) {
            this.iattributes[IAttributes.aPosition].value[i * 3 + 0] = b
                ? randInRange(this.lowerBoundary, this.upperBoundary)
                : randInRange(this.upperBoundary * 0.5, this.upperBoundary);
            // : (Math.floor(randInRange(0, 2)) === 0 ? 1 : -1) *
            //   randInRange(this.upperBoundary * 0.5, this.upperBoundary);
            this.iattributes[IAttributes.aPosition].value[i * 3 + 1] = b
                ? randInRange(this.lowerBoundary, this.upperBoundary)
                : randInRange(this.upperBoundary * 0.5, this.upperBoundary);
            // : (Math.floor(randInRange(0, 2)) === 0 ? 1 : -1) *
            //   randInRange(this.upperBoundary * 0.5, this.upperBoundary);

            const v = new Vector3(1, 0, 0)
                .applyAxisAngle(new Vector3(0, 0, 1), Math.random() * 2 * Math.PI)
                .multiplyScalar(this.speed);
            this.iattributes[IAttributes.aVelocity].value[i * 3] = v.x;
            this.iattributes[IAttributes.aVelocity].value[i * 3 + 1] = v.y;

            this.iattributes[IAttributes.aPindex].value[i] = i;
        }

        for (const iattributeName of Object.keys(IAttributes)) {
            const { count, value } = this.iattributes[iattributeName as IAttributes];
            geometry.setAttribute(iattributeName, new InstancedBufferAttribute(value, count, false));
        }
    };

    private accessAttribute = (attr: Attributes) => {
        return this.attributes[attr].value;
    };

    private accessIAttribute = (iattr: IAttributes) => {
        return this.iattributes[iattr].value;
    };

    private moveParticle = (particleId: number, tick: number) => {
        const p = this.getParticlePosition(particleId);
        const v = this.getParticleVelocity(particleId);
        this.setParticlePosition(particleId, p.add(v.multiplyScalar(tick)));
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
        const offset = particleId * 3;
        const positions = this.accessIAttribute(IAttributes.aPosition);
        return new Vector3(positions[offset], positions[offset + 1], positions[offset + 2]);
    };

    setParticlePosition = (particleId: number, p: Vector3) => {
        const offset = particleId * 3;
        const positions = this.accessIAttribute(IAttributes.aPosition);
        const geometry = this.mesh.geometry;

        positions[offset] = p.x;
        positions[offset + 1] = p.y;
        positions[offset + 2] = p.z;

        geometry.attributes.aPosition.needsUpdate = true;
    };

    getParticleVelocity = (particleId: number) => {
        const offset = particleId * 3;
        const velocities = this.accessIAttribute(IAttributes.aVelocity);
        return new Vector3(velocities[offset], velocities[offset + 1], velocities[offset + 2]);
    };

    setParticleVelocity = (particleId: number, v: Vector3) => {
        const offset = particleId * 3;
        const velocities = this.accessIAttribute(IAttributes.aVelocity);
        const geometry = this.mesh.geometry;

        velocities[offset] = v.x;
        velocities[offset + 1] = v.y;
        velocities[offset + 2] = v.z;

        geometry.attributes.aVelocity.needsUpdate = true;
    };

    // Basic update for funsies
    update = (elapsed: number, tick: number) => {
        this.shader.uniforms.uTick.value = tick;

        this.getParticleIds().forEach((particleId) => {
            this.moveParticle(particleId, tick);
        });
    };

    dispose = () => {
        this.mesh.geometry.dispose();
        (this.mesh.material as Material).dispose();
    };
}
