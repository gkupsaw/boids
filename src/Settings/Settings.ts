export enum SettingSection {
    global = 'global',
    attraction = 'attraction',
    obstacles = 'obstacles',
    separation = 'separation',
    alignment = 'alignment',
    cohesion = 'cohesion',
}

export type Settings = {
    [index in SettingSection]: { [index: string]: any };
};

export const SETTINGS: Settings = {
    [SettingSection.global]: {
        awarenessFactor: 3,
        sensitivity: 0.0,
    },
    [SettingSection.attraction]: {
        awarenessFactor: 3,
        sensitivity: 0.01,
    },
    [SettingSection.obstacles]: {
        awarenessFactor: 2,
        sensitivity: 0.01,
    },
    [SettingSection.separation]: {
        awarenessFactor: 1,
        sensitivity: 0.01,
    },
    [SettingSection.alignment]: {
        awarenessFactor: 1,
        sensitivity: 1.5,
    },
    [SettingSection.cohesion]: {
        awarenessFactor: 1,
        sensitivity: 0.01,
    },
};
