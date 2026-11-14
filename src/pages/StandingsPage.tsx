import type { AppState, Player } from '../types'
import { STANDINGS_TEMPLATES } from '../templates/registry'
import { eventInfo, standingsData } from '../lib/event'
import { newPlayer } from '../lib/state'
import { ordinal } from '../templates/shared/format'
import { PlayerEditor } from '../components/PlayerEditor'
import { Preview, Scaled, StylePicker } from '../components/Preview'
import { TournamentForm } from '../components/TournamentForm'
import { LimitlessImport } from '../components/LimitlessImport'
import { TdfUpload } from '../components/tdfUpload'
import { StandingsPhotoImport } from '../components/StandingsPhotoImport'
import { BracketEditor } from '../components/BracketEditor'
import { BulkTeamSheetImport } from '../components/BulkTeamSheetImport'
import { Button, Card, Field, Input } from '../components/ui'
import { autoDeck, autoHeadline } from '../templates/sports-page'
import { Box, Tab, Tabs } from '@mui/material'
import React, { type ReactNode } from 'react'
import type { StandingsTemplate } from '../templates/types'
import { t } from '../i18n'

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      tabIndex={0}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}



export function StandingsPage({ 
  state, 
  setState, 
}: { 
  state: AppState; 
  setState: (fn: (s: AppState) => AppState) => void, 
}) {
  const [inputTab, setInputTab] = React.useState(0);
  // The Data panel's own source tabs (Limitless / TOM File / Photo / PDF); separate from Templates / Data.
  const [sourceTab, setSourceTab] = React.useState(0);
  const [bulkSheets, setBulkSheets] = React.useState(false);
  const template = STANDINGS_TEMPLATES.find((t) => t.id === state.templates.standings) ?? STANDINGS_TEMPLATES[0];
  const render = (t: StandingsTemplate): ReactNode => <t.Component data={standingsData(state, t.maxPlayers)}></t.Component>;
  const onSelect = (id: string) => setState((s) => ({ ...s, templates: { ...s.templates, standings: id } }));
  const handleInputTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setInputTab(newValue);
  };
  
  function a11yProps(index: number, prefix = 'simple') {
    return {
      id: `${prefix}-tab-${index}`,
      'aria-controls': `${prefix}-tabpanel-${index}`,
    };
  }

  const event = eventInfo(state.tournament)
  const setTournament = (patch: Partial<AppState['tournament']>) => setState((s) => ({ ...s, tournament: { ...s.tournament, ...patch } }))
  // Sports Page: the headline and subheadline can be the user's own; the boxes show the automatic text until typed in.
  const sportsData = template.style === 'Sports Page' ? standingsData(state, template.maxPlayers) : null
  const sportsControls = sportsData && (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <Field label={t('ui.preview.sportsHeadline')}>
        <Input value={state.tournament.headline ?? ''} placeholder={autoHeadline(sportsData)} onChange={(e) => setTournament({ headline: e.target.value || undefined })} />
      </Field>
      <Field label={t('ui.preview.sportsDeck')}>
        <Input value={state.tournament.deck ?? ''} placeholder={autoDeck(sportsData)} onChange={(e) => setTournament({ deck: e.target.value || undefined })} />
      </Field>
      <p className="text-xs text-slate-500">{t('ui.preview.sportsTextHint')}</p>
    </div>
  )
  const setPlayers = (fn: (players: Player[]) => Player[]) => setState((s) => ({ ...s, players: fn(s.players) }))
  const move = (i: number, dir: -1 | 1) =>
    setPlayers((ps) => {
      const next = ps.slice()
      ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
      return next
    })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="space-y-2">
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={inputTab} onChange={handleInputTabChange} aria-label={t('ui.standings.tabsLabel')}>
              <Tab label={t('ui.standings.tabTemplates')} {...a11yProps(0)} />
              <Tab label={t('ui.standings.tabData')} {...a11yProps(1)} />
            </Tabs>
          </Box>
          {/* template pannel */}
          <CustomTabPanel value={inputTab} index={0}>
            {STANDINGS_TEMPLATES.length > 1 && STANDINGS_TEMPLATES.every((t) => t.style) ? (
              <StylePicker templates={STANDINGS_TEMPLATES} current={template} onSelect={onSelect} render={render} />
            ) : STANDINGS_TEMPLATES.length > 1 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ui.standings.templateHeading')}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STANDINGS_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelect(t.id)}
                      className={`rounded-xl border-2 p-2 text-left transition ${t.id === template.id ? 'border-[#b3121b] bg-red-50' : 'border-slate-200 hover:border-slate-400'}`}
                    >
                      <div className="picker-thumb pointer-events-none mb-2 overflow-hidden rounded-md" aria-hidden>
                        <Scaled width={t.width} height={t.height}>{render(t)}</Scaled>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.description}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{t.width}×{t.height}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CustomTabPanel>

           {/* data pannel */}
          <CustomTabPanel value={inputTab} index={1}>
            <div className="space-y-3">
              <Card className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">{t('ui.standings.dataSource')}</h2>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={sourceTab} onChange={(_e, v: number) => setSourceTab(v)} aria-label={t('ui.standings.sourceLabel')}>
                    {/* i18n-ignore: brand name */}
                    <Tab label="Limitless" {...a11yProps(0, 'source')} />
                    <Tab label={t('ui.standings.sourceTom')} {...a11yProps(1, 'source')} />
                    <Tab label={t('ui.standings.sourcePhoto')} {...a11yProps(2, 'source')} />
                  </Tabs>
                </Box>
                <CustomTabPanel value={sourceTab} index={0}>
                  <LimitlessImport setState={setState} />
                </CustomTabPanel>
                <CustomTabPanel value={sourceTab} index={1}>
                  <TdfUpload setState={setState} />
                </CustomTabPanel>
                <CustomTabPanel value={sourceTab} index={2}>
                  <StandingsPhotoImport setState={setState} />
                </CustomTabPanel>
              </Card>
              <TournamentForm value={state.tournament} onChange={(tournament) => setState((s) => ({ ...s, tournament }))} />

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{t('ui.standings.standingsHeading')}</h2>
                <span className="text-sm text-slate-500">{t('ui.standings.orderHint')}</span>
              </div>
              {bulkSheets ? (
                <BulkTeamSheetImport
                  players={state.players}
                  onApply={(players) => { setState((s) => ({ ...s, players })); setBulkSheets(false) }}
                  onCancel={() => setBulkSheets(false)}
                />
              ) : (
                <Button className="w-full" onClick={() => setBulkSheets(true)}>{t('ui.standings.bulkImport')}</Button>
              )}
              {state.players.map((p, i) => (
                <PlayerEditor
                  key={p.uid}
                  player={p}
                  label={ordinal(i + 1)}
                  format={event.format}
                  isFirst={i === 0}
                  isLast={i === state.players.length - 1}
                  onChange={(np) => setPlayers((ps) => ps.map((x) => (x.uid === p.uid ? np : x)))}
                  onMove={(dir) => move(i, dir)}
                  onRemove={() => setPlayers((ps) => ps.filter((x) => x.uid !== p.uid))}
                />
              ))}
              <Button className="w-full py-3" onClick={() => setPlayers((ps) => [...ps, newPlayer()])}>{t('ui.standings.addPlayer')}</Button>
              <BracketEditor state={state} setState={setState} />
            </div>  
          </CustomTabPanel>
         
      </Card>
      

      <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
        <Preview
          templates={STANDINGS_TEMPLATES}
          selectedId={state.templates.standings}
          onSelect={onSelect}
          filenameBase={state.tournament.name}
          render={render}
          allowCP
          showTemplates={false}
          controls={sportsControls}
          photos={{ players: state.players, onChange: (uid, patch) => setPlayers((ps) => ps.map((p) => (p.uid === uid ? { ...p, ...patch } : p))) }}
        />
      </div>
    </div>
  )
}
