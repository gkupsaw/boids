import { Dimensions } from './../types/Dimensions';

export enum SettingSection {
    global = 'global',
    attraction = 'attraction',
    obstacles = 'obstacles',
    separation = 'separation',
    alignment = 'alignment',
    cohesion = 'cohesion',
}

enum ExternalSettingsNames {
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
    [SettingSection.global]: {
        [ExternalSettingsNames.awarenessFactor]: 3,
        [ExternalSettingsNames.sensitivity]: 0.0,
        [ExternalSettingsNames.is3D]: false,
        get [InternalSettingsNames.dimensions]() {
            return this[ExternalSettingsNames.is3D] ? Dimensions.xyz : Dimensions.xy;
        },
    },
    [SettingSection.attraction]: {
        [ExternalSettingsNames.awarenessFactor]: 3,
        [ExternalSettingsNames.sensitivity]: 0,
    },
    [SettingSection.obstacles]: {
        [ExternalSettingsNames.awarenessFactor]: 2,
        [ExternalSettingsNames.sensitivity]: 0.3,
    },
    [SettingSection.separation]: {
        [ExternalSettingsNames.awarenessFactor]: 1,
        [ExternalSettingsNames.sensitivity]: 0.01,
    },
    [SettingSection.alignment]: {
        [ExternalSettingsNames.awarenessFactor]: 1,
        [ExternalSettingsNames.sensitivity]: 0.01,
    },
    [SettingSection.cohesion]: {
        [ExternalSettingsNames.awarenessFactor]: 3,
        [ExternalSettingsNames.sensitivity]: 0.5,
    },
};
