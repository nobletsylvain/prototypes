import { QUALITY_TIERS } from './genetic-quality.mjs';

// Presentation only. The outcome is committed before this sequence begins.
export function getRevealStage(finalTierId, progress) {
 const finalRank = QUALITY_TIERS.findIndex(tier => tier.id === finalTierId);
 if (finalRank < 0 || !Number.isFinite(progress) || progress <= 0) return null;
 if (progress >= 1) return QUALITY_TIERS[finalRank];
 const rank = Math.min(finalRank - 1, Math.floor(progress * (finalRank + 1)) - 1);
 return rank < 0 ? null : QUALITY_TIERS[rank];
}
