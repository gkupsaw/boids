import { Vector3, Object3D, Material, Line, LineBasicMaterial, BufferGeometry, Float32BufferAttribute } from 'three';

import { PointId, PointData, Point, BB, BBCluster, VizMode, ClusterId, BBId } from './SpatialPartitioningTypes';
import { LineCube } from '../Shapes/LineCube';
import { LineSquare } from '../Shapes/LineSquare';
import { Counter } from '../Util/misc';

export class SpatialPartitioning {
    private readonly size: number;
    private readonly widthDivisions: number;
    private readonly heightDivisions: number;
    private readonly depthDivisions: number;
    private readonly trackClusters: boolean;

    private points: Record<PointId, Point>;
    private bbs: Record<BBId, BB>;
    private clusters: BBCluster[];

    private vizMode: VizMode;
    private viz!: Record<BBId, Line>;

    private readonly clusterIdGen: Counter;
    private static readonly DEFAULT_CLUSTER_ID: ClusterId = -1;

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

        this.clusterIdGen = new Counter();
    }

    private isValidBBIndices = (x: number, y: number, z: number) => {
        return (
            x >= 0 && x < this.widthDivisions && y >= 0 && y < this.heightDivisions && z >= 0 && z < this.depthDivisions
        );
    };

    private getBBId = (x: number, y: number, z: number): BBId => {
        return [x, y, z].join(':');
        // return x + y * this.widthDivisions + z * this.widthDivisions * this.heightDivisions;
    };

    private getBoxIndicesContainingPoint = (pointX: number, pointY: number, pointZ: number) => {
        const boxX = Math.min(
            this.widthDivisions - 1,
            Math.max(0, Math.floor((pointX / this.size) * this.widthDivisions + this.widthDivisions / 2))
        );
        const boxY = Math.min(
            this.heightDivisions - 1,
            Math.max(0, Math.floor((pointY / this.size) * this.heightDivisions + this.heightDivisions / 2))
        );
        const boxZ = Math.min(
            this.depthDivisions - 1,
            Math.max(0, Math.floor((pointZ / this.size) * this.depthDivisions + this.depthDivisions / 2))
        );

        const indices = new Vector3(boxX, boxY, boxZ);

        if (indices.toArray().some((i) => i !== Math.floor(i)))
            throw new Error('Indices must be whole numbers, got ' + indices.toArray());

        return indices;
    };

    private getBoxPositionFromIndices = (widthIndex: number, heightIndex: number, depthIndex: number) => {
        const worldWidth = this.size;
        const worldHeight = this.size;
        const worldDepth = this.size;

        const boxX = -worldWidth / 2 + this.boxWidth * widthIndex;
        const boxY = -worldHeight / 2 + this.boxHeight * heightIndex;
        const boxZ = -worldDepth / 2 + this.boxDepth * depthIndex;

        return new Vector3(boxX, boxY, boxZ);
    };

    private getNextClusterId = (): ClusterId => {
        return this.clusterIdGen.next();
    };

    private getOccupiedBBs = () => {
        return Object.values(this.bbs);
    };

    private insertPoint = (pointId: PointId, p: Vector3) => {
        const indices = this.getBoxIndicesContainingPoint(p.x, p.y, p.z);
        const bbId = this.getBBId(indices.x, indices.y, indices.z);

        if (this.bbs[bbId]) {
            this.bbs[bbId].points.push(pointId);
        } else {
            this.bbs[bbId] = {
                id: bbId,
                indices: indices,
                points: [pointId],
                cluster: SpatialPartitioning.DEFAULT_CLUSTER_ID,
                visited: false,
            };
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
                const currX = currBB.indices.x;
                const currY = currBB.indices.y;
                const currZ = currBB.indices.z;

                const neighbors: [number, number, number][] = [
                    [currX + 1, currY, currZ],
                    [currX - 1, currY, currZ],
                    [currX, currY + 1, currZ],
                    [currX, currY - 1, currZ],
                    [currX, currY, currZ + 1],
                    [currX, currY, currZ - 1],
                ];

                for (const [neighborX, neighborY, neighborZ] of neighbors) {
                    if (this.isValidBBIndices(neighborX, neighborY, neighborZ)) {
                        const neighborId = this.getBBId(neighborX, neighborY, neighborZ);
                        const neighbor = this.bbs[neighborId];

                        if (neighbor && !neighbor.visited) {
                            pCount += neighbor.points.length;
                            center.add(
                                neighbor.points.reduce((acc, pointId) => acc.add(this.points[pointId].p), new Vector3())
                            );

                            valid.push(neighbor);
                            neighbor.cluster = this.getNextClusterId();
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
                    cluster.bbs[0].cluster = SpatialPartitioning.DEFAULT_CLUSTER_ID;
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

    getClusterForPoint = (pointId: PointId) => {
        return this.clusters[this.bbs[this.points[pointId].bb].cluster];
    };

    clear = () => {
        if (this.viz && this.vizMode !== VizMode.NONE) {
            this.getOccupiedBBs().forEach((bb) => {
                const mat = this.viz[bb.id].material as LineBasicMaterial;
                mat.opacity = 0;
            });
        }

        this.bbs = {};
        this.points = {};
        this.clusters = [];
        this.clusterIdGen.reset();
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
                    const mat = this.viz[bb.id].material as LineBasicMaterial;
                    mat.opacity = 1;
                });
            });
        } else if (this.vizMode === VizMode.BB) {
            this.getOccupiedBBs().forEach((bb) => {
                const mat = this.viz[bb.id].material as LineBasicMaterial;
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

        for (let k = 0; k < this.depthDivisions; k++) {
            for (let i = 0; i < this.heightDivisions; i++) {
                for (let j = 0; j < this.widthDivisions; j++) {
                    const mat = new LineBasicMaterial({ color: 0x00ff00 });
                    mat.transparent = true;
                    mat.opacity = 0;
                    const box = new Line(geo, mat).computeLineDistances();

                    const boxPosition = this.getBoxPositionFromIndices(j, i, k);

                    box.position.add(boxPosition);
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
                box.removeFromParent();
            });
        }
    };
}
