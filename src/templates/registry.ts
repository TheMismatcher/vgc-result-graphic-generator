// Every template the generator can output. Add new designs here.

import type { Day2Template, MatchTemplate, StandingsTemplate, TeamBattleTemplate, UsageTemplate } from './types'
import TopCut, { TopCutBubbles, TopCutDarkBubbles } from './top-cut'
import Champion from './champion'
import Usage from './usage'
import Bracket from './bracket'
import { ArenaGrid, ArenaSpotlight, ArenaSunset } from './arena'
import VsResult from './vs-result'
import Day2Regionals from './day2'
import TeamBattle, { TeamBattleLoss, TeamBattleWin } from './team-battle'
import Top8Photos, { Top8PhotosWhite } from './top8-photos'
import Top4Photos from './top4-photos'
import Top8Mixed, { Top8MixedWhite } from './top8-mixed'

export const STANDINGS_TEMPLATES: StandingsTemplate[] = [
  TopCut,
  TopCutBubbles,
  TopCutDarkBubbles,
  Top8Photos,
  Top8PhotosWhite,
  Top8Mixed,
  Top8MixedWhite,
  Top4Photos,
  Champion,
  Bracket,
  ArenaSpotlight,
  ArenaGrid,
  ArenaSunset,
]
export const USAGE_TEMPLATES: UsageTemplate[] = [Usage]
export const MATCH_TEMPLATES: MatchTemplate[] = [VsResult]
export const DAY2_TEMPLATES: Day2Template[] = [Day2Regionals]
export const TEAM_BATTLE_TEMPLATES: TeamBattleTemplate[] = [TeamBattle, TeamBattleWin, TeamBattleLoss]
