import type { AppState, Player } from '../types'
import { STANDINGS_TEMPLATES } from '../templates/registry'
import { eventInfo, standingsData } from '../lib/event'
import { newPlayer } from '../lib/state'
import { ordinal } from '../templates/shared/format'
import { PlayerEditor } from '../components/PlayerEditor'
import { Preview } from '../components/Preview'
import { TournamentForm } from '../components/TournamentForm'
import { LimitlessImport } from '../components/LimitlessImport'
import { TdfUpload } from '../components/tdfUpload'
import { StandingsPhotoImport } from '../components/StandingsPhotoImport'
import { BracketEditor } from '../components/BracketEditor'
import { Button, Card } from '../components/ui'
import { Box, Tab, Tabs } from '@mui/material'
import React from 'react'

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



export function StandingsPage({ state, setState }: { state: AppState; setState: (fn: (s: AppState) => AppState) => void }) {
  const [inputTab, setInputTab] = React.useState(0);

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

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Preview
          templates={STANDINGS_TEMPLATES}
          selectedId={state.templates.standings}
          onSelect={(id) => setState((s) => ({ ...s, templates: { ...s.templates, standings: id } }))}
          filenameBase={state.tournament.name}
          render={(t) => <t.Component data={standingsData(state, t.maxPlayers)} />}
          allowCP
        />
      </div>
    </div>
  )
}
