import { Vector3, Object3D, Material, Mesh, SphereGeometry, MeshPhongMaterial } from 'three';

import { SpatialPartitioning } from './SpatialPartitioning';
import { PointId, BB, BBCluster, VizMode, ClusterId, BBId } from './SpatialPartitioningTypes';
import { Counter } from '../Util/misc';

export class ClusterManager {
    private readonly spatialPartioning: SpatialPartitioning;
    private readonly minBBsInCluster: number;

    private readonly bbToCluster: Map<BBId, ClusterId>;
    private readonly clusters: Map<ClusterId, BBCluster>;

    private readonly clusterCenterVisualizationMesh: Mesh;
    private readonly clusterCenterVisualizations: Object3D;
    private readonly clusterIdGen: Counter;

    private static readonly DEFAULT_CLUSTER_ID: ClusterId = -1;

    private vizMode: VizMode;

    constructor(spatialPartioning: SpatialPartitioning, { minBBsInCluster = 1 } = {}) {
        this.spatialPartioning = spatialPartioning;
        this.minBBsInCluster = minBBsInCluster;

        this.bbToCluster = new Map<BBId, ClusterId>();
        this.clusters = new Map<ClusterId, BBCluster>();

        this.clusterCenterVisualizationMesh = new Mesh(
            new SphereGeometry(this.spatialPartioning.boxDepth, 10, 10),
            new MeshPhongMaterial({ color: 0xff0000 })
        );
        (this.clusterCenterVisualizationMesh.material as Material).transparent = true;
        (this.clusterCenterVisualizationMesh.material as Material).opacity = 0.8;
        this.clusterCenterVisualizations = new Object3D();

        this.clusterIdGen = new Counter();

        this.vizMode = VizMode.NONE;
    }

    private getNextClusterId = (): ClusterId => {
        return this.clusterIdGen.next();
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
                    if (this.spatialPartioning.isValidBBIndices(neighborX, neighborY, neighborZ)) {
                        const neighborId = this.spatialPartioning.getBBId(neighborX, neighborY, neighborZ);
                        const neighbor = this.spatialPartioning.getBBFromId(neighborId);

                        if (neighbor && !neighbor.visited) {
                            pCount += neighbor.points.length;
                            center.add(
                                neighbor.points.reduce(
                                    (acc, pointId) => acc.add(this.spatialPartioning.getPoint(pointId).p),
                                    new Vector3()
                                )
                            );

                            valid.push(neighbor);
                            this.bbToCluster.set(neighbor.id, clusterId);
                            // neighbor.cluster = clusterId;
                            neighbor.visited = true;
                            stack.push(neighbor);
                        }
                    }
                }
            }
        }

        center.multiplyScalar(1 / pCount);

        return { id: clusterId, center, bbs: valid };
    };

    private gatherAllClusters = () => {
        const activeBBs = this.spatialPartioning.getOccupiedBBs();
        for (const bb of activeBBs) {
            if (!bb.visited) {
                const cluster = this.gatherCluster(bb);

                if (cluster.bbs.length > this.minBBsInCluster) {
                    this.clusters.set(cluster.id, cluster);
                } else {
                    cluster.bbs.forEach((clusterBB) =>
                        this.bbToCluster.set(clusterBB.id, ClusterManager.DEFAULT_CLUSTER_ID)
                    );
                }
            }
        }
    };

    update = () => {
        this.gatherAllClusters();

        const clustersArray = Array.from(this.clusters.values());
        if (this.vizMode === VizMode.CLUSTER || this.vizMode === VizMode.CLUSTER_SKELETON) {
            clustersArray.forEach(({ bbs }) => {
                this.spatialPartioning.highlightBBs(bbs.map(({ id }) => id));
            });
        } else if (this.vizMode === VizMode.CLUSTER_CENTER) {
            this.clusterCenterVisualizations.clear();

            clustersArray.forEach(({ center }) => {
                const m: Mesh = new Mesh();
                m.copy(this.clusterCenterVisualizationMesh);
                m.position.copy(center);
                this.clusterCenterVisualizations.add(m);
            });
        }
    };

    getClusterForPoint = (pointId: PointId) => {
        const bb: BB = this.spatialPartioning.getBBForPoint(pointId);
        return this.getClusterForBB(bb.id);
    };

    getClusterForBB = (bbId: BBId) => {
        const clusterId = this.bbToCluster.get(bbId);

        return clusterId ? this.clusters.get(clusterId) : null;
    };

    withVisualization = (parent: Object3D, vizMode: VizMode) => {
        if (this.vizMode !== VizMode.NONE) return this;

        this.vizMode = vizMode;

        if (!this.spatialPartioning.hasVisualization()) {
            return console.warn(
                'Tried to initialize viz for ClusterManager when its SpatialPartitioning did not have one.'
            );
        }

        this.withClusterCenterVisualization(parent);
    };

    withClusterCenterVisualization = (parent: Object3D) => {
        parent.add(this.clusterCenterVisualizations);
    };

    clear = () => {
        this.clusters.clear();
        this.clusterIdGen.reset();
        this.vizMode = VizMode.NONE;
    };

    dispose = () => {
        this.clusterCenterVisualizationMesh.geometry.dispose();
        (this.clusterCenterVisualizationMesh.material as Material).dispose();
        this.clusterCenterVisualizations.removeFromParent();
    };
}
