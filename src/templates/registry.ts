import { WideColumns, WideRows, WideSpotlight } from './wide'
import { withPixelSprites } from './shared/parts'
// Every template the generator can output. Add new designs here.

import type { Day2Template, MatchTemplate, StandingsTemplate, TeamBattleTemplate, UsageTemplate } from './types'
import { TopCutBannerWhite, TopCutClean, TopCutLoud } from './top-cut'
import Champion, { ChampionLoud, ChampionLoudPhoto, ChampionPhoto } from './champion'
import Usage, { UsageLoud } from './usage'
import Bracket, { BracketLoud } from './bracket'
import { ArenaGrid, ArenaSpotlight, ArenaSunset } from './arena'
import VsResult, { VsResultLoud } from './vs-result'
import Day2Clean from './day2/clean'
import { RegionalMosaic, RegionalMosaicContrast } from './day2/mosaic'
import { EventEditorialNight, EventEditorialPaper } from './day2/editorial'
import TeamBattle, { TeamBattleLoss, TeamBattleLoud, TeamBattleWin } from './team-battle'
import Top8Photos, { Top8PhotosLoud, Top8PhotosWhite } from './top8-photos'
import Top4Photos, { Top4PhotosLoud } from './top4-photos'
import Top8Mixed, { Top8MixedLoud, Top8MixedWhite } from './top8-mixed'
import SportsPage from './sports-page'
import { SIDE_THEMES, type SideTheme } from './themes/side'
import { makeUsage } from './usage'
import { makeVsResult } from './vs-result'
import { makeTeamBattle } from './team-battle'
import { ArenaGridLayouts, ArenaSpotlightLayouts, ArenaSunsetLayouts } from './themes/arena'
import { MosaicLayouts } from './themes/mosaic'
import { GhostPixelLayouts } from './themes/ghostpixel'
import { EditorialNightLayouts, EditorialPaperLayouts } from './themes/editorial'
import { BattleTower, Ghost, Hoenn, MtCoronet, Pokedex, PokedexChampion, TradingCard } from './eras/more'
import { GhostPixel, GhostPixelDense, GhostPixelGlass, GhostPixelGlassTeam, GhostPixelGlassLine } from './eras/ghostpixel'
import { Glimwood, KantoGameBoy, Route201, Unova } from './eras'
import { DynamaxOfficial, GlimwoodOfficial, SnowpointFull, SnowpointFullGlass, Route217, Route217Glass, AcuityLakefront, AcuityLakefrontGlass, ScarletBook, VioletBook, TerastalOfficial, Route201Tiles, Route201TilesGlass, Route119, Route119Bridge, Route119BridgeGlass, Route119Glass, Route120, Route120Glass, SpearPillarArt, SpearPillarHall, SpearPillarHallChampion, SpearPillarHallChampionGlass, SpearPillarCutscene, SpearPillarCutsceneGlass, CustomGlass, CustomLight } from './places'
import { PLACE_LAYOUTS, placeSideThemeInWeather, spearPillarResultTheme } from './themes/places'
import { DynamaxCloud, DynamaxCloudLayouts, FX_SIDE_THEMES, sideFx, TeraRaidDen, TeraRaidDenLayouts, TeraRaidDenPrism, TeraRaidDenPrismLayouts } from './power/recreated'
import { MosaicGradient, MosaicSquaresGradient, MosaicTintGlass, MosaicTintGlassShadow, MosaicTintSemiShadow, MosaicTintSolid, MosaicTintSolidShadow } from './mosaic'
import { DynamaxTopCut, MegaTopCut, TerastalTopCut } from './power'
import { DynamaxLayouts, MegaLayouts, POWER_SIDE_THEMES, TerastalLayouts } from './power/themes'
import { TradingCardClassic, TradingCardClassicPhoto, TradingCardModern, TradingCardModernPhoto } from './cards'
import { EditorialChampionNight, EditorialChampionPaper, EditorialTopCutNight, EditorialTopCutPaper } from './editorial'

import type { Looks, StandingsLayout, Template } from './types'

