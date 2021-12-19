import { ID, PointData, Point, BB, BBCluster, VizMode } from './SpatialPartitioningTypes';
import { LineCube } from './../Shapes/LineCube';
import { LineSquare } from './../Shapes/LineSquare';
import { Vector3, Object3D, Material, Line, LineBasicMaterial, BufferGeometry, Float32BufferAttribute } from 'three';

export class SpatialPartitioning {
    private readonly size: number;
    private readonly widthDivisions: number;
    private readonly heightDivisions: number;
    private readonly depthDivisions: number;
    private readonly trackClusters: boolean;

    private points: Record<number, Point>;
    private bbs: Record<number, BB>;
    private clusters: BBCluster[];

    private vizMode: VizMode;
    private viz!: Record<number, Line>;

    constructor(size: number, width: number, height: number, depth: number, { trackClusters = true } = {}) {
        this.size = size;
        this.widthDivisions = width;
        this.heightDivisions = height;
        this.depthDivisions = depth;
        this.trackClusters = trackClusters;

        this.bbs = {};
        this.points = {};
        this.clusters = [];

        this.vizMode = VizMode.NONE;
    }

    private isValidBBLocation = (x: number, y: number, z: number) => {
        return (
            x >= 0 && x < this.widthDivisions && y >= 0 && y < this.heightDivisions && z >= 0 && z < this.depthDivisions
        );
    };

    private getBBId = (x: number, y: number, z: number): number => {
        return x + y * this.widthDivisions + z * this.widthDivisions * this.heightDivisions;
    };

    private getOccupiedBBs = () => {
        return Object.values(this.bbs);
    };

    private insertPoint = (pointId: ID, p: Vector3) => {
        const boxX =
            Math.min(this.widthDivisions / 2 - 1, Math.max(-this.widthDivisions / 2, Math.floor(p.x / this.boxWidth))) +
            this.widthDivisions / 2;
        const boxY =
            Math.min(
                this.heightDivisions / 2 - 1,
                Math.max(-this.heightDivisions / 2, Math.floor(p.y / this.boxHeight))
            ) +
            this.heightDivisions / 2;
        const boxZ =
            Math.min(this.depthDivisions / 2 - 1, Math.max(-this.depthDivisions / 2, Math.floor(p.z / this.boxDepth))) +
            this.depthDivisions / 2;

        const bbId = this.getBBId(boxX, boxY, boxZ);

        if (this.bbs[bbId]) {
            this.bbs[bbId].points.push(pointId);
        } else {
            this.bbs[bbId] = { id: bbId, x: boxX, y: boxY, z: boxZ, points: [pointId], cluster: -1, visited: false };
        }

        this.points[pointId] = { id: pointId, p: p.clone(), bb: bbId };
    };

    private gatherCluster = (startingBB: BB) => {
        startingBB.visited = true;
        const valid = [startingBB];

        const center = new Vector3();
        let pCount = 0;

        const stack: BB[] = [startingBB];
        while (stack.length > 0) {
            const currBB = stack.pop();

            if (currBB) {
                const currX = currBB.x;
                const currY = currBB.y;
                const currZ = currBB.z;

                const neighbors: [number, number, number][] = [
                    [currX + 1, currY, currZ],
                    [currX - 1, currY, currZ],
                    [currX, currY + 1, currZ],
                    [currX, currY - 1, currZ],
                    [currX, currY, currZ + 1],
                    [currX, currY, currZ - 1],
                ];

                for (const [neighborX, neighborY, neighborZ] of neighbors) {
                    if (this.isValidBBLocation(neighborX, neighborY, neighborZ)) {
                        const neighborId = this.getBBId(neighborX, neighborY, neighborZ);
                        const neighbor = this.bbs[neighborId];

                        if (neighbor && !neighbor.visited) {
                            pCount += neighbor.points.length;
                            center.add(
                                neighbor.points.reduce((acc, pointId) => acc.add(this.points[pointId].p), new Vector3())
                            );

                            valid.push(neighbor);
                            neighbor.cluster = this.clusters.length;
                            neighbor.visited = true;
                            stack.push(neighbor);
                        }
                    }
                }
            }
        }

        center.multiplyScalar(1 / pCount);

        return { center, bbs: valid };
    };

