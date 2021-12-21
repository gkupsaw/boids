import { Vector3 } from 'three';

import { ParticleId } from '../ParticleSystem/ParticleSystemTypes';

export type PointId = ParticleId;
export type BBId = string;
export type ClusterId = number;

export type PointData = {
    id: PointId;
    p: Vector3;
};

export type Point = PointData & {
    bb: BBId;
};

export type BB = {
    id: BBId;

    indices: Vector3;

    points: PointId[];
    cluster: ClusterId;

    visited: boolean;
};

export type BBCluster = {
    center: Vector3;

    bbs: BB[];
};

export enum VizMode {
    NONE,
    BB,
    CLUSTER,
}
