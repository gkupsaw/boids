import { GUI } from 'dat.gui';
import { Color } from 'three';

import { SETTINGS, SettingSection, ExternalSettingNames } from '../Settings/Settings';
import { ThreeGame } from '../ThreeGame/ThreeGame';
import { BoidSystem } from '../BoidSystem/BoidSystem';
import { InitialState, ParticleSystemSimulationData } from '../ParticleSystem/ParticleSystemTypes';
import { FileProcessor } from './FileProcessor';

export class CustomGUI {
    private gui!: GUI;

    constructor(game: ThreeGame, bsys: BoidSystem) {
        this.initialize(game, bsys);
    }

    formatParticleSystemSimData = (bsys: BoidSystem): ParticleSystemSimulationData => {
        return {
            settingsEvents: SETTINGS.getEventsAfterTimestamp(bsys.getStartTime()),
            initialState: bsys.getInitalStateData(),
        };
    };

    processRawParticleSystemSimData = (rawParticleSystemSimData: string) => {
        const parsedParticleSystemSimData = JSON.parse(rawParticleSystemSimData || '{}');
        const parsedInitialState = parsedParticleSystemSimData.initialState;
        const parsedSettingsEvents = parsedParticleSystemSimData.settingsEvents;

        const initialState: InitialState = { aPindex: [], aPosition: [], aVelocity: [] };
        const particleSystemSimData: ParticleSystemSimulationData = {
            initialState,
            settingsEvents: parsedSettingsEvents,
        };

        const missingSimDataKey = Object.keys(particleSystemSimData).find((k) => !parsedParticleSystemSimData[k]);

        if (missingSimDataKey) {
            throw new Error(`Ill-formatted particle simulation data (missing ${missingSimDataKey} key)`);
        }

        const missingInitialStateKey = Object.keys(initialState).find((k) => !parsedInitialState[k]);

        if (missingInitialStateKey) {
            throw new Error(`Ill-formatted initial state (missing ${missingInitialStateKey} key)`);
        }

        initialState.aPindex = parsedInitialState.aPindex;
        initialState.aPosition = parsedInitialState.aPosition;
        initialState.aVelocity = parsedInitialState.aVelocity;

        return particleSystemSimData;
    };

    initialize = (game: ThreeGame, bsys: BoidSystem) => {
        this.gui = new GUI();

        const initialStateFolder = this.gui.addFolder('Inital state');
        const saveMsg = 'Save simulation initial state';
        const loadMsg = 'Load simulation initial state';
        const restartMsg = 'Restart simulation';
        const regenerateMsg = 'Regenerate simulation (random initialization)';
        const dummy = { [saveMsg]: false, [loadMsg]: false, [restartMsg]: false, [regenerateMsg]: false };
        initialStateFolder.add(dummy, saveMsg).onChange(() => {
            dummy[saveMsg] = false;
            const d = new Date();
            FileProcessor.downloadTextAsJson(
                this.formatParticleSystemSimData(bsys),
                'bsys_init_state_' +
                    d.toLocaleDateString() +
                    ':' +
                    d.toLocaleTimeString().replace(/ AM/, 'AM').replace(/ PM/, 'PM') +
                    '_' +
                    d.getMilliseconds()
            );
        });
        initialStateFolder.add(dummy, loadMsg).onChange(async () => {
            dummy[loadMsg] = false;
            await FileProcessor.uploadJsonFile()
                .catch((e) => console.error(e))
                .then(
                    (rawParticleSystemSimData) =>
                        rawParticleSystemSimData &&
                        bsys.restart(this.processRawParticleSystemSimData(rawParticleSystemSimData).initialState)
                );
        });
        initialStateFolder.add(dummy, restartMsg).onChange(async () => {
            dummy[restartMsg] = false;
            bsys.restart(bsys.getInitalStateData());
        });
        initialStateFolder.add(dummy, regenerateMsg).onChange(async () => {
            dummy[regenerateMsg] = false;
            bsys.restart();
        });
        initialStateFolder.open();

        Object.values(SettingSection).forEach((sectionKey) => {
            const folder = this.gui.addFolder(sectionKey.slice(0, 1).toUpperCase().concat(sectionKey.slice(1)));
            const section = SETTINGS.getSectionCopy(sectionKey);

            const sectionSettingKeys = new Set(Object.keys(section));
            const validSectionSettingKeys = Object.values(ExternalSettingNames).filter((k) =>
                sectionSettingKeys.has(k)
            );

            validSectionSettingKeys.forEach((settingKey) => {
                switch (settingKey) {
                    case ExternalSettingNames.speed:
                        folder.add(section, settingKey, 0, 5).onChange((v) => {
                            bsys.setSpeed(v);
                            SETTINGS.setSetting(sectionKey, settingKey, v);
                        });
                        break;
                    case ExternalSettingNames.is3D:
                        folder.add(section, settingKey, 0, 1).onChange((v) => {
                            game.toggle3D();
                            SETTINGS.setSetting(sectionKey, settingKey, v);
                        });
                        break;
                    case ExternalSettingNames.envColor:
                        folder.addColor(section, settingKey).onChange((hex: number) => {
                            game.getScene().background = new Color(hex);
                            game.getLights().forEach((l) => l.color.setHex(hex));
                            SETTINGS.setSetting(sectionKey, settingKey, hex);
                        });
                        break;
                    case ExternalSettingNames.perception:
                        folder.add(section, settingKey, 0, 10, 1).onChange((v) => {
                            bsys.setParticlePerception(v);
                            SETTINGS.setSetting(sectionKey, settingKey, v);
                        });
                        break;
                    case ExternalSettingNames.attentiveness:
                        folder.add(section, settingKey, 0, 1, 0.01).onChange((v) => {
                            bsys.setParticleAttentiveness(v);
                            SETTINGS.setSetting(sectionKey, settingKey, v);
                        });
                        break;
                    case ExternalSettingNames.sensitivity:
                        folder.add(section, settingKey, 0, 1, 0.01).onChange((v) => {
                            SETTINGS.setSetting(sectionKey, settingKey, v);
                        });
                        break;
                    default:
                        folder.add(section, settingKey, 0, 1, 0.01).onChange((v) => {
                            SETTINGS.setSetting(sectionKey, settingKey, v);
                        });
                        break;
                }
            });
            folder.open();
        });

        return this;
    };

    dispose = () => {
        this.gui?.destroy();
    };
}
