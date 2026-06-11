export type Rank = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'new'

export const RANK_ORDER: Rank[] = ['diamond', 'platinum', 'gold', 'silver', 'bronze', 'new']

export const RANK_META: Record<Rank, { background: string; color: string; label: string }> = {
  diamond: { background: '#B9F2FF', color: '#0369A1', label: '💎 ダイヤモンド' },
  platinum: { background: '#E2E8F0', color: '#475569', label: '🏆 プラチナ' },
  gold: { background: '#FEF3C7', color: '#B45309', label: '⭐ ゴールド' },
  silver: { background: '#F1F5F9', color: '#64748B', label: '🥈 シルバー' },
  bronze: { background: '#FEF0E6', color: '#C2410C', label: '🥉 ブロンズ' },
  new: { background: '#F1F5F9', color: '#94A3B8', label: '新規' },
}

const isRank = (value: string | null): value is Rank =>
  Boolean(value && RANK_ORDER.includes(value as Rank))

export function calcRank(
  totalVisits: number,
  daysSinceLastVisit: number | null,
  manualRank: string | null,
): Rank {
  let autoRank: Rank = 'new'

  if (totalVisits >= 50) autoRank = 'diamond'
  else if (totalVisits >= 35) autoRank = 'platinum'
  else if (totalVisits >= 20) autoRank = 'gold'
  else if (totalVisits >= 10) autoRank = 'silver'
  else if (totalVisits >= 3) autoRank = 'bronze'

  if (
    ['diamond', 'platinum', 'gold'].includes(autoRank) &&
    daysSinceLastVisit !== null &&
    daysSinceLastVisit > 90
  ) {
    autoRank = RANK_ORDER[RANK_ORDER.indexOf(autoRank) + 1]
  }

  if (isRank(manualRank) && RANK_ORDER.indexOf(manualRank) < RANK_ORDER.indexOf(autoRank)) {
    return manualRank
  }

  return autoRank
}

export function daysSince(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

export const getRankMeta = (rank: Rank) => RANK_META[rank]
