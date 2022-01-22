export type ParticleId = number;

export type ParticleSystemOptions = {
    count: number;
    size?: number;
    particleSize?: number;
    speed?: number;
};

export type ParticleSystemCopyOptions = {
    count: number;
    size: number;
    particleSize: number;
    speed: number;
};

export type Attribute = {
    count: number;
    value: Float64Array | Float32Array | Int32Array | Int16Array | Int8Array | Uint32Array | Uint16Array | Uint8Array;
};

export enum Attributes {
    position = 'position',
}

export enum IAttributes {
    aPindex = 'aPindex',
    aPosition = 'aPosition',
    aVelocity = 'aVelocity',
}

export enum BoidShape {
    CONE,
    SPHERE,
}
