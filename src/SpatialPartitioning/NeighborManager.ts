import { SpatialPartitioning } from './SpatialPartitioning';
import { ParticleId } from '../ParticleSystem/ParticleSystemTypes';
import { sampleArray } from '../Util/misc';

export class NeighborManager {
    private readonly sp: SpatialPartitioning;
    private particlePerception: number;
    private particleAttentiveness: number;

    private readonly particlesToNeighbors: Map<ParticleId, ParticleId[]>;

    private static readonly MAX_PARTICLES_TO_NOTICE = 10;

    constructor(sp: SpatialPartitioning, particlePerception: number, particleAttentiveness: number) {
        this.sp = sp;
        this.particlePerception = particlePerception;
        this.particleAttentiveness = particleAttentiveness;

        this.particlesToNeighbors = new Map<ParticleId, ParticleId[]>();
    }

    getParticlePerception = () => this.particlePerception;

    setParticlePerception = (particlePerception: number) => {
        this.particlePerception = particlePerception;
    };

    setParticleAttentiveness = (particleAttentiveness: number) => {
        this.particleAttentiveness = particleAttentiveness;
    };

    getParticleNeighbors = (particleId: ParticleId) => {
        const particlesArray = this.particlesToNeighbors.get(particleId) ?? [];

        return sampleArray(
            particlesArray,
            this.particleAttentiveness * Math.min(NeighborManager.MAX_PARTICLES_TO_NOTICE, particlesArray.length),
            true // performance drops greatly when shuffling
        );
    };

    update(particleIds: ParticleId[]) {
        this.particlesToNeighbors.clear();

        particleIds.forEach((particleId) =>
            this.particlesToNeighbors.set(
                particleId,
                this.sp.getPointsInRangeOfPoint(particleId, this.particlePerception)
            )
        );
    }
}
