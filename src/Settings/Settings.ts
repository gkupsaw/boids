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
    perception = 'perception',
    attentiveness = 'attentiveness',
    sensitivity = 'sensitivity',
    is3D = 'is3D',
    speed = 'speed',
}

enum InternalSettingsNames {
    dimensions = 'dimensions',
}

export type Settings = {
    [settingGroup in SettingSection]: { [settingName: string]: any };
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
        [ExternalSettingsNames.perception]: 1,
        [ExternalSettingsNames.attentiveness]: 0.5,
        [ExternalSettingsNames.sensitivity]: 0.01,
        [ExternalSettingsNames.is3D]: true,
        [ExternalSettingsNames.speed]: 0.25,
        get [InternalSettingsNames.dimensions]() {
            return this[ExternalSettingsNames.is3D] ? Dimensions.xyz : Dimensions.xy;
        },
    },
    [SettingSection.attraction]: {
        [ExternalSettingsNames.sensitivity]: 0.1,
    },
    [SettingSection.obstacles]: {
        [ExternalSettingsNames.sensitivity]: 0.1,
    },
    [SettingSection.separation]: {
        [ExternalSettingsNames.sensitivity]: 0.1,
    },
    [SettingSection.alignment]: {
        [ExternalSettingsNames.sensitivity]: 0.5,
    },
    [SettingSection.cohesion]: {
        [ExternalSettingsNames.sensitivity]: 0.5,
    },
};

// SETTINGS.separation.sensitivity = 0;
// SETTINGS.cohesion.sensitivity = 0;
// SETTINGS.attraction.sensitivity = 0;
// SETTINGS.alignment.sensitivity = 0;
// SETTINGS.obstacles.sensitivity = 0;