    private gatherAllClusters = () => {
        const activeBBs = this.getOccupiedBBs();
        for (const bb of activeBBs) {
            if (!bb.visited) {
                const cluster = this.gatherCluster(bb);

                if (cluster.bbs.length > 1) {
                    this.clusters.push(cluster);
                } else if (cluster.bbs.length === 1) {
                    cluster.bbs[0].cluster = -1;
                }
            }
        }
    };

    get boxWidth() {
        return this.size / this.widthDivisions;
    }

    get boxHeight() {
        return this.size / this.heightDivisions;
    }

    get boxDepth() {
        return this.size / this.depthDivisions;
    }

    getSize = () => this.size;

    getWidth = () => this.widthDivisions;

    getHeight = () => this.heightDivisions;

    getDepth = () => this.depthDivisions;

    getBB = (x: number, y: number, z: number) => this.bbs[this.getBBId(x, y, z)];

    getClusterForPoint = (pointId: ID) => this.clusters[this.bbs[this.points[pointId].bb].cluster];

    clear = () => {
        if (this.vizMode !== VizMode.NONE) {
            this.getOccupiedBBs().forEach((bb) => {
                const mat = this.viz[this.getBBId(bb.x, bb.y, bb.z)].material as LineBasicMaterial;
                mat.opacity = 0;
            });
        }

        this.bbs = {};
        this.points = {};
        this.clusters = [];
    };

    update = (points: PointData[]) => {
        this.clear();

        // Reinitialize spatial partition
        points.forEach(({ id, p }) => {
            this.insertPoint(id, p);
        });

        if (this.trackClusters) {
            this.gatherAllClusters();
        }

        if (this.vizMode === VizMode.CLUSTER) {
            this.clusters.forEach(({ bbs }) => {
                bbs.forEach((bb) => {
                    const mat = this.viz[this.getBBId(bb.x, bb.y, bb.z)].material as LineBasicMaterial;
                    mat.opacity = 1;
                });
            });
        } else if (this.vizMode === VizMode.BB) {
            this.getOccupiedBBs().forEach((bb) => {
                const mat = this.viz[this.getBBId(bb.x, bb.y, bb.z)].material as LineBasicMaterial;
                mat.opacity = 1;
            });
        }
    };

    withVisualization = (parent: Object3D, vizMode: VizMode) => {
        if (this.viz) return this;

        this.vizMode = vizMode;

        const positions =
            this.depthDivisions > 1
                ? LineCube(this.boxWidth, this.boxHeight, this.boxDepth)
                : LineSquare(this.boxWidth, this.boxHeight);

        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3));

        this.viz = {};

        const worldWidth = (this.widthDivisions - 1) * this.boxWidth;
        const worldHeight = (this.heightDivisions - 1) * this.boxHeight;
        const worldDepth = (this.depthDivisions - 1) * this.boxDepth;
        for (let k = 0; k < this.depthDivisions; k++) {
            for (let i = 0; i < this.heightDivisions; i++) {
                for (let j = 0; j < this.widthDivisions; j++) {
                    const mat = new LineBasicMaterial({ color: 0x00ff00 });
                    mat.transparent = true;
                    mat.opacity = 0;
                    const box = new Line(geo, mat).computeLineDistances();
                    box.position.add(
                        new Vector3(
                            -worldWidth / 2 + this.boxWidth * j,
                            -worldHeight / 2 + this.boxHeight * i,
                            -worldDepth / 2 + this.boxDepth * k
                        )
                    );
                    box.scale.multiplyScalar(0.96);
                    this.viz[this.getBBId(j, i, k)] = box;
                }
            }
        }

        parent.add(...Object.values(this.viz));

        return this;
    };

    dispose = () => {
        if (this.viz) {
            Object.values(this.viz).forEach((box) => {
                box.geometry.dispose();
                (box.material as Material).dispose();
            });
        }
    };
}