/** Layouts in picker order, with their labels. */
export const STANDINGS_LAYOUTS: { id: StandingsLayout; label: string }[] = [
  { id: 'topcut', label: 'Top Cut' },
  { id: 'top8photos', label: 'Top 8 Photos' },
  { id: 'top8mixed', label: 'Top 8 + Top 4 Photos' },
  { id: 'top4photos', label: 'Top 4 Photos' },
  { id: 'champion', label: 'Champion' },
  { id: 'championphoto', label: 'Champion + Photo' },
  { id: 'bracket', label: 'Bracket' },
  // Landscape trials (1920x1080).
  { id: 'widerows', label: 'Wide Rows' },
  { id: 'widespot', label: 'Wide Spotlight' },
  { id: 'widecols', label: 'Wide Columns' },
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

// Which Branding colours each style takes (one dot per colour on its picker card); unlisted styles keep their own
// palette. Found by swapping the colours on every layout and tab. Not counted: Trading Card's empty photo
// placeholder, which uses the second colour until a photo is added.
export type BrandColour = 'main' | 'second' | 'highlight'
const ALL: BrandColour[] = ['main', 'second', 'highlight']
export const BRAND_COLOURS: Record<string, BrandColour[]> = {
  Classic: ALL,
  'Comic Book': ALL,
  White: ALL,
  'Custom Glass': ALL,
  Mosaic: ALL,
  'Editorial Paper': ['main', 'highlight'],
  'Editorial Night': ALL,
  'Sports Page': ['main'],
  'Arena Spotlight': ALL,
  'Arena Grid': ALL,
  'Arena Sunset': ALL,
  'Mega Evolution': ['highlight'], // the winner's gold trim
  Dynamax: ['highlight'],
  'Classic · Win': ALL,
  'Classic · Loss': ['second'],
}

const COMIC_BOOK: [StandingsTemplate, StandingsLayout][] = [[TopCutLoud, 'topcut'], [Top8PhotosLoud, 'top8photos'], [Top8MixedLoud, 'top8mixed'], [Top4PhotosLoud, 'top4photos'], [ChampionLoud, 'champion'], [ChampionLoudPhoto, 'championphoto'], [BracketLoud, 'bracket']]

export const STANDINGS_TEMPLATES: StandingsTemplate[] = [
  ...tag('Classic', [[TopCutClean, 'topcut'], [Top8Photos, 'top8photos'], [Top8Mixed, 'top8mixed'], [Top4Photos, 'top4photos'], [Champion, 'champion'], [ChampionPhoto, 'championphoto'], [Bracket, 'bracket'], [WideRows, 'widerows'], [WideSpotlight, 'widespot'], [WideColumns, 'widecols']]),
  // Comic Book with the HOME 3D renders (the card) or the pixel sprites.
  ...versions('Comic Book', [
    ['Comic Book', { sprites: 'render' }, COMIC_BOOK],
    ['Comic Book Pixel', { sprites: 'pixel' }, COMIC_BOOK.map(([t, l]) => [withPixelSprites(t), l] as [StandingsTemplate, StandingsLayout])],
  ]),
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
  // Sinnoh Snow: Lake Acuity (first, the default), Route 217 or Snowpoint City, Solid or Glass panels.
  ...versions('Sinnoh Snow', [
    ['Sinnoh Snow', { map: 'acuity', panels: 'solid' }, [[AcuityLakefront, 'topcut'], ...PLACE_LAYOUTS['Lake Acuity']]],
    ['Lake Acuity Glass', { map: 'acuity', panels: 'glass' }, [[AcuityLakefrontGlass, 'topcut'], ...PLACE_LAYOUTS['Lake Acuity Glass']]],
    ['Route 217', { map: 'route217', panels: 'solid' }, [[Route217, 'topcut'], ...PLACE_LAYOUTS['Route 217']]],
    ['Route 217 Glass', { map: 'route217', panels: 'glass' }, [[Route217Glass, 'topcut'], ...PLACE_LAYOUTS['Route 217 Glass']]],
    ['Snowpoint Full Map', { map: 'snowpoint', panels: 'solid' }, [[SnowpointFull, 'topcut'], ...PLACE_LAYOUTS['Snowpoint Full Map']]],
    ['Snowpoint Full Map Glass', { map: 'snowpoint', panels: 'glass' }, [[SnowpointFullGlass, 'topcut'], ...PLACE_LAYOUTS['Snowpoint Full Map Glass']]],
  ]),
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
  // Route 119: the bridge (first, the default), the waterfall or Route 120, Solid or Glass panels.
  ...versions('Route 119', [
    ['Route 119', { map: 'bridge', panels: 'solid' }, [[Route119Bridge, 'topcut'], ...PLACE_LAYOUTS['Route 119 Bridge']]],
    ['Route 119 Bridge Glass', { map: 'bridge', panels: 'glass' }, [[Route119BridgeGlass, 'topcut'], ...PLACE_LAYOUTS['Route 119 Bridge Glass']]],
    ['Route 119 Waterfall', { map: 'waterfall', panels: 'solid' }, [[Route119, 'topcut'], ...PLACE_LAYOUTS['Route 119']]],
    ['Route 119 Glass', { map: 'waterfall', panels: 'glass' }, [[Route119Glass, 'topcut'], ...PLACE_LAYOUTS['Route 119 Glass']]],
    ['Route 120', { map: 'route120', panels: 'solid' }, [[Route120, 'topcut'], ...PLACE_LAYOUTS['Route 120']]],
    ['Route 120 Glass', { map: 'route120', panels: 'glass' }, [[Route120Glass, 'topcut'], ...PLACE_LAYOUTS['Route 120 Glass']]],
  ]),
  ...retire('Ghost', [[Ghost, 'topcut']]),
  ...retire('Ghost Pixel', [[GhostPixel, 'topcut']]),
  ...retire('Ghost Pixel Dense', [[GhostPixelDense, 'topcut']]),
  ...retire('Ghost Pixel Glass', [[GhostPixelGlass, 'topcut']]),
  ...retire('Ghost Pixel Glass Team Box', [[GhostPixelGlassTeam, 'topcut']]),
  ...tag('Ghost Pixels', [[GhostPixelGlassLine, 'topcut'], ...GhostPixelLayouts]),
  ...retire('Kanto Game Boy', [[KantoGameBoy, 'topcut']]),
  ...retire('Hoenn Gen 3', [[Hoenn, 'topcut']]),
  ...tag('Unova', [[Unova, 'topcut']]),
  ...tag('Pokédex', [[Pokedex, 'topcut'], [PokedexChampion, 'champion']]),
  // Trading Card: the champion's card (Champion), or with their photo as the card art (Champion + Photo).
  ...versions('Trading Card', [
    ['Trading Card', { card: 'classic' }, [[TradingCardClassic, 'champion'], [TradingCardClassicPhoto, 'championphoto']]],
    ['Trading Card Modern', { card: 'modern' }, [[TradingCardModern, 'champion'], [TradingCardModernPhoto, 'championphoto']]],
  ]),
  ...retire('Trading Card (Old)', [[TradingCard, 'champion']]),
  // Scarlet/Violet Book: either cover.
  ...versions('Scarlet/Violet Book', [
    ['Scarlet/Violet Book', { book: 'scarlet' }, [[ScarletBook, 'topcut'], ...PLACE_LAYOUTS['Scarlet Book']]],
    ['Violet Book', { book: 'violet' }, [[VioletBook, 'topcut'], ...PLACE_LAYOUTS['Violet Book']]],
  ]),
  ...retire('Terastal', [[TerastalTopCut, 'topcut'], ...TerastalLayouts]),
  ...tag('Tera Raid Den', [[TeraRaidDenPrism, 'topcut'], ...TeraRaidDenPrismLayouts]),
  ...retire('Tera Raid Den (Old)', [[TeraRaidDen, 'topcut'], ...TeraRaidDenLayouts]),
  ...retire('Terastal Official', [[TerastalOfficial, 'topcut'], ...PLACE_LAYOUTS['Terastal Official']]),
  ...tag('Mega Evolution', [[MegaTopCut, 'topcut'], ...MegaLayouts]),
  ...tag('Dynamax', [[DynamaxTopCut, 'topcut'], ...DynamaxLayouts]),
  ...retire('Dynamax Cloud', [[DynamaxCloud, 'topcut'], ...DynamaxCloudLayouts]),
  ...retire('Dynamax Official', [[DynamaxOfficial, 'topcut'], ...PLACE_LAYOUTS['Dynamax Official']]),
]
export const DAY2_TEMPLATES: Day2Template[] = [Day2Clean, RegionalMosaic, RegionalMosaicContrast, EventEditorialPaper, EventEditorialNight] // first = the default

// Usage / Replay / Team Battle use the Standings picker too (style cards and switches, no layouts). Each
// themed version shares its theme id with a Standings style, so it takes that style's card name, switches,
// retirement and place in the order from there (via the style's Bracket, which every themed style has).
const STANDINGS_BY_THEME = new Map(STANDINGS_TEMPLATES.filter((t) => t.layout === 'bracket').map((t) => [t.id.replace(/-bracket$/, ''), t]))
const STYLE_ORDER = [...new Set(STANDINGS_TEMPLATES.map((t) => t.variantOf ?? t.style))]
function sideTemplates<T extends Template>(own: [T, string][], themed: (theme: SideTheme & { fx?: Parameters<typeof sideFx>[1] }) => T): T[] {
  const themes = [...SIDE_THEMES.map((t) => ({ ...t, fx: undefined })), ...POWER_SIDE_THEMES.map((t) => ({ ...t, fx: undefined })), ...FX_SIDE_THEMES]
  const order = (t: T) => STYLE_ORDER.indexOf(t.variantOf ?? t.style)
  const list = themes.map((theme) => {
    const s = STANDINGS_BY_THEME.get(theme.id)
    const t = theme.fx ? sideFx(themed(theme), theme.fx) : themed(theme)
    return s ? { ...t, style: s.style, look: s.look, variantOf: s.variantOf, retired: s.retired } : { ...t, style: theme.style }
  })
  return [...own.map(([t, style]) => ({ ...t, style })), ...list.sort((a, b) => order(a) - order(b))]
}
export const USAGE_TEMPLATES: UsageTemplate[] = sideTemplates([[Usage, 'Classic'], [UsageLoud, 'Comic Book']], (t) => makeUsage(t))
export const MATCH_TEMPLATES: MatchTemplate[] = sideTemplates([[VsResult, 'Classic'], [VsResultLoud, 'Comic Book']], (t) => makeVsResult(t))
// Team Battle Win / Loss (from the posting team's side, on the left) as a Result switch on the style's card.
// Trial styles: Mosaic, Editorial Night, Route 119, Sinnoh Snow, Spear Pillar.
const RESULT_THEMES = new Set([
  'mosaic', 'editorial-night',
  'place-route-119', 'place-route-119-glass', 'place-route-119-bridge', 'place-route-119-bridge-glass', 'place-route-120', 'place-route-120-glass',
  'place-route-217', 'place-route-217-glass', 'place-acuity-lakefront', 'place-acuity-lakefront-glass', 'place-snowpoint-full', 'place-snowpoint-full-glass',
  'place-spear-pillar-hall-floor', 'place-spear-pillar-hall-floor-glass', 'place-spear-pillar-cutscene', 'place-spear-pillar-cutscene-glass',
])
export const TEAM_BATTLE_TEMPLATES: TeamBattleTemplate[] = sideTemplates(
  [[TeamBattle, 'Classic'], [TeamBattleLoud, 'Comic Book'], [TeamBattleWin, 'Classic · Win'], [TeamBattleLoss, 'Classic · Loss']],
  (t) => makeTeamBattle('neutral', false, t),
).flatMap((t) => {
  const theme = SIDE_THEMES.find((x) => RESULT_THEMES.has(x.id) && t.id === `${x.id}-dmv-team-battle`)
  if (!theme) return [t]
  // The map itself in the game's weather: Hoenn routes under Emerald's harsh sunlight (Win) or rain (Loss); Sinnoh Snow
  // in Platinum's diamond dust (Win) or heavy snow (Loss), as in the game or stronger (Weather switch). Spear Pillar:
  // the Hall of Origin (Win); Loss under the climax sky, or Giratina in the portal / out of it (Loss scene switch).
  type ResultVersion = { suffix: string; look: Partial<Looks>; theme?: SideTheme }
  const versionsOf = (r: 'win' | 'loss'): ResultVersion[] => {
    const cls = theme.className
    if (cls.includes('pl-hoenn')) return [{ suffix: '', look: {}, theme: placeSideThemeInWeather(theme.id, r === 'win' ? 'drought' : 'rain') }]
    if (cls.includes('pl-snow')) {
      const w = r === 'win' ? 'diamond-dust' : 'snow'
      return [
        { suffix: '', look: { snowfall: 'game' }, theme: placeSideThemeInWeather(theme.id, w) },
        { suffix: '-strong', look: { snowfall: 'strong' }, theme: placeSideThemeInWeather(theme.id, `${w}-strong`) },
      ]
    }
    if (cls.includes('pl-spear')) {
      if (r === 'win') return [{ suffix: '', look: {}, theme: spearPillarResultTheme(theme.id, 'win') }]
      return (['climax', 'portal', 'emerged'] as const).map((scene) => ({
        suffix: scene === 'climax' ? '' : `-${scene}`,
        look: { scene },
        theme: spearPillarResultTheme(theme.id, 'loss', scene),
      }))
    }
    return [{ suffix: '', look: {} }]
  }
  const result = (r: 'win' | 'loss') =>
    versionsOf(r).map((v): TeamBattleTemplate => {
      const made = makeTeamBattle(r, false, v.theme ?? theme)
      return {
        ...made,
        id: made.id + v.suffix,
        style: `${t.style} · ${r === 'win' ? 'Win' : 'Loss'}${v.suffix}`,
        variantOf: t.variantOf ?? t.style,
        retired: t.retired,
        look: { ...t.look, result: r, ...v.look },
      }
    })
  return [{ ...t, look: { ...t.look, result: 'neutral' } }, ...result('win'), ...result('loss')]
})
