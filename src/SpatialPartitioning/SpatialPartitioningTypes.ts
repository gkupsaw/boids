import { Vector3 } from 'three';

export type ID = number;

export type PointData = {
    id: ID;
    p: Vector3;
};

export type Point = PointData & {
    bb: ID;
};

export type BB = {
    id: ID;

    x: number;
    y: number;
    z: number;

    points: ID[];
    cluster: ID;

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
