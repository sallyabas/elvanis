'use client'

import { DashboardTour } from './guide'

export function TourWrapper({ guideDismissed }: { guideDismissed: boolean }) {
  return <DashboardTour guideDismissed={guideDismissed} />
}
