// Every template the generator can output. Add new designs here.

import type { Day2Template, MatchTemplate, StandingsTemplate, TeamBattleTemplate, UsageTemplate } from './types'
import { TopCutBannerWhite, TopCutClean, TopCutLoud } from './top-cut'
import Champion, { ChampionLoud, ChampionLoudPhoto, ChampionPhoto } from './champion'
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
import { Glimwood, KantoGameBoy, Paldea, Route201, Unova } from './eras'
import { DynamaxOfficial, GlimwoodOfficial, SnowpointOfficial, SnowpointOfficialGlass, SnowpointFull, SnowpointFullGlass, Route217, Route217Glass, AcuityLakefront, AcuityLakefrontGlass, ScarletBook, VioletBook, TerastalOfficial, Route201Tiles, Route201TilesGlass, Route119, Route119Bridge, Route119BridgeGlass, Route119Glass, Route120, Route120Glass, SpearPillarArt, SpearPillarHall, SpearPillarHallChampion, SpearPillarHallChampionGlass, SpearPillarCutscene, SpearPillarCutsceneGlass, CustomGlass, CustomLight } from './places'
import { PLACE_LAYOUTS } from './themes/places'
import { DynamaxCloud, DynamaxCloudLayouts, FX_SIDE_THEMES, sideFx, TeraRaidDen, TeraRaidDenLayouts, TeraRaidDenPrism, TeraRaidDenPrismLayouts } from './power/recreated'
import { MosaicGradient, MosaicMono, MosaicSquaresGradient, MosaicSquaresMono, MosaicTintGlass, MosaicTintGlassShadow, MosaicTintSemiShadow, MosaicTintSolid, MosaicTintSolidShadow } from './mosaic'
import { DynamaxTopCut, MegaTopCut, TerastalTopCut } from './power'
import { DynamaxLayouts, MegaLayouts, TerastalLayouts } from './power/themes'
import { TradingCardClassic, TradingCardClassicPhoto, TradingCardModern, TradingCardModernPhoto } from './cards'
import { EditorialChampionNight, EditorialChampionPaper, EditorialTopCutNight, EditorialTopCutPaper } from './editorial'

import type { Looks, StandingsLayout } from './types'

/** Layouts in picker order, with their labels. */
export const STANDINGS_LAYOUTS: { id: StandingsLayout; label: string }[] = [
  { id: 'topcut', label: 'Top Cut' },
  { id: 'top8photos', label: 'Top 8 Photos' },
  { id: 'top8mixed', label: 'Top 8 + Top 4 Photos' },
  { id: 'top4photos', label: 'Top 4 Photos' },
  { id: 'champion', label: 'Champion' },
  { id: 'championphoto', label: 'Champion + Photo' },
  { id: 'bracket', label: 'Bracket' },
]

// Every standings template, grouped by style (the picker shows styles in this order, then the
// layouts each style has). Styles missing a layout get it as they're converted to themes.
const tag = (style: string, entries: [StandingsTemplate, StandingsLayout][]) => entries.map(([t, layout]) => ({ ...t, style, layout }))
// Retired: kept so saved selections still open, hidden from the picker unless 'Show retired styles' is ticked.
const retire = (style: string, entries: [StandingsTemplate, StandingsLayout][]) => tag(style, entries).map((t) => ({ ...t, retired: true }))
// Styles that come several ways (Solid / Glass panels, Classic / Modern card, ...): one picker card (`style`);
// the other versions (`variantOf` it) are reached with the Preview's switches. The first entry is named `style`.
type Version = [name: string, look: Partial<Looks>, entries: [StandingsTemplate, StandingsLayout][]]
const versions = (style: string, list: Version[]) =>
  list.flatMap(([name, look, entries], i) => tag(name, entries).map((t) => ({ ...t, look, ...(i ? { variantOf: style } : {}) })))
const glassPair = (style: string, solid: StandingsTemplate, glass: StandingsTemplate) =>
  versions(style, [
    [style, { panels: 'solid' }, [[solid, 'topcut'], ...PLACE_LAYOUTS[style]]],
    [`${style} Glass`, { panels: 'glass' }, [[glass, 'topcut'], ...PLACE_LAYOUTS[`${style} Glass`]]],
  ])

