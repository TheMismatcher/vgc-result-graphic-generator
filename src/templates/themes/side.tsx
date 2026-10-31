// Themes for the non-standings graphics (Usage, Replay, Team Battle): a background built from a
// list of Pokémon plus a seed, and the same root class as the standings theme so its CSS applies.

import type { ReactNode } from 'react'
import { MosaicWall } from '../mosaic'
import { GhostWall } from '../eras/ghostpixel'
import { PLACE_SIDE_THEMES } from './places'
import './ghostpixel.css'
import '../editorial/editorial.css'
import './editorial.css'
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

const editorialWall = (mood: 'paper' | 'night') => () => <div className={`ed ed-${mood}`} style={{ position: 'absolute', inset: 0 }} />

export const SIDE_THEMES: SideTheme[] = [
  {
    id: 'ghost-pixel',
    style: 'Ghost Pixel Glass Team Line',
    className: 'theme-ghostpixel',
    Wall: ({ seed, width, height }) => (
      <div style={{ position: 'absolute', inset: 0, background: '#0c090d' }}>
        <GhostWall seed={seed} width={width} height={height} />
      </div>
    ),
  },
  { id: 'mosaic', style: 'Mosaic', className: 'theme-mosaic', Wall: ({ mons, seed, width, height }) => <MosaicWall mons={mons} seed={seed} gradient squares width={width} height={height} /> },
  { id: 'editorial-paper', style: 'Editorial Paper', className: 'theme-editorial ed-paper', Wall: editorialWall('paper') },
  { id: 'editorial-night', style: 'Editorial Night', className: 'theme-editorial ed-night', Wall: editorialWall('night') },
  { id: 'arena-spotlight', style: 'Arena Spotlight', className: 'theme-arena', Wall: arenaWall('spotlight') },
  { id: 'arena-grid', style: 'Arena Grid', className: 'theme-arena', Wall: arenaWall('grid') },
  { id: 'arena-sunset', style: 'Arena Sunset', className: 'theme-arena', Wall: arenaWall('sunset') },
  ...PLACE_SIDE_THEMES,
]
