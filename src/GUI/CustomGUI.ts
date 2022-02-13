import { GUI } from 'dat.gui';
import { Color } from 'three';

import { SETTINGS, SettingSection, isInternalSetting, ExternalSettingsNames } from '../Settings/Settings';
import { ThreeGame } from '../ThreeGame/ThreeGame';
import { BoidSystem } from '../BoidSystem/BoidSystem';
import { InitialState } from '../ParticleSystem/ParticleSystemTypes';

export class CustomGUI {
    private gui!: GUI;

    constructor(game: ThreeGame, bsys: BoidSystem) {
        this.initialize(game, bsys);
    }

    downloadTextAsJson(exportObj: {}, exportName: string) {
        const a = document.createElement('a');
        const jsonString = JSON.stringify(exportObj);
        const formattedJsonString = jsonString.slice(1, jsonString.length - 1).replace(/\\"/g, '"');
        const dataURL = `data:application/json,${formattedJsonString}`;

        a.setAttribute('download', exportName + '.json');
        a.setAttribute('href', dataURL);

        a.click();
    }

    async uploadJsonFile(): Promise<InitialState> {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.setAttribute('id', 'file-input');
            input.setAttribute('type', 'file');
            input.onchange = () => {
                const selectedFile = input.files ? input.files[0] : null;

                if (selectedFile) {
                    const reader = new FileReader();
                    reader.readAsText(selectedFile, 'UTF-8');
                    reader.onload = function (evt) {
                        const initialStateData = JSON.parse(evt.target?.result?.toString() || '{}');
                        const initalState: InitialState = { aPindex: [], aPosition: [], aVelocity: [] };

                        if (!evt.target?.result) {
                            return reject('File was empty');
                        }

                        const missingValueName = Object.keys(initalState).find((k) => !initialStateData[k]);

                        if (missingValueName) {
                            return reject(`Ill-formatted initial state (missing ${missingValueName} key)`);
                        }

                        initalState.aPindex = initialStateData.aPindex;
                        initalState.aPosition = initialStateData.aPosition;
                        initalState.aVelocity = initialStateData.aVelocity;
                        resolve(initalState);
                    };
                    reader.onerror = function (evt) {
                        reject('Error reading uploaded file');
                    };
                }
            };
            input.click();
            input.remove();
        });
    }

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
            this.downloadTextAsJson(
                bsys.getInitalStateData(),
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
            await this.uploadJsonFile()
                .catch((e) => console.error(e))
                .then((initialStateData) => initialStateData && bsys.restart(initialStateData));
        });
        initialStateFolder.add(dummy, restartMsg).onChange(async () => {
            dummy[restartMsg] = false;
            bsys.restart(JSON.parse(bsys.getInitalStateData()));
        });
        initialStateFolder.add(dummy, regenerateMsg).onChange(async () => {
            dummy[regenerateMsg] = false;
            bsys.restart();
        });
        initialStateFolder.open();

        Object.values(SettingSection).forEach((section) => {
            const folder = this.gui.addFolder(section.slice(0, 1).toUpperCase().concat(section.slice(1)));
            Object.keys(SETTINGS[section]).forEach((setting) => {
                if (!isInternalSetting(setting)) {
                    switch (setting) {
                        case ExternalSettingsNames.speed:
                            folder.add(SETTINGS[section], setting, 0, 5).onChange((v) => bsys.setSpeed(v));
                            break;
                        case ExternalSettingsNames.is3D:
                            folder.add(SETTINGS[section], setting, 0, 1).onChange(game.toggle3D);
                            break;
                        case ExternalSettingsNames.envColor:
                            folder.addColor(SETTINGS[section], setting).onChange((hex: number) => {
                                game.getScene().background = new Color(hex);
                                game.getLights().forEach((l) => l.color.setHex(hex));
                            });
                            break;
                        case ExternalSettingsNames.perception:
                            folder
                                .add(SETTINGS[section], setting, 0, 10, 1)
                                .onChange((v) => bsys.setParticlePerception(v));
                            break;
                        case ExternalSettingsNames.attentiveness:
                            folder
                                .add(SETTINGS[section], setting, 0, 1, 0.01)
                                .onChange((v) => bsys.setParticleAttentiveness(v));
                            break;
                        case ExternalSettingsNames.sensitivity:
                            folder.add(SETTINGS[section], setting, 0, 1, 0.01);
                            break;
                        default:
                            folder.add(SETTINGS[section], setting, 0, 1, 0.01);
                            break;
                    }
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
