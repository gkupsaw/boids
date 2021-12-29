import { Vector3 } from 'three';

export type IntersectionData = {
    ray: Ray;
    t: number;
    intersectionPoint: Vector3;
    distanceToIntersection: number;
    normal: Vector3;
};

export type Ray = {
    o: Vector3;
    d: Vector3;
};
