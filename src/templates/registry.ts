// Every template the generator can output. Add new designs here.

import type { Day2Template, MatchTemplate, StandingsTemplate, TeamBattleTemplate, UsageTemplate } from './types'
import { TopCutBannerWhite, TopCutClean, TopCutLoud } from './top-cut'
import Champion, { ChampionLoud } from './champion'
import Usage from './usage'
import Bracket, { BracketLoud } from './bracket'
import { ArenaGrid, ArenaSpotlight, ArenaSunset } from './arena'
import VsResult from './vs-result'
import Day2Clean from './day2/clean'
import { RegionalMosaic, RegionalMosaicContrast } from './day2/mosaic'
import { EventEditorialNight, EventEditorialPaper } from './day2/editorial'
import TeamBattle, { TeamBattleLoss, TeamBattleLoud, TeamBattleWin } from './team-battle'
import Top8Photos, { Top8PhotosLoud, Top8PhotosWhite } from './top8-photos'
import Top4Photos, { Top4PhotosLoud } from './top4-photos'
import Top8Mixed, { Top8MixedWhite } from './top8-mixed'
import SportsPage from './sports-page'
import { SIDE_THEMES } from './themes/side'
import { makeUsage } from './usage'
import { makeVsResult } from './vs-result'
import { makeTeamBattle } from './team-battle'
import { ArenaGridLayouts, ArenaSpotlightLayouts, ArenaSunsetLayouts } from './themes/arena'
import { MosaicLayouts } from './themes/mosaic'
import { GhostPixelLayouts } from './themes/ghostpixel'
import { EditorialNightLayouts, EditorialPaperLayouts } from './themes/editorial'
import { BattleTower, Ghost, Hoenn, MtCoronet, Pokedex, PokedexChampion, TradingCard } from './eras/more'
import { GhostPixel, GhostPixelDense, GhostPixelGlass, GhostPixelGlassTeam, GhostPixelGlassLine } from './eras/ghostpixel'
import { Glimwood, KantoGameBoy, Paldea, Route201, Snowpoint, Unova } from './eras'
import { Route119, Route119Bridge, Route119BridgeGlass, Route119Glass, Route120, Route120Glass, SpearPillar, SpearPillarArt, SpearPillarGlass } from './places'
import { PLACE_LAYOUTS } from './themes/places'
import { MosaicGradient, MosaicMono, MosaicSquaresGradient, MosaicSquaresMono, MosaicTintGlass, MosaicTintGlassShadow, MosaicTintSemiShadow, MosaicTintSolid, MosaicTintSolidShadow } from './mosaic'
import { DynamaxTopCut, MegaTopCut, TerastalTopCut } from './power'
import { DynamaxLayouts, MegaLayouts, TerastalLayouts } from './power/themes'
import { EditorialChampionNight, EditorialChampionPaper, EditorialTopCutNight, EditorialTopCutPaper } from './editorial'

import type { StandingsLayout } from './types'

/** Layouts in picker order, with their labels. */
export const STANDINGS_LAYOUTS: { id: StandingsLayout; label: string }[] = [
  { id: 'topcut', label: 'Top Cut' },
  { id: 'top8photos', label: 'Top 8 Photos' },
  { id: 'top8mixed', label: 'Top 8 + Top 4 Photos' },
  { id: 'top4photos', label: 'Top 4 Photos' },
  { id: 'champion', label: 'Champion' },
  { id: 'bracket', label: 'Bracket' },
]

// Every standings template, grouped by style (the picker shows styles in this order, then the
// layouts each style has). Styles missing a layout get it as they're converted to themes.
const tag = (style: string, entries: [StandingsTemplate, StandingsLayout][]) => entries.map(([t, layout]) => ({ ...t, style, layout }))

