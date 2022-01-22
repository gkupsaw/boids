import { GUI } from 'dat.gui';
import { Color } from 'three';

import { SETTINGS, SettingSection, isInternalSetting, ExternalSettingsNames } from '../Settings/Settings';
import { ThreeGame } from '../ThreeGame/ThreeGame';
import { BoidSystem } from '../BoidSystem/BoidSystem';

export class CustomGUI {
    private gui!: GUI;

    constructor(game: ThreeGame, bsys: BoidSystem) {
        this.initialize(game, bsys);
    }

    initialize = (game: ThreeGame, bsys: BoidSystem) => {
        this.gui = new GUI();

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
                            folder.add(SETTINGS[section], setting, 0, 10, 1);
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