export const STANDINGS_TEMPLATES: StandingsTemplate[] = [
  ...tag('Classic', [[TopCutClean, 'topcut'], [Top8Photos, 'top8photos'], [Top8Mixed, 'top8mixed'], [Top4Photos, 'top4photos'], [Champion, 'champion'], [ChampionPhoto, 'championphoto'], [Bracket, 'bracket']]),
  ...tag('Comic Book', [[TopCutLoud, 'topcut'], [Top8PhotosLoud, 'top8photos'], [Top4PhotosLoud, 'top4photos'], [ChampionLoud, 'champion'], [ChampionLoudPhoto, 'championphoto'], [BracketLoud, 'bracket']]),
  ...tag('White', [[TopCutBannerWhite, 'topcut'], [Top8PhotosWhite, 'top8photos'], [Top8MixedWhite, 'top8mixed']]),
  ...versions('Custom Glass', [
    ['Custom Glass', { panels: 'glass' }, [[CustomGlass, 'topcut'], ...PLACE_LAYOUTS['Custom Glass']]],
    ['Custom Glass Light', { panels: 'solid' }, [[CustomLight, 'topcut'], ...PLACE_LAYOUTS['Custom Glass Light']]],
  ]),
  ...tag('Mosaic', [[MosaicTintSemiShadow, 'topcut'], ...MosaicLayouts]),
  ...retire('Mosaic (Tinted Glass)', [[MosaicTintGlass, 'topcut']]),
  ...retire('Mosaic (Tinted Solid)', [[MosaicTintSolid, 'topcut']]),
  ...retire('Mosaic (Tinted Glass + Shadow)', [[MosaicTintGlassShadow, 'topcut']]),
  ...retire('Mosaic (Tinted Solid + Shadow)', [[MosaicTintSolidShadow, 'topcut']]),
  ...retire('Mosaic (Squares Gradient)', [[MosaicSquaresGradient, 'topcut']]),
  ...retire('Mosaic (Gradient)', [[MosaicGradient, 'topcut']]),
  ...retire('Mosaic (Mono)', [[MosaicMono, 'topcut']]),
  ...retire('Mosaic (Squares Mono)', [[MosaicSquaresMono, 'topcut']]),
  ...tag('Editorial Paper', [[EditorialTopCutPaper, 'topcut'], [EditorialChampionPaper, 'champion'], ...EditorialPaperLayouts]),
  ...tag('Editorial Night', [[EditorialTopCutNight, 'topcut'], [EditorialChampionNight, 'champion'], ...EditorialNightLayouts]),
  ...tag('Sports Page', [[SportsPage, 'topcut']]),
  ...tag('Arena Spotlight', [[ArenaSpotlight, 'topcut'], ...ArenaSpotlightLayouts]),
  ...tag('Arena Grid', [[ArenaGrid, 'topcut'], ...ArenaGridLayouts]),
  ...tag('Arena Sunset', [[ArenaSunset, 'topcut'], ...ArenaSunsetLayouts]),
  ...retire('Battle Tower', [[BattleTower, 'topcut']]),
  ...retire('Glimwood Tangle (Old)', [[Glimwood, 'topcut']]),
  ...tag('Glimwood Tangle', [[GlimwoodOfficial, 'topcut'], ...PLACE_LAYOUTS['Glimwood Tangle']]),
  ...retire('Route 201', [[Route201, 'topcut']]),
  ...glassPair('Route 201 Official', Route201Tiles, Route201TilesGlass),
  ...glassPair('Snowpoint Official', SnowpointOfficial, SnowpointOfficialGlass).map((t) => ({ ...t, retired: true })),
  ...glassPair('Snowpoint Full Map', SnowpointFull, SnowpointFullGlass),
  ...glassPair('Route 217', Route217, Route217Glass),
  ...glassPair('Lake Acuity', AcuityLakefront, AcuityLakefrontGlass),
  ...retire('Mt. Coronet', [[MtCoronet, 'topcut']]),
  ...retire('Spear Pillar Hall of Origin', [[SpearPillarHall, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar Hall of Origin']]),
  // Spear Pillar: the champion on the Hall of Origin's floor or in the cutscene sky, Solid or Glass panels.
  ...versions('Spear Pillar', [
    ['Spear Pillar', { champion: 'hall', panels: 'solid' }, [[SpearPillarHallChampion, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar Hall Champion']]],
    ['Spear Pillar Hall Champion Glass', { champion: 'hall', panels: 'glass' }, [[SpearPillarHallChampionGlass, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar Hall Champion Glass']]],
    ['Spear Pillar Cutscene Sky', { champion: 'sky', panels: 'solid' }, [[SpearPillarCutscene, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar Cutscene Sky']]],
    ['Spear Pillar Cutscene Sky Glass', { champion: 'sky', panels: 'glass' }, [[SpearPillarCutsceneGlass, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar Cutscene Sky Glass']]],
  ]),
  ...retire('Spear Pillar Concept Art', [[SpearPillarArt, 'topcut'], ...PLACE_LAYOUTS['Spear Pillar Concept Art']]),
  ...glassPair('Route 119', Route119, Route119Glass),
  ...glassPair('Route 119 Bridge', Route119Bridge, Route119BridgeGlass),
  ...glassPair('Route 120', Route120, Route120Glass),
  ...retire('Ghost', [[Ghost, 'topcut']]),
  ...retire('Ghost Pixel', [[GhostPixel, 'topcut']]),
  ...retire('Ghost Pixel Dense', [[GhostPixelDense, 'topcut']]),
  ...retire('Ghost Pixel Glass', [[GhostPixelGlass, 'topcut']]),
  ...retire('Ghost Pixel Glass Team Box', [[GhostPixelGlassTeam, 'topcut']]),
  ...tag('Ghost Pixels', [[GhostPixelGlassLine, 'topcut'], ...GhostPixelLayouts]),
  ...tag('Kanto Game Boy', [[KantoGameBoy, 'topcut']]),
  ...retire('Hoenn Gen 3', [[Hoenn, 'topcut']]),
  ...retire('Paldea', [[Paldea, 'topcut']]),
  ...tag('Unova', [[Unova, 'topcut']]),
  ...tag('Pokédex', [[Pokedex, 'topcut'], [PokedexChampion, 'champion']]),
  ...versions('Trading Card', [
    ['Trading Card', { card: 'classic' }, [[TradingCardClassic, 'champion']]],
    ['Trading Card Modern', { card: 'modern' }, [[TradingCardModern, 'champion']]],
  ]),
  ...versions('Trading Card Photo', [
    ['Trading Card Photo', { card: 'classic' }, [[TradingCardClassicPhoto, 'champion']]],
    ['Trading Card Photo Modern', { card: 'modern' }, [[TradingCardModernPhoto, 'champion']]],
  ]),
  ...retire('Trading Card (Old)', [[TradingCard, 'champion']]),
  ...tag('Scarlet Book', [[ScarletBook, 'topcut'], ...PLACE_LAYOUTS['Scarlet Book']]),
  ...tag('Violet Book', [[VioletBook, 'topcut'], ...PLACE_LAYOUTS['Violet Book']]),
  ...retire('Terastal', [[TerastalTopCut, 'topcut'], ...TerastalLayouts]),
  ...tag('Tera Raid Den', [[TeraRaidDenPrism, 'topcut'], ...TeraRaidDenPrismLayouts]),
  ...retire('Tera Raid Den (Old)', [[TeraRaidDen, 'topcut'], ...TeraRaidDenLayouts]),
  ...retire('Terastal Official', [[TerastalOfficial, 'topcut'], ...PLACE_LAYOUTS['Terastal Official']]),
  ...tag('Mega Evolution', [[MegaTopCut, 'topcut'], ...MegaLayouts]),
  ...tag('Dynamax', [[DynamaxTopCut, 'topcut'], ...DynamaxLayouts]),
  ...tag('Dynamax Cloud', [[DynamaxCloud, 'topcut'], ...DynamaxCloudLayouts]),
  ...retire('Dynamax Official', [[DynamaxOfficial, 'topcut'], ...PLACE_LAYOUTS['Dynamax Official']]),
]
export const USAGE_TEMPLATES: UsageTemplate[] = [Usage, ...SIDE_THEMES.map((t) => makeUsage(t)), ...FX_SIDE_THEMES.map((t) => sideFx(makeUsage(t), t.fx))]
export const MATCH_TEMPLATES: MatchTemplate[] = [VsResult, ...SIDE_THEMES.map((t) => makeVsResult(t)), ...FX_SIDE_THEMES.map((t) => sideFx(makeVsResult(t), t.fx))]
export const DAY2_TEMPLATES: Day2Template[] = [Day2Clean, RegionalMosaic, RegionalMosaicContrast, EventEditorialPaper, EventEditorialNight] // first = the default
export const TEAM_BATTLE_TEMPLATES: TeamBattleTemplate[] = [TeamBattle, TeamBattleLoud, TeamBattleWin, TeamBattleLoss, ...SIDE_THEMES.map((t) => makeTeamBattle('neutral', false, t)), ...FX_SIDE_THEMES.map((t) => sideFx(makeTeamBattle('neutral', false, t), t.fx))]
