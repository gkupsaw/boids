import { VizMode } from '../SpatialPartitioning/SpatialPartitioningTypes';
import { SETTINGS, ExternalSettingNames } from './Settings';
import { BoidShape } from '../ParticleSystem/ParticleSystemTypes';

// Different from settings, these values should never change over the course of a program run.
export const PARAMETERS = {
    ThreeGame: {
        withDebug: false,
    },
    BoidSystem: {
        withDebug: false,
        withVisualization: true,
    },
    ParticleSystem: {
        options: {
            size: 4,
            count: 4000,
            particleSize: 0.08,
            get speed() {
                return SETTINGS.getGlobalSetting(ExternalSettingNames.speed);
            },
        },

        withBoundaryVisualization: false,
        withPointHighlight: true,
        withForceHighlight: false,
        withSpatialPartitioningVisualization: false,
        generateClusters: true,
        boidShape: BoidShape.CONE,
    },
    SpatialPartitioning: {
        vizMode: VizMode.NONE,
    },
};
