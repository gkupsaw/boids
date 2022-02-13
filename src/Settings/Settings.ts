import { Dimensions } from '../types/Dimensions';
import {
    SettingSection,
    InternalSettingNames,
    ExternalSettingNames,
    SettingName,
    SettingEvent,
    SettingsStructure,
} from './SettingsTypes';

const sectionNames = Object.values(SettingSection);
const settingNames = Object.values({ ...InternalSettingNames, ...ExternalSettingNames });

class Settings {
    private readonly settings: SettingsStructure;

    private history: SettingEvent[];

    private initializationTimestamp: string;

    constructor() {
        this.settings = this.initializeSettings();
        this.history = this.initializeHistory();
        this.initializationTimestamp = Date();
    }

    private initializeSettings = () => {
        return {
            [SettingSection.bean]: {
                [ExternalSettingNames.envColor]: 0x5f2ffa,
                [ExternalSettingNames.boidColor]: 0x5f2ffa,
            },
            [SettingSection.global]: {
                [ExternalSettingNames.perception]: 1,
                [ExternalSettingNames.attentiveness]: 0.5,
                [ExternalSettingNames.sensitivity]: 0.01,
                [ExternalSettingNames.is3D]: true,
                [ExternalSettingNames.speed]: 0.25,
                get [InternalSettingNames.dimensions]() {
                    return this[ExternalSettingNames.is3D] ? Dimensions.xyz : Dimensions.xy;
                },
            },
            [SettingSection.attraction]: {
                [ExternalSettingNames.sensitivity]: 0.1,
            },
            [SettingSection.obstacles]: {
                [ExternalSettingNames.sensitivity]: 0.1,
            },
            [SettingSection.separation]: {
                [ExternalSettingNames.sensitivity]: 0.1,
            },
            [SettingSection.alignment]: {
                [ExternalSettingNames.sensitivity]: 0.5,
            },
            [SettingSection.cohesion]: {
                [ExternalSettingNames.sensitivity]: 0.5,
            },
        };
    };

    private initializeHistory = () => {
        const history: SettingEvent[] = [];

        sectionNames.forEach((sectionKey) => {
            const section = this.settings[sectionKey];
            settingNames.forEach((settingKey) => {
                const setting = section[settingKey];
                history.push({
                    timestamp: this.initializationTimestamp,
                    sectionKey: sectionKey,
                    settingKey: settingKey,
                    value: setting,
                });
            });
        });

        return history;
    };

    private trackEvent = (sectionKey: SettingSection, settingKey: SettingName, value: any) => {
        const lastEvent = this.history[this.history.length - 1];

        const isDuplicate =
            sectionKey === lastEvent.sectionKey && settingKey === lastEvent.settingKey && value === lastEvent.value;

        if (!isDuplicate) this.history.push({ timestamp: Date(), sectionKey, settingKey, value });
    };

    getSectionCopy = (sectionKey: SettingSection) => {
        return JSON.parse(JSON.stringify(this.settings[sectionKey]));
    };

    getSetting = (sectionKey: SettingSection, settingKey: SettingName) => {
        return this.settings[sectionKey][settingKey];
    };

    getGlobalSetting = (settingKey: SettingName) => {
        return this.settings[SettingSection.global][settingKey];
    };

    setSetting = (sectionKey: SettingSection, settingKey: SettingName, value: any) => {
        this.trackEvent(sectionKey, settingKey, value);

        this.settings[sectionKey][settingKey] = value;

        return this.settings[sectionKey][settingKey];
    };

    getHistory = () => {
        return [...this.history];
    };

    getEventsAfterTimestamp = (dateString: string) => {
        const date = new Date(dateString);
        const sortedHistory = this.getHistory().sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const startIndex = sortedHistory.findIndex((evt) => new Date(evt.timestamp).getTime() >= date.getTime());

        if (startIndex === -1) return [];

        return sortedHistory.slice(startIndex);
    };
}

export const SETTINGS = new Settings();

export * from './SettingsTypes';

// SETTINGS.separation.sensitivity = 0;
// SETTINGS.cohesion.sensitivity = 0;
// SETTINGS.attraction.sensitivity = 0;
// SETTINGS.alignment.sensitivity = 0;
// SETTINGS.obstacles.sensitivity = 0;
