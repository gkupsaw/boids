import {
    Vector3,
    Object3D,
    Material,
    Line,
    LineBasicMaterial,
    BufferGeometry,
    Float32BufferAttribute,
    Mesh,
    SphereGeometry,
    MeshPhongMaterial,
    BoxGeometry,
} from 'three';

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
    private readonly minBBsInCluster: number;

    private points: Record<PointId, Point>;
    private bbs: Record<BBId, BB>;
    private clusters: BBCluster[];

    private readonly clusterCenterVisualizationMesh: Mesh;
    private readonly clusterCenterVisualizations: Object3D;
    private bbVisualization!: Mesh | Line;

    private vizMode: VizMode;
    private viz!: Record<BBId, Mesh | Line>;

    private readonly clusterIdGen: Counter;
    private static readonly DEFAULT_CLUSTER_ID: ClusterId = -1;

    constructor(
        size: number,
        width: number,
        height: number,
        depth: number,
        { trackClusters = true, minBBsInCluster = 1 } = {}
    ) {
        this.size = size;
        this.widthDivisions = width;
        this.heightDivisions = height;
        this.depthDivisions = depth;
        this.trackClusters = trackClusters;
        this.minBBsInCluster = minBBsInCluster;

        this.bbs = {};
        this.points = {};
        this.clusters = [];

        this.clusterCenterVisualizationMesh = new Mesh(
            new SphereGeometry(this.boxDepth, 10, 10),
            new MeshPhongMaterial({ color: 0xff0000 })
        );
        (this.clusterCenterVisualizationMesh.material as Material).transparent = true;
        (this.clusterCenterVisualizationMesh.material as Material).opacity = 0.8;
        this.clusterCenterVisualizations = new Object3D();

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
            throw new Error(
                'Indices must be whole numbers, got ' + indices.toArray() + ' for ' + [pointX, pointY, pointZ]
            );

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
        const clusterId = this.getNextClusterId();
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
                            neighbor.cluster = clusterId;
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

                if (cluster.bbs.length > this.minBBsInCluster) {
                    this.clusters.push(cluster);
                } else {
                    cluster.bbs.forEach((bb) => (bb.cluster = SpatialPartitioning.DEFAULT_CLUSTER_ID));
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

    getBBForPoint = (pointId: PointId) => {
        return this.bbs[this.points[pointId].bb];
    };

    getClusterForPoint = (pointId: PointId) => {
        return this.clusters[this.getBBForPoint(pointId).cluster];
    };

    getPointsInRangeOfPoint = (pointId: PointId, range: number) => {
        const points: PointId[] = [];

        const p = this.points[pointId].p;

        const initialBoxNegativeX = Math.floor((p.x - range) / this.boxWidth + this.widthDivisions / 2);
        const initialBoxPositiveX = Math.ceil((p.x + range) / this.boxWidth + this.widthDivisions / 2);

        const initialBoxNegativeY = Math.floor((p.y - range) / this.boxHeight + this.heightDivisions / 2);
        const initialBoxPositiveY = Math.ceil((p.y + range) / this.boxHeight + this.heightDivisions / 2);

        const initialBoxNegativeZ = Math.floor((p.z - range) / this.boxDepth + this.depthDivisions / 2);
        const initialBoxPositiveZ = Math.ceil((p.z + range) / this.boxDepth + this.depthDivisions / 2);

        for (let i = initialBoxNegativeX; i < initialBoxPositiveX; i++) {
            for (let j = initialBoxNegativeY; j < initialBoxPositiveY; j++) {
                for (let k = initialBoxNegativeZ; k < initialBoxPositiveZ; k++) {
                    if (this.isValidBBIndices(i, j, k)) {
                        const bb = this.getBB(i, j, k);

                        if (bb) {
                            if (this.vizMode === VizMode.PROXIMITY_QUERIES) {
                                this.highlightBBs([bb.id]);
                            }

                            // if (
                            //     i === initialBoxNegativeX ||
                            //     i === initialBoxPositiveX - 1 ||
                            //     j === initialBoxNegativeY ||
                            //     j === initialBoxPositiveY - 1 ||
                            //     k === initialBoxNegativeZ ||
                            //     k === initialBoxPositiveZ - 1
                            // ) {
                            // bb.points.forEach((otherPointId) => {
                            //     const d = p.distanceToSquared(this.points[otherPointId].p);
                            //     if (d < range) {
                            //         points.push(otherPointId);
                            //     }
                            // });
                            // } else {
                            points.push(...bb.points);
                            // }
                        }
                    }
                }
            }
        }

        return points;
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

        if (this.vizMode === VizMode.CLUSTER || this.vizMode === VizMode.CLUSTER_SKELETON) {
            this.clusters.forEach(({ bbs }) => {
                this.highlightBBs(bbs.map(({ id }) => id));
            });
        } else if (this.vizMode === VizMode.BB) {
            this.highlightBBs(this.getOccupiedBBs().map(({ id }) => id));
        } else if (this.vizMode === VizMode.CLUSTER_CENTER) {
            this.clusterCenterVisualizations.clear();

            this.clusters.forEach(({ center }) => {
                const m: Mesh = new Mesh();
                m.copy(this.clusterCenterVisualizationMesh);
                m.position.copy(center);
                this.clusterCenterVisualizations.add(m);
            });
        }
    };

    highlightBBs = (bbIds: BBId[]) => {
        bbIds.forEach((bbIds) => {
            const mat = this.viz[bbIds].material as LineBasicMaterial;
            mat.opacity = 1;
        });
    };

    withVisualization = (parent: Object3D, vizMode: VizMode) => {
        this.withBBVisualization(parent, vizMode);
        this.withClusterCenterVisualization(parent);
    };

    withBBVisualization = (parent: Object3D, vizMode: VizMode) => {
        if (this.viz) return this;

        this.vizMode = vizMode;

        const positions =
            this.depthDivisions > 1
                ? LineCube(this.boxWidth, this.boxHeight, this.boxDepth)
                : LineSquare(this.boxWidth, this.boxHeight);

        if (vizMode === VizMode.CLUSTER) {
            const geo = new BoxGeometry(this.boxWidth, this.boxHeight, this.boxDepth);
            this.bbVisualization = new Mesh(geo, new MeshPhongMaterial({ color: 0x00ff00 }));
        } else if (vizMode === VizMode.CLUSTER_SKELETON) {
            const geo = new BufferGeometry();
            geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
            this.bbVisualization = new Line(geo, new LineBasicMaterial({ color: 0x00ff00 })).computeLineDistances();
        } else {
            return;
        }

        (this.bbVisualization.material as Material).transparent = true;
        (this.bbVisualization.material as Material).opacity = 0;

        this.viz = {};

        for (let k = 0; k < this.depthDivisions; k++) {
            for (let i = 0; i < this.heightDivisions; i++) {
                for (let j = 0; j < this.widthDivisions; j++) {
                    const box = this.bbVisualization.clone();
                    const boxPosition = this.getBoxPositionFromIndices(j, i, k);

                    box.position.add(boxPosition);
                    box.scale.multiplyScalar(0.96);

                    if (vizMode === VizMode.CLUSTER) {
                        box.material = new MeshPhongMaterial({ color: 0x00ff00 });
                    } else if (vizMode === VizMode.CLUSTER_SKELETON) {
                        box.material = new LineBasicMaterial({ color: 0x00ff00 });
                    }

                    (box.material as Material).transparent = true;
                    (box.material as Material).opacity = 0;

                    this.viz[this.getBBId(j, i, k)] = box;
                }
            }
        }

        parent.add(...Object.values(this.viz));

        return this;
    };

    withClusterCenterVisualization = (parent: Object3D) => {
        parent.add(this.clusterCenterVisualizations);
    };

    dispose = () => {
        if (this.viz) {
            this.bbVisualization.geometry.dispose();
            (this.bbVisualization.material as Material).dispose();

            Object.values(this.viz).forEach((box) => {
                // box.geometry.dispose();
                // (box.material as Material).dispose();
                box.removeFromParent();
            });
        }

        this.clusterCenterVisualizationMesh.geometry.dispose();
        (this.clusterCenterVisualizationMesh.material as Material).dispose();
        this.clusterCenterVisualizations.removeFromParent();
    };
}
