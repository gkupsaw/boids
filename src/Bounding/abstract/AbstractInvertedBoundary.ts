import { Matrix4, Vector3, Material, Scene, Raycaster, BackSide, BufferGeometry } from 'three';
import { AbstractBoundary } from './AbstractBoundary';
import { EPSILON } from '../../Util/math';

export abstract class AbstractInvertedBoundary extends AbstractBoundary {
    constructor(geometry: BufferGeometry, scene: Scene, S: Matrix4, R: Matrix4, T: Matrix4) {
        super(geometry, scene, S, R, T);

        (this.getMesh().material as Material).side = BackSide;
    }

    intersectPoint = (p: Vector3) => {
        const mesh = this.getMesh();
        const centerToPoint = p.clone().sub(mesh.position).normalize();

        // Check if point is outside prism by casting from the mesh center to the point.
        const [intersection] = new Raycaster(
            mesh.position,
            centerToPoint,
            0,
            p.distanceTo(mesh.position)
        ).intersectObject(mesh);

        if (intersection) {
            return {
                ...intersection,
                face: intersection.face
                    ? { ...intersection.face, normal: intersection.face.normal.clone().negate() }
                    : undefined,
                distance: 0,
                distanceToRay: 0,
            };
        }

        // The point is inside mesh, so take a point outside the mesh that's on the ray
        // in order to find where the ray intersects the mesh from the inside along that ray.
        const pOutsideMesh = p.clone().add(centerToPoint.clone().multiplyScalar(this.longestDiagonal + EPSILON));
        const [reverseIntersection] = new Raycaster(
            mesh.position,
            centerToPoint,
            0,
            this.longestDiagonal + EPSILON
        ).intersectObject(mesh);

        if (!reverseIntersection) {
            throw new Error(
                `InvertedPrism.intersectPoint: Intersection not found. \np: ${p.toArray()}; \ncenter: ${mesh.position.toArray()}; \npOutsideMesh: ${pOutsideMesh.toArray()}`
            );
        }

        const actualDistance = reverseIntersection.point.distanceTo(p);

        return {
            ...reverseIntersection,
            face: reverseIntersection.face
                ? { ...reverseIntersection.face, normal: reverseIntersection.face.normal.clone().negate() }
                : undefined,
            distance: actualDistance,
            distanceToRay: actualDistance,
        };
    };
}
