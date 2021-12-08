import {
    AxesHelper,
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

type ParticleSystemOptions = {
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

    private lowerBoundary: number;
    private upperBoundary: number;
    private shader: { uniforms: { [uniformName: string]: any }; vert: string; frag: string };
    private attributes: { [key in Attributes]: Attribute };
    private iattributes: { [key in IAttributes]: Attribute };
    private mesh: Mesh;

    constructor(scene: Scene, { size = 2, count = 500, particleSize = 0.04, speed = 0.3 }: ParticleSystemOptions = {}) {
        if (particleSize >= size) {
            throw new Error('particleSize must be less than size');
        }

        this.size = size;
        this.count = count;
        this.particleSize = particleSize;
        this.speed = speed;
        this.lowerBoundary = -(this.size / 2 - this.particleSize / 2);
        this.upperBoundary = this.size / 2 - this.particleSize / 2;

        const shaders = Shaders();
        this.shader = shaders.boids;
        this.shader.uniforms.uSize.value = particleSize;

        const geometry = new InstancedBufferGeometry();

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

        for (let i = 0; i < this.count; i++) {
            this.iattributes[IAttributes.aInitialPosition].value[i * 3 + 0] = randInRange(
                this.lowerBoundary,
                this.upperBoundary
            );
            this.iattributes[IAttributes.aInitialPosition].value[i * 3 + 1] = randInRange(
                this.lowerBoundary,
                this.upperBoundary
            );

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

        // particle material
        const material = new ShaderMaterial({
            uniforms: shaders.boids.uniforms,
            vertexShader: shaders.boids.vert,
            fragmentShader: shaders.boids.frag,
        });

        const mesh = new Mesh(geometry, material);

        scene.add(mesh);

        this.mesh = mesh;
    }

    outOfBounds = (pIndex: number) => {
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

    resetParticle = (pIndex: number, prevTick: number, vf: Vector3) => {
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

    bounceOffWall = (pIndex: number, normal: Vector3, prevTick: number) => {
        const dimIndex = pIndex * 3;
        const velocities = this.iattributes[IAttributes.aVelocity].value;

        const vi = new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]);
        const vf = vi.clone().sub(normal.clone().multiplyScalar(2 * normal.clone().dot(vi)));

        this.resetParticle(pIndex, prevTick, vf);
    };

    separateFromNeighbors = (pIndex: number) => {
        const dimIndex = pIndex * 3;
        const initialPositions = this.iattributes[IAttributes.aInitialPosition].value;
        const velocities = this.iattributes[IAttributes.aVelocity].value;
        const p = new Vector3(
            initialPositions[dimIndex],
            initialPositions[dimIndex + 1],
            initialPositions[dimIndex + 2]
        );

        const vAdjustment = new Vector3();
        const awareness = 1.5 * this.particleSize;
        const sensitivity = 80;
        for (let i = 0; i < this.count; i++) {
            if (i !== pIndex) {
                const pi = new Vector3(
                    initialPositions[i * 3],
                    initialPositions[i * 3 + 1],
                    initialPositions[i * 3 + 2]
                );
                const d = p.distanceToSquared(pi);

                if (d < awareness) {
                    const avoidanceDir = p.clone().sub(pi).normalize();
                    vAdjustment.add(avoidanceDir.multiplyScalar(awareness / (d * sensitivity)));
                }
            }
        }

        if (vAdjustment.lengthSq() > 0) {
            vAdjustment
                .add(new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]))
                .normalize()
                .multiplyScalar(this.speed);

            this.resetParticle(pIndex, 0, vAdjustment);
        }
    };

    alignWithNeighbors = (pIndex: number) => {
        const dimIndex = pIndex * 3;
        const initialPositions = this.iattributes[IAttributes.aInitialPosition].value;
        const velocities = this.iattributes[IAttributes.aVelocity].value;
        const p = new Vector3(
            initialPositions[dimIndex],
            initialPositions[dimIndex + 1],
            initialPositions[dimIndex + 2]
        );

        const vAdjustment = new Vector3();
        const awareness = 1.5 * this.particleSize;
        const sensitivity = 80;
        let n = 0;
        for (let i = 0; i < this.count; i++) {
            if (i !== pIndex) {
                const pi = new Vector3(
                    initialPositions[i * 3],
                    initialPositions[i * 3 + 1],
                    initialPositions[i * 3 + 2]
                );
                const d = p.distanceToSquared(pi);

                if (d < awareness) {
                    n++;
                    vAdjustment.add(
                        new Vector3(velocities[i * 3], velocities[i * 3 + 1], velocities[i * 3 + 2]).multiplyScalar(
                            awareness / (d * sensitivity)
                        )
                    );
                }
            }
        }

        if (n > 0) {
            vAdjustment
                .add(new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]))
                .divideScalar(n + 1)
                .normalize()
                .multiplyScalar(this.speed);

            this.resetParticle(pIndex, 0, vAdjustment);
        }
    };

    avoidWalls = (pIndex: number) => {
        const dimIndex = pIndex * 3;
        const initialPositions = this.iattributes[IAttributes.aInitialPosition].value;
        const velocities = this.iattributes[IAttributes.aVelocity].value;
        const times = this.iattributes[IAttributes.aTime].value;

        const time = times[pIndex];

        const awareness = 1.5 * this.particleSize;
        const sensitivity = 2;
        const w = [0, 0, 0];
        for (let i = 0; i < DIMENSIONS; i++) {
            const vi = velocities[dimIndex + i];
            const pf = initialPositions[dimIndex + i] + vi * time;

            if (pf <= this.lowerBoundary + awareness) {
                w[i] += (sensitivity * awareness) / Math.abs(pf);
            } else if (pf >= this.upperBoundary - awareness) {
                w[i] -= (sensitivity * awareness) / Math.abs(pf);
            }
        }

        const v = new Vector3(...w);
        if (v.lengthSq() > 0) {
            v.add(new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]))
                .normalize()
                .multiplyScalar(this.speed);
            this.resetParticle(pIndex, 0, v);
        }
    };

    update = (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => {
        const geometry = this.mesh.geometry;
        const times = this.iattributes[IAttributes.aTime].value;

        this.shader.uniforms.uTime.value = elapsed;

        for (let i = 0; i < this.count; i++) {
            this.avoidWalls(i);
            this.separateFromNeighbors(i);
            this.alignWithNeighbors(i);

            // const hitNormal = this.outOfBounds(i);
            // if (hitNormal.lengthSq() > 0) {
            //     this.bounceOffWall(i, hitNormal, prevTick);
            // }

            times[i] += tick;
        }

        geometry.attributes.aTime.needsUpdate = true;
    };

    dispose = () => {
        this.mesh.geometry.dispose();
        (this.mesh.material as Material).dispose();
    };

    debug = () => {
        this.mesh.parent?.add(new AxesHelper(1));
    };
}
