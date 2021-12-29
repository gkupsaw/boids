import { Matrix4, Scene, BoxGeometry } from 'three';
import { AbstractInvertedBoundary } from './abstract/AbstractInvertedBoundary';

export class InvertedBoundingBox extends AbstractInvertedBoundary {
    constructor(scene: Scene, S: Matrix4, R: Matrix4, T: Matrix4) {
        super(new BoxGeometry(), scene, S, R, T);
    }
}
