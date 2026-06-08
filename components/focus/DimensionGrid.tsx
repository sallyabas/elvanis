'use client'

import { DimensionId } from '@/lib/gravity-engine'
import { DimensionStatus } from '@/lib/dimension-status'
import DimensionCard from './DimensionCard'

interface DimensionGridProps {
  orderedIds:       DimensionId[]
  statuses:         Record<DimensionId, DimensionStatus>
  onDimensionClick: (id: DimensionId) => void
  opacity?:         number
}

export default function DimensionGrid({
  orderedIds,
  statuses,
  onDimensionClick,
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
            status={statuses[id]}
            onClick={() => onDimensionClick(id)}
          />
        ))}
      </div>
    </div>
  )
}