export enum SettingSection {
    separation = 'separation',
    alignment = 'alignment',
    cohesion = 'cohesion',
}

export type Settings = {
    [index: string]: { [index: string]: any };
};

export const SETTINGS: Settings = {
    [SettingSection.separation]: {
        awarenessFactor: 1,
        sensitivity: 0.0075,
    },
    [SettingSection.alignment]: {
        awarenessFactor: 1,
        sensitivity: 0.75,
    },
    [SettingSection.cohesion]: {
        awarenessFactor: 1,
        sensitivity: 0.05,
    },
};
