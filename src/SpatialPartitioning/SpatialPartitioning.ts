import {
    Vector3,
    Object3D,
    Material,
    Line,
    LineBasicMaterial,
    BufferGeometry,
    Float32BufferAttribute,
    Mesh,
    MeshPhongMaterial,
    BoxGeometry,
} from 'three';

import { PointId, PointData, Point, BB, VizMode, BBId } from './SpatialPartitioningTypes';
import { LineCube } from '../Shapes/LineCube';
import { LineSquare } from '../Shapes/LineSquare';

export class SpatialPartitioning {
    private readonly size: number;
    private readonly widthDivisions: number;
    private readonly heightDivisions: number;
    private readonly depthDivisions: number;

    private points: Record<PointId, Point>;
    private bbs: Record<BBId, BB>;

    private bbVisualization!: Mesh | Line;

    private vizMode: VizMode;
    private viz!: Record<BBId, Mesh | Line>;

    constructor(size: number, width: number, height: number, depth: number) {
        this.size = size;
        this.widthDivisions = width;
        this.heightDivisions = height;
        this.depthDivisions = depth;

        this.bbs = {};
        this.points = {};

        this.vizMode = VizMode.NONE;
    }

    private worldToBBSpace = (worldX: number, worldY: number, worldZ: number) => {
        const boxX = Math.min(
            this.widthDivisions - 1,
            Math.max(0, Math.floor((worldX / this.size) * this.widthDivisions + this.widthDivisions / 2))
        );
        const boxY = Math.min(
            this.heightDivisions - 1,
            Math.max(0, Math.floor((worldY / this.size) * this.heightDivisions + this.heightDivisions / 2))
        );
        const boxZ = Math.min(
            this.depthDivisions - 1,
            Math.max(0, Math.floor((worldZ / this.size) * this.depthDivisions + this.depthDivisions / 2))
        );

        return new Vector3(boxX, boxY, boxZ);
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

    private insertPoint = (pointId: PointId, p: Vector3) => {
        const indices = this.worldToBBSpace(p.x, p.y, p.z);
        const bbId = this.getBBId(indices.x, indices.y, indices.z);

        if (this.bbs[bbId]) {
            this.bbs[bbId].points.push(pointId);
        } else {
            this.bbs[bbId] = {
                id: bbId,
                indices: indices,
                points: [pointId],
                // cluster: SpatialPartitioning.DEFAULT_CLUSTER_ID,
                visited: false,
            };
        }

        this.points[pointId] = { id: pointId, p: p.clone(), bb: bbId };
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

    isValidBBIndices = (x: number, y: number, z: number) => {
        return (
            x >= 0 && x < this.widthDivisions && y >= 0 && y < this.heightDivisions && z >= 0 && z < this.depthDivisions
        );
    };

    getSize = () => this.size;

    getWidth = () => this.widthDivisions;

    getHeight = () => this.heightDivisions;

    getDepth = () => this.depthDivisions;

    getPoint = (id: PointId) => {
        return this.points[id];
    };

    getBBId = (x: number, y: number, z: number): BBId => {
        return [x, y, z].join(':');
        // return x + y * this.widthDivisions + z * this.widthDivisions * this.heightDivisions;
    };

    getBB = (x: number, y: number, z: number) => {
        return this.bbs[this.getBBId(x, y, z)];
    };

    getBBFromId = (id: BBId): BB => {
        return this.bbs[id];
    };

    getBBForPoint = (pointId: PointId) => {
        return this.bbs[this.points[pointId].bb];
    };

    getOccupiedBBs = () => {
        return Object.values(this.bbs);
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
                            bb.points.forEach((bbP) => bbP !== pointId && points.push(bbP));
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
    };

    update = (points: PointData[]) => {
        this.clear();

        // Reinitialize spatial partition
        points.forEach(({ id, p }) => {
            this.insertPoint(id, p);
        });

        // clusterManager.update();

        if (this.vizMode === VizMode.BB) {
            this.highlightBBs(this.getOccupiedBBs().map(({ id }) => id));
        }
    };

    highlightBBs = (bbIds: BBId[]) => {
        bbIds.forEach((bbIds) => {
            const mat = this.viz[bbIds].material as LineBasicMaterial;
            mat.opacity = 1;
        });
    };

    hasVisualization = () => {
        return Boolean(this.viz);
    };

    withVisualization = (parent: Object3D, vizMode: VizMode) => {
        this.withBBVisualization(parent, vizMode);
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
    };
}
