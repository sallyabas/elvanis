'use client'

import { DimensionId, DIMENSIONS } from '@/lib/gravity-engine'
import DimensionCard from './DimensionCard'

interface DimensionGridProps {
  orderedIds:       DimensionId[]
  scores:           Record<DimensionId, number>
  states:           Record<DimensionId, 'active' | 'secondary' | 'dormant'>
  trends:           Record<DimensionId, 'improving' | 'worsening' | 'unchanged' | null>
  pinnedId?:        DimensionId | null
  pinDaysLeft?:     number
  onDimensionClick: (id: DimensionId) => void
  onPin:            (id: DimensionId) => void
  opacity?:         number
}

export default function DimensionGrid({
  orderedIds,
  scores,
  states,
  trends,
  pinnedId,
  pinDaysLeft,
  onDimensionClick,
  onPin,
  opacity = 1,
}: DimensionGridProps) {
  return (
    <div style={{ opacity, transition: 'opacity 0.5s ease' }}>
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap:                 12,
      }}>
        {orderedIds.map(id => (
          <DimensionCard
            key={id}
            config={DIMENSIONS[id]}
            score={scores[id]}
            state={states[id]}
            trend={trends[id]}
            isPinned={pinnedId === id}
            pinDaysLeft={pinDaysLeft}
            isHero={false}
            onClick={() => onDimensionClick(id)}
            onPin={() => onPin(id)}
          />
        ))}
      </div>
    </div>
  )
}