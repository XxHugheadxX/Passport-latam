'use client'

import { usePathname } from 'next/navigation'
import { PublicHeader } from './PublicHeader'
import { NavBar } from './NavBar'

export function HeaderRouter() {
  const pathname = usePathname()
  const isLanding = pathname === '/'

  if (isLanding) return <PublicHeader />
  return <NavBar />
}
