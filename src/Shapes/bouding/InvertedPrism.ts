import { Matrix4, Vector3, Material, Scene, Raycaster, BackSide } from 'three';
import { Boundary } from './Boundary';
import { Prism } from './Prism';
import { EPSILON } from '../../Util/math';

export class InvertedPrism extends Prism implements Boundary {
    constructor(S: Matrix4, R: Matrix4, T: Matrix4, scene: Scene) {
        super(S, R, T, scene);

        (this.mesh.material as Material).side = BackSide;
    }

    intersectPoint = (p: Vector3) => {
        const centerToPoint = p.clone().sub(this.mesh.position).normalize();

        // Check if point is outside prism by casting from the mesh center to the point.
        const [intersection] = new Raycaster(
            this.mesh.position,
            centerToPoint,
            0,
            p.distanceTo(this.mesh.position)
        ).intersectObject(this.mesh);

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
            this.mesh.position,
            centerToPoint,
            0,
            this.longestDiagonal + EPSILON
        ).intersectObject(this.mesh);

        if (!reverseIntersection) {
            throw new Error(
                `InvertedPrism.intersectPoint: Intersection not found. \np: ${p.toArray()}; \ncenter: ${this.mesh.position.toArray()}; \npOutsideMesh: ${pOutsideMesh.toArray()}`
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
