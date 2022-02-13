export enum SettingSection {
    bean = 'bean',
    global = 'global',
    attraction = 'attraction',
    obstacles = 'obstacles',
    separation = 'separation',
    alignment = 'alignment',
    cohesion = 'cohesion',
}

export enum ExternalSettingNames {
    envColor = 'envColor',
    boidColor = 'boidColor',
    perception = 'perception',
    attentiveness = 'attentiveness',
    sensitivity = 'sensitivity',
    is3D = 'is3D',
    speed = 'speed',
}

export enum InternalSettingNames {
    dimensions = 'dimensions',
}

export type SettingName = ExternalSettingNames | InternalSettingNames;

export type SettingsStructure = {
    [settingGroup in SettingSection]: { [settingName in SettingName]?: any };
};

export type SettingEvent = {
    timestamp: string;
    sectionKey: SettingSection;
    settingKey: SettingName;
    value: any;
};
