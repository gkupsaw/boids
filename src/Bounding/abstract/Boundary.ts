import { Intersection, Vector3 } from 'three';
import { IntersectionData, Ray } from '../RayTypes';

export interface Boundary {
    // intersect: (r: Ray, t: number) => IntersectionData | null;

    intersectPoint: (p: Vector3) => Intersection;

    // isPointInside: (p: Vector3) => boolean;

    withVisualization: () => void;

    dispose: () => void;
}