export const STANDINGS_TEMPLATES: StandingsTemplate[] = [
  ...tag('Classic', [[TopCutClean, 'topcut'], [Top8Photos, 'top8photos'], [Top8Mixed, 'top8mixed'], [Top4Photos, 'top4photos'], [Champion, 'champion'], [Bracket, 'bracket']]),
  ...tag('Comic Book', [[TopCutLoud, 'topcut'], [Top8PhotosLoud, 'top8photos'], [Top4PhotosLoud, 'top4photos'], [ChampionLoud, 'champion'], [BracketLoud, 'bracket']]),
  ...tag('White', [[TopCutBannerWhite, 'topcut'], [Top8PhotosWhite, 'top8photos'], [Top8MixedWhite, 'top8mixed']]),
  ...tag('Mosaic', [[MosaicTintSemiShadow, 'topcut'], ...MosaicLayouts]),
  ...tag('Mosaic (Tinted Glass)', [[MosaicTintGlass, 'topcut']]),
  ...tag('Mosaic (Tinted Solid)', [[MosaicTintSolid, 'topcut']]),
  ...tag('Mosaic (Tinted Glass + Shadow)', [[MosaicTintGlassShadow, 'topcut']]),
  ...tag('Mosaic (Tinted Solid + Shadow)', [[MosaicTintSolidShadow, 'topcut']]),
  ...tag('Mosaic (Squares Gradient)', [[MosaicSquaresGradient, 'topcut']]),
  ...tag('Mosaic (Gradient)', [[MosaicGradient, 'topcut']]),
  ...tag('Mosaic (Mono)', [[MosaicMono, 'topcut']]),
  ...tag('Mosaic (Squares Mono)', [[MosaicSquaresMono, 'topcut']]),
  ...tag('Editorial Paper', [[EditorialTopCutPaper, 'topcut'], [EditorialChampionPaper, 'champion'], ...EditorialPaperLayouts]),
  ...tag('Editorial Night', [[EditorialTopCutNight, 'topcut'], [EditorialChampionNight, 'champion'], ...EditorialNightLayouts]),
  ...tag('Sports Page', [[SportsPage, 'topcut']]),
  ...tag('Arena Spotlight', [[ArenaSpotlight, 'topcut'], ...ArenaSpotlightLayouts]),
  ...tag('Arena Grid', [[ArenaGrid, 'topcut'], ...ArenaGridLayouts]),
  ...tag('Arena Sunset', [[ArenaSunset, 'topcut'], ...ArenaSunsetLayouts]),
  ...tag('Battle Tower', [[BattleTower, 'topcut']]),
  ...tag('Glimwood Tangle', [[Glimwood, 'topcut']]),
  ...tag('Route 201', [[Route201, 'topcut']]),
  ...tag('Snowpoint', [[Snowpoint, 'topcut']]),
  ...tag('Mt. Coronet', [[MtCoronet, 'topcut']]),
  ...tag('Spear Pillar', [[SpearPillar, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar']]),
  ...tag('Spear Pillar Glass', [[SpearPillarGlass, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar Glass']]),
  ...tag('Spear Pillar Concept Art', [[SpearPillarArt, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar Concept Art']]),
  ...tag('Route 119', [[Route119, 'topcut'], ...PLACE_LAYOUTS['Route 119']]),
  ...tag('Route 119 Glass', [[Route119Glass, 'topcut'], ...PLACE_LAYOUTS['Route 119 Glass']]),
  ...tag('Route 119 Bridge', [[Route119Bridge, 'topcut'], ...PLACE_LAYOUTS['Route 119 Bridge']]),
  ...tag('Route 119 Bridge Glass', [[Route119BridgeGlass, 'topcut'], ...PLACE_LAYOUTS['Route 119 Bridge Glass']]),
  ...tag('Route 120', [[Route120, 'topcut'], ...PLACE_LAYOUTS['Route 120']]),
  ...tag('Route 120 Glass', [[Route120Glass, 'topcut'], ...PLACE_LAYOUTS['Route 120 Glass']]),
  ...tag('Ghost', [[Ghost, 'topcut']]),
  ...tag('Ghost Pixel', [[GhostPixel, 'topcut']]),
  ...tag('Ghost Pixel Dense', [[GhostPixelDense, 'topcut']]),
  ...tag('Ghost Pixel Glass', [[GhostPixelGlass, 'topcut']]),
  ...tag('Ghost Pixel Glass Team Box', [[GhostPixelGlassTeam, 'topcut']]),
  ...tag('Ghost Pixel Glass Team Line', [[GhostPixelGlassLine, 'topcut'], ...GhostPixelLayouts]),
  ...tag('Kanto Game Boy', [[KantoGameBoy, 'topcut']]),
  ...tag('Hoenn Gen 3', [[Hoenn, 'topcut']]),
  ...tag('Paldea', [[Paldea, 'topcut']]),
  ...tag('Unova', [[Unova, 'topcut']]),
  ...tag('Pokédex', [[Pokedex, 'topcut'], [PokedexChampion, 'champion']]),
  ...tag('Trading Card', [[TradingCard, 'champion']]),
  ...tag('Terastal', [[TerastalTopCut, 'topcut'], ...TerastalLayouts]),
  ...tag('Mega Evolution', [[MegaTopCut, 'topcut'], ...MegaLayouts]),
  ...tag('Dynamax', [[DynamaxTopCut, 'topcut'], ...DynamaxLayouts]),
]
export const USAGE_TEMPLATES: UsageTemplate[] = [Usage, ...SIDE_THEMES.map((t) => makeUsage(t))]
export const MATCH_TEMPLATES: MatchTemplate[] = [VsResult, ...SIDE_THEMES.map((t) => makeVsResult(t))]
export const DAY2_TEMPLATES: Day2Template[] = [Day2Clean, RegionalMosaic, RegionalMosaicContrast, EventEditorialPaper, EventEditorialNight] // first = the default
export const TEAM_BATTLE_TEMPLATES: TeamBattleTemplate[] = [TeamBattle, TeamBattleLoud, TeamBattleWin, TeamBattleLoss, ...SIDE_THEMES.map((t) => makeTeamBattle('neutral', false, t))]
