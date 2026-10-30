// Themes for the non-standings graphics (Usage, Replay, Team Battle): a background built from a
// list of Pokémon plus a seed, and the same root class as the standings theme so its CSS applies.

import type { ReactNode } from 'react'
import { MosaicWall } from '../mosaic'
import './mosaic.css'
import '../arena/arena.css'
import './arena.css'

export interface SideTheme {
  id: string
  style: string
  className: string
  Wall: (props: { mons: string[]; seed: string; width: number; height: number }) => ReactNode
}

const arenaWall = (bg: 'spotlight' | 'grid' | 'sunset') => () => (
  <div className={`ar ar-${bg}`} style={{ position: 'absolute', inset: 0 }}>
    <div className="ar-bg" />
    <div className="ar-bg-extra" />
  </div>
)

export const SIDE_THEMES: SideTheme[] = [
  { id: 'mosaic', style: 'Mosaic', className: 'theme-mosaic', Wall: ({ mons, seed, width, height }) => <MosaicWall mons={mons} seed={seed} gradient squares width={width} height={height} /> },
  { id: 'arena-spotlight', style: 'Arena Spotlight', className: 'theme-arena', Wall: arenaWall('spotlight') },
  { id: 'arena-grid', style: 'Arena Grid', className: 'theme-arena', Wall: arenaWall('grid') },
  { id: 'arena-sunset', style: 'Arena Sunset', className: 'theme-arena', Wall: arenaWall('sunset') },
]
