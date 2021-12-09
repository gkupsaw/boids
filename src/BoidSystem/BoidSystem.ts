import { Scene, Vector3 } from 'three';

import { GameObject } from '../types/GameObject';
import { ParticleSystem, ParticleSystemOptions } from '../ParticleSystem/ParticleSystem';

const DIMENSIONS = 2;

enum IAttributes {
    aPindex = 'aPindex',
    aInitialPosition = 'aInitialPosition',
    aVelocity = 'aVelocity',
    aTime = 'aTime',
}

export class BoidSystem implements GameObject {
    private psys: ParticleSystem;

    constructor(scene: Scene, options: ParticleSystemOptions = {}) {
        this.psys = new ParticleSystem(scene, options);
    }

    private separateFromNeighbors = (pIndex: number) => {
        const iattributes = this.psys.getIAttributes();
        const particleSize = this.psys.getParticleSize();
        const count = this.psys.getCount();
        const speed = this.psys.getSpeed();

        const dimIndex = pIndex * 3;
        const initialPositions = iattributes[IAttributes.aInitialPosition].value;
        const velocities = iattributes[IAttributes.aVelocity].value;
        const p = new Vector3(
            initialPositions[dimIndex],
            initialPositions[dimIndex + 1],
            initialPositions[dimIndex + 2]
        );

        const vAdjustment = new Vector3();
        const awareness = 1.5 * particleSize;
        const sensitivity = 80;
        for (let i = 0; i < count; i++) {
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
                .multiplyScalar(speed);

            this.psys.resetParticle(pIndex, 0, vAdjustment);
        }
    };

    private alignWithNeighbors = (pIndex: number) => {
        const iattributes = this.psys.getIAttributes();
        const particleSize = this.psys.getParticleSize();
        const count = this.psys.getCount();
        const speed = this.psys.getSpeed();

        const dimIndex = pIndex * 3;
        const initialPositions = iattributes[IAttributes.aInitialPosition].value;
        const velocities = iattributes[IAttributes.aVelocity].value;
        const p = new Vector3(
            initialPositions[dimIndex],
            initialPositions[dimIndex + 1],
            initialPositions[dimIndex + 2]
        );

        const vAdjustment = new Vector3();
        const awareness = 1.5 * particleSize;
        const sensitivity = 80;
        let n = 0;
        for (let i = 0; i < count; i++) {
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
                .multiplyScalar(speed);

            this.psys.resetParticle(pIndex, 0, vAdjustment);
        }
    };

    private avoidWalls = (pIndex: number) => {
        const iattributes = this.psys.getIAttributes();
        const particleSize = this.psys.getParticleSize();
        const speed = this.psys.getSpeed();
        const lowerBoundary = this.psys.lowerBoundary;
        const upperBoundary = this.psys.upperBoundary;

        const dimIndex = pIndex * 3;
        const initialPositions = iattributes[IAttributes.aInitialPosition].value;
        const velocities = iattributes[IAttributes.aVelocity].value;
        const times = iattributes[IAttributes.aTime].value;

        const time = times[pIndex];

        const awareness = 1.5 * particleSize;
        const sensitivity = 2;
        const w = [0, 0, 0];
        for (let i = 0; i < DIMENSIONS; i++) {
            const vi = velocities[dimIndex + i];
            const pf = initialPositions[dimIndex + i] + vi * time;

            if (pf <= lowerBoundary + awareness) {
                w[i] += (sensitivity * awareness) / Math.abs(pf);
            } else if (pf >= upperBoundary - awareness) {
                w[i] -= (sensitivity * awareness) / Math.abs(pf);
            }
        }

        const v = new Vector3(...w);
        if (v.lengthSq() > 0) {
            v.add(new Vector3(velocities[dimIndex], velocities[dimIndex + 1], velocities[dimIndex + 2]))
                .normalize()
                .multiplyScalar(speed);
            this.psys.resetParticle(pIndex, 0, v);
        }
    };

    update = (elapsed: number, tick: number, prevElapsed: number, prevTick: number) => {
        const count = this.psys.getCount();
        const geometry = this.psys.getMesh().geometry;
        const times = this.psys.getIAttributes()[IAttributes.aTime].value;
        this.psys.getShader().uniforms.uTime.value = elapsed;

        for (let i = 0; i < count; i++) {
            this.avoidWalls(i);
            this.separateFromNeighbors(i);
            this.alignWithNeighbors(i);
            times[i] += tick;
        }

        geometry.attributes.aTime.needsUpdate = true;
    };

    dispose = () => {
        this.psys.dispose();
    };
}
