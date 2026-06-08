'use client'

import { DimensionId, DimensionConfig, DimensionState, DIMENSIONS } from '@/lib/gravity-engine'
import DimensionCard from './DimensionCard'

interface DimensionGridProps {
  orderedIds:    DimensionId[]
  scores:        Record<DimensionId, number>
  states:        Record<DimensionId, DimensionState>
  trends:        Record<DimensionId, 'improving' | 'worsening' | 'unchanged' | null>
  pinnedId?:     DimensionId | null
  pinDaysLeft?:  number
  onDimensionClick: (id: DimensionId) => void
  onPin:         (id: DimensionId) => void
  opacity?:      number
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
  const [heroId, ...restIds] = orderedIds

  return (
    <div style={{ opacity, transition: 'opacity 0.5s ease' }}>

      {/* Hero card — primary dimension */}
      <div style={{ marginBottom: 16 }}>
        <DimensionCard
          config={DIMENSIONS[heroId]}
          score={scores[heroId]}
          state={states[heroId]}
          trend={trends[heroId]}
          isPinned={pinnedId === heroId}
          pinDaysLeft={pinDaysLeft}
          isHero={true}
          onClick={() => onDimensionClick(heroId)}
          onPin={() => onPin(heroId)}
        />
      </div>

      {/* Secondary dimensions — compact grid */}
      <div style={{
        display:               'grid',
        gridTemplateColumns:   'repeat(auto-fill, minmax(240px, 1fr))',
        gap:                   12,
      }}>
        {restIds.map(id => (
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