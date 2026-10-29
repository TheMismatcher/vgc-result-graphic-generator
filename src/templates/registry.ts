// Every template the generator can output. Add new designs here.

import type { Day2Template, MatchTemplate, StandingsTemplate, TeamBattleTemplate, UsageTemplate } from './types'
import { TopCutBanner, TopCutBannerWhite, TopCutClean, TopCutLoud } from './top-cut'
import Champion, { ChampionLoud } from './champion'
import Usage from './usage'
import Bracket, { BracketLoud } from './bracket'
import { ArenaGrid, ArenaSpotlight, ArenaSunset } from './arena'
import VsResult from './vs-result'
import Day2Regionals from './day2'
import Day2Clean, { Day2Match } from './day2/clean'
import TeamBattle, { TeamBattleLoss, TeamBattleLoud, TeamBattleWin } from './team-battle'
import Top8Photos, { Top8PhotosLoud, Top8PhotosWhite } from './top8-photos'
import Top4Photos, { Top4PhotosLoud } from './top4-photos'
import Top8Mixed, { Top8MixedWhite } from './top8-mixed'
import SportsPage from './sports-page'
import { EditorialChampionNight, EditorialChampionPaper, EditorialTopCutNight, EditorialTopCutPaper } from './editorial'

export const STANDINGS_TEMPLATES: StandingsTemplate[] = [
  TopCutClean, // first = the default
  TopCutBanner,
  TopCutBannerWhite,
  TopCutLoud,
  EditorialTopCutPaper,
  EditorialTopCutNight,
  SportsPage,
  Top8Photos,
  Top8PhotosWhite,
  Top8PhotosLoud,
  Top8Mixed,
  Top8MixedWhite,
  Top4Photos,
  Top4PhotosLoud,
  Champion,
  ChampionLoud,
  EditorialChampionPaper,
  EditorialChampionNight,
  Bracket,
  BracketLoud,
  ArenaSpotlight,
  ArenaGrid,
  ArenaSunset,
]
export const USAGE_TEMPLATES: UsageTemplate[] = [Usage]
export const MATCH_TEMPLATES: MatchTemplate[] = [VsResult]
export const DAY2_TEMPLATES: Day2Template[] = [Day2Clean, Day2Match, Day2Regionals] // first = the default
export const TEAM_BATTLE_TEMPLATES: TeamBattleTemplate[] = [TeamBattle, TeamBattleLoud, TeamBattleWin, TeamBattleLoss]
