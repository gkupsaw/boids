import { SpatialPartitioning } from './SpatialPartitioning';
import { ParticleId } from '../ParticleSystem/ParticleSystemTypes';

export class NeighborManager {
    private readonly sp: SpatialPartitioning;
    private readonly particlePerception: number;

    private readonly particlesToNeighbors: Map<ParticleId, Set<ParticleId>>;

    constructor(sp: SpatialPartitioning, particlePerception: number) {
        this.sp = sp;
        this.particlePerception = particlePerception;

        this.particlesToNeighbors = new Map<ParticleId, Set<ParticleId>>();
    }

    update(particleIds: ParticleId[]) {
        this.particlesToNeighbors.clear();

        particleIds.forEach((particleId) =>
            this.particlesToNeighbors.set(
                particleId,
                new Set(this.sp.getPointsInRangeOfPoint(particleId, this.particlePerception))
            )
        );
    }

    getParticleNeighbors = (particleId: ParticleId) => {
        return Array.from(this.particlesToNeighbors.get(particleId) ?? []);
    };
}
