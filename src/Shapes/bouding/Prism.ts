import { Matrix4, Vector3, Mesh, BoxGeometry, Material, Scene, Raycaster, MeshPhongMaterial } from 'three';
import { Boundary } from './Boundary';
import { EPSILON } from '../../Util/math';
import { IntersectionData, Ray } from './RayTypes';

export class Prism implements Boundary {
    protected readonly S: Matrix4;
    protected readonly R: Matrix4;
    protected readonly T: Matrix4;
    protected readonly U: Matrix4;
    protected readonly invU: Matrix4;

    protected mesh!: Mesh;

    constructor(S: Matrix4, R: Matrix4, T: Matrix4, scene: Scene) {
        this.S = S;
        this.R = R;
        this.T = T;
        this.U = T.clone().multiply(R).multiply(S);
        this.invU = this.U.clone().invert();

        this.mesh = new Mesh(new BoxGeometry(), new MeshPhongMaterial({ transparent: true, opacity: 0 }));
        this.mesh.applyMatrix4(this.U);
        this.mesh.geometry.computeBoundingBox();

        scene.add(this.mesh);
    }

    get longestDiagonal() {
        return Math.max(...this.S.toArray()) * Math.SQRT2;
    }

    intersectPoint = (p: Vector3) => {
        const dir = this.mesh.position.clone().sub(p).normalize();
        // Only testing one mesh, so may as well skip the sqrt.
        const dSquared = p.distanceToSquared(this.mesh.position);

        const [intersection] = new Raycaster(p, dir, 0, dSquared).intersectObject(this.mesh);

        if (intersection) {
            return intersection;
        }

        // The point is inside mesh, so take a point outside the mesh that's on the ray
        // in order to find where the ray intersects the mesh from the outside along that ray.
        const reverseDir = dir.clone().negate();
        const pOutsideMesh = p.clone().add(reverseDir.clone().multiplyScalar(this.longestDiagonal + EPSILON));
        const reverseDSquared = pOutsideMesh.distanceToSquared(this.mesh.position);
        const [reverseIntersection] = new Raycaster(pOutsideMesh, dir, 0, reverseDSquared).intersectObject(this.mesh);

        if (!reverseIntersection) {
            throw new Error(
                `Prism.intersectPoint: Intersection not found. \np: ${p.toArray()}; \ncenter: ${this.mesh.position.toArray()}; \ndir: ${dir.toArray()};\nreverseDir: ${reverseDir.toArray()}; \ndistance: ${dSquared}; \nreverseDistance: ${reverseDSquared}`
            );
        }

        return { ...reverseIntersection, distance: 0 };
    };

    intersect = (ray: Ray, t: number) => {
        // const p = ray.o.clone().add(ray.d.clone().multiplyScalar(t));
        // const distanceToIntersection = this.box.distanceToPoint(p);
        // const intersectionPoint = p.clone().add(ray.d.clone().multiplyScalar(distanceToIntersection));
        // const dirToIntersection = intersectionPoint.clone().sub(ray.o).normalize();

        const intersections = new Raycaster(ray.o, ray.d, 0, t).intersectObject(this.mesh);

        if (intersections.length) {
            const intersection = intersections[0];
            const intersectionData: IntersectionData = {
                ray,
                t,
                intersectionPoint: intersection.point,
                distanceToIntersection: intersection.distance,
                normal: intersection.face?.normal ?? new Vector3(),
            };

            return intersectionData;
        }

        return null;
    };

    // isPointInside = (p: Vector3) => {
    //     const pCubeSpace = new Vector4(p.x, p.y, p.z, 1).applyMatrix4(this.invU);

    //     return Math.max(...pCubeSpace.toArray().map((v) => Math.abs(v))) - 1.0 < EPSILON;
    // };

    withVisualization = () => {
        (this.mesh.material as Material).opacity = 0.5;
    };

    dispose = () => {
        this.mesh.geometry.dispose();
        (this.mesh.material as Material).dispose();
        this.mesh.removeFromParent();
    };
}
