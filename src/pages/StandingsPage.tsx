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
import { Button, Card } from '../components/ui'
import { Box, Tab, Tabs } from '@mui/material'
import React, { type ReactNode } from 'react'
import type { StandingsTemplate } from '../templates/types'

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
  const template = STANDINGS_TEMPLATES.find((t) => t.id === state.templates.standings) ?? STANDINGS_TEMPLATES[0];
  const render = (t: StandingsTemplate): ReactNode => <t.Component data={standingsData(state, t.maxPlayers)}></t.Component>;
  const onSelect = (id: string) => setState((s) => ({ ...s, templates: { ...s.templates, standings: id } }));
  const handleInputTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setInputTab(newValue);
  };
  
  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }

  const event = eventInfo(state.tournament)
  const setPlayers = (fn: (players: Player[]) => Player[]) => setState((s) => ({ ...s, players: fn(s.players) }))
  const move = (i: number, dir: -1 | 1) =>
    setPlayers((ps) => {
      const next = ps.slice()
      ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
      return next
    })

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="space-y-2">
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={inputTab} onChange={handleInputTabChange} aria-label="basic tabs example">
              <Tab label="Templates" {...a11yProps(0)} />
              <Tab label="Data" {...a11yProps(1)} />
            </Tabs>
          </Box>
          {/* template pannel */}
          <CustomTabPanel value={inputTab} index={0}>
            {STANDINGS_TEMPLATES.length > 1 && STANDINGS_TEMPLATES.every((t) => t.style) ? (
              <StylePicker templates={STANDINGS_TEMPLATES} current={template} onSelect={onSelect} render={render} />
            ) : STANDINGS_TEMPLATES.length > 1 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Template</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STANDINGS_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelect(t.id)}
                      className={`rounded-xl border-2 p-2 text-left transition ${t.id === template.id ? 'border-[#b3121b] bg-red-50' : 'border-slate-200 hover:border-slate-400'}`}
                    >
                      <div className="pointer-events-none mb-2 overflow-hidden rounded-md" aria-hidden>
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
            <div className="space-y-4">
              <Card className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Data Source</h2>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={inputTab} onChange={handleInputTabChange} aria-label="basic tabs example">
                    <Tab label="Limitless" {...a11yProps(0)} />
                    <Tab label="TOM File" {...a11yProps(1)} />
                    <Tab label="Photo / PDF" {...a11yProps(2)} />
                  </Tabs>
                </Box>
                <CustomTabPanel value={inputTab} index={0}>
                  <LimitlessImport setState={setState} />
                </CustomTabPanel>
                <CustomTabPanel value={inputTab} index={1}>
                  <TdfUpload setState={setState} />
                </CustomTabPanel>
                <CustomTabPanel value={inputTab} index={2}>
                  <StandingsPhotoImport setState={setState} />
                </CustomTabPanel>
              </Card>
              <TournamentForm value={state.tournament} onChange={(tournament) => setState((s) => ({ ...s, tournament }))} />

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Standings</h2>
                <span className="text-sm text-slate-500">Order = placing. Use ↑ ↓ to reorder.</span>
              </div>
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
              <Button className="w-full py-3" onClick={() => setPlayers((ps) => [...ps, newPlayer()])}>+ Add player</Button>
              <BracketEditor state={state} setState={setState} />
            </div>  
          </CustomTabPanel>
         
      </Card>
      

      <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(80vh-10rem)]">
        <Preview
          templates={STANDINGS_TEMPLATES}
          selectedId={state.templates.standings}
          onSelect={onSelect}
          filenameBase={state.tournament.name}
          render={render}
          allowCP
          showTemplates={false}
        />
      </div>
    </div>
  )
}
