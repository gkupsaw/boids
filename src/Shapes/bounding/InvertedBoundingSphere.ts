import { Matrix4, Scene, SphereGeometry } from 'three';
import { AbstractInvertedBoundary } from './abstract/AbstractInvertedBoundary';

export class InvertedBoundingSphere extends AbstractInvertedBoundary {
    constructor(scene: Scene, S: Matrix4, R: Matrix4, T: Matrix4) {
        super(new SphereGeometry(0.5), scene, S, R, T);
    }
}
