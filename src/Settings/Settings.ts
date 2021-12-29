import { Dimensions } from './../types/Dimensions';

export enum SettingSection {
    bean = 'bean',
    global = 'global',
    attraction = 'attraction',
    obstacles = 'obstacles',
    separation = 'separation',
    alignment = 'alignment',
    cohesion = 'cohesion',
}

export enum ExternalSettingsNames {
    envColor = 'envColor',
    boidColor = 'boidColor',
    awarenessFactor = 'awarenessFactor',
    sensitivity = 'sensitivity',
    is3D = 'is3D',
}

enum InternalSettingsNames {
    dimensions = 'dimensions',
}

export type Settings = {
    [index in SettingSection]: { [index: string]: any };
};

const internalSettingsSet = new Set<string>(Object.values(InternalSettingsNames));
export const isInternalSetting = (setting: string) => {
    return internalSettingsSet.has(setting);
};

export const SETTINGS: Settings = {
    [SettingSection.bean]: {
        [ExternalSettingsNames.envColor]: 0x5f2ffa,
        [ExternalSettingsNames.boidColor]: 0x5f2ffa,
    },
    [SettingSection.global]: {
        [ExternalSettingsNames.awarenessFactor]: 3,
        [ExternalSettingsNames.sensitivity]: 0.01,
        [ExternalSettingsNames.is3D]: true,
        get [InternalSettingsNames.dimensions]() {
            return this[ExternalSettingsNames.is3D] ? Dimensions.xyz : Dimensions.xy;
        },
    },
    [SettingSection.attraction]: {
        [ExternalSettingsNames.awarenessFactor]: 100,
        [ExternalSettingsNames.sensitivity]: 0.01,
    },
    [SettingSection.obstacles]: {
        [ExternalSettingsNames.awarenessFactor]: 2,
        [ExternalSettingsNames.sensitivity]: 1,
    },
    [SettingSection.separation]: {
        [ExternalSettingsNames.awarenessFactor]: 1,
        [ExternalSettingsNames.sensitivity]: 0.05,
    },
    [SettingSection.alignment]: {
        [ExternalSettingsNames.awarenessFactor]: 1,
        [ExternalSettingsNames.sensitivity]: 1,
    },
    [SettingSection.cohesion]: {
        [ExternalSettingsNames.sensitivity]: 1,
    },
};
