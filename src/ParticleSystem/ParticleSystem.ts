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

const DIMENSIONS = 2;
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
    aInitialPosition = 'aInitialPosition',
    aVelocity = 'aVelocity',
    aTime = 'aTime',
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
            [IAttributes.aInitialPosition]: {
                count: 3,
                value: new Float32Array(this.count * 3),
            },
            [IAttributes.aVelocity]: {
                count: 3,
                value: new Float32Array(this.count * 3),
            },
            [IAttributes.aTime]: {
                count: 1,
                value: new Float32Array(this.count),
            },
        };

        const b = true;
        for (let i = 0; i < this.count; i++) {
            this.iattributes[IAttributes.aInitialPosition].value[i * 3 + 0] = b
                ? randInRange(this.lowerBoundary, this.upperBoundary)
                : randInRange(this.upperBoundary * 0.5, this.upperBoundary);
            // : (Math.floor(randInRange(0, 2)) === 0 ? 1 : -1) *
            //   randInRange(this.upperBoundary * 0.5, this.upperBoundary);
            this.iattributes[IAttributes.aInitialPosition].value[i * 3 + 1] = b
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

    private outOfBounds = (pIndex: number) => {
        const dimIndex = pIndex * 3;
        const initialPositions = this.iattributes[IAttributes.aInitialPosition].value;
        const velocities = this.iattributes[IAttributes.aVelocity].value;
        const times = this.iattributes[IAttributes.aTime].value;

        const time = times[pIndex];

        const n = [0, 0, 0];
        for (let i = 0; i < DIMENSIONS; i++) {
            const vi = velocities[dimIndex + i];
            const pf = initialPositions[dimIndex + i] + vi * time;
            if (pf <= this.lowerBoundary) {
                n[i] = 1;
                return new Vector3(...n);
            } else if (pf >= this.upperBoundary) {
                n[i] = -1;
                return new Vector3(...n);
            }
        }

        return new Vector3(...n);
    };

    private bounceOffWall = (pIndex: number, normal: Vector3, prevTick: number) => {
        const dimIndex = pIndex * 3;
        const velocities = this.iattributes[IAttributes.aVelocity].value;

        const vi = new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]);
        const vf = vi.clone().sub(normal.clone().multiplyScalar(2 * normal.clone().dot(vi)));

        this.setParticleVelocity(pIndex, prevTick, vf);
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

    getParticlePosition = (pIndex: number) => {
        const dimIndex = pIndex * 3;
        const initialPositions = this.iattributes[IAttributes.aInitialPosition].value;
        const velocities = this.iattributes[IAttributes.aVelocity].value;
        const times = this.iattributes[IAttributes.aTime].value;

        return new Vector3(
            initialPositions[dimIndex] + velocities[dimIndex] * times[pIndex],
            initialPositions[dimIndex + 1] + velocities[dimIndex + 1] * times[pIndex],
            initialPositions[dimIndex + 2] + velocities[dimIndex + 2] * times[pIndex]
        );
    };

    getParticleVelocity = (pIndex: number) => {
        const velocities = this.iattributes[IAttributes.aVelocity].value;
        const dimIndex = pIndex * 3;
        return new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]);
    };

    setParticleVelocity = (pIndex: number, prevTick: number, vf: Vector3) => {
        const dimIndex = pIndex * 3;
        const geometry = this.mesh.geometry;
        const initialPositions = this.iattributes[IAttributes.aInitialPosition].value;
        const velocities = this.iattributes[IAttributes.aVelocity].value;
        const times = this.iattributes[IAttributes.aTime].value;

        const elapsedTime = Math.max(times[pIndex] - prevTick, 0);

        const pi = new Vector3(
            initialPositions[dimIndex],
            initialPositions[dimIndex + 1],
            initialPositions[dimIndex + 2]
        );
        const vi = new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]);

        const pf = pi.clone().add(vi.clone().multiplyScalar(elapsedTime));

        initialPositions[dimIndex] = pf.x;
        initialPositions[dimIndex + 1] = pf.y;

        velocities[dimIndex] = vf.x;
        velocities[dimIndex + 1] = vf.y;

        times[pIndex] = 0;

        geometry.attributes.aInitialPosition.needsUpdate = true;
        geometry.attributes.aVelocity.needsUpdate = true;
        geometry.attributes.aTime.needsUpdate = true;
    };

    // Basic update for funsies
    update = (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => {
        const geometry = this.mesh.geometry;
        const times = this.iattributes[IAttributes.aTime].value;

        this.shader.uniforms.uTime.value = elapsed;

        for (let i = 0; i < this.count; i++) {
            const hitNormal = this.outOfBounds(i);
            if (hitNormal.lengthSq() > 0) {
                this.bounceOffWall(i, hitNormal, prevTick);
            }

            times[i] += tick;
        }

        geometry.attributes.aTime.needsUpdate = true;
    };

    dispose = () => {
        this.mesh.geometry.dispose();
        (this.mesh.material as Material).dispose();
    };
}
