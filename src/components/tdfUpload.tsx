import { useState } from 'react'
import type { AppState, Mon, Player } from '../types'
import { Button, Card, Field, Input, Select } from './ui'
import { XMLParser } from 'fast-xml-parser'
import type { Tournament } from '../types'
import { TOURNAMENT_TYPES } from '../data/options'


function forceArray(val: any[]) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

let type = TOURNAMENT_TYPES[1];

export function TdfUpload({ setState }: { setState: (fn: (s: AppState) => AppState) => void }) {
    const [xmlFile, setXmlData] = useState<File | null>(null);
    const [error, setError] = useState("");
    const [top, setTop] = useState(8)
    const [type, setType] = useState<{ id: string, name:string }>(TOURNAMENT_TYPES[1]);
    
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setXmlData(e.target.files[0]);
        }
	};
    
    const setSelectedType = (e:string) =>{
        setType(TOURNAMENT_TYPES.find(t=>t.id == e) ?? TOURNAMENT_TYPES[1]);
    }

    const teamBuildFunction = (...mons: [string, string][]): Mon[] => mons.map(([pokemon, item]) => ({ pokemon, item, tera: '' }))

	const onImport = async() => {
        const file = xmlFile;
        const reader = new FileReader();

        reader.onload = (e) => {
            const xmlText = (e.target?.result as string);
            if(!xmlText) return;
            try {
                const options = {
                    ignoreAttributes: false,
                    attributeNamePrefix: "@_",
                    parseTagValue: true,
                };

                const parser = new XMLParser(options);
                const tournamentData = parser.parse(xmlText).tournament;
                
                const finishedPods = tournamentData.standings.pod.filter(x=> x['@_type'] == 'finished');
                
                // get tournament data
                const t:Tournament = {
                    name: tournamentData.data.name
                    ,type: type.id
                    ,date: new Date(tournamentData.data.startdate).toISOString().split('T')[0]
                    ,format: ""
                    ,customFormat: ""
                    ,divisions: { 
                        masters: forceArray(finishedPods.filter(x=>x['@_category'] == '2')[0].player).length ?? 0
                        ,seniors: forceArray(finishedPods.filter(x=>x['@_category'] == '1')[0].player).length ?? 0
                        ,juniors: forceArray(finishedPods.filter(x=>x['@_category'] == '0')[0].player).length ?? 0
                    }
                }

                const today = new Date();

                //get players
                const placements = finishedPods.flatMap(x=>forceArray(x.player));
                const playerMap: Record<string, Player> = {};
                tournamentData.players.player?.map(p=>{
                    const birthdate = new Date(p.birthdate);
                    const diffInMs = Math.abs(today.getTime() - birthdate.getTime());
                    const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
                    const diffInYears = Math.floor(diffInMs / msPerYear);
                    const division = diffInYears >= 17 ? 'masters' : (diffInYears >= 12 ? 'seniors' : 'juniors');
                    
                    const player: Player = {
                        uid: p['@_userid'],
                        name: division == 'masters' ? p.firstname + " " + p.lastname : p.firstname + " " + p.lastname.charAt(0) + ".",
                        record: '',
                        social: '',
                        team: teamBuildFunction(['', ''],['', ''],['', ''],['', ''],['', ''],['', '']),
                        finalStanding: Infinity,
                        wins: 0,
                        losses: 0,
                        ties: 0,
                    };
                    player.division = division;
                    const standing = placements.find(x=>x['@_id'] == player.uid)
                    if(standing){
                        player.finalStanding = standing['@_place'] ?? Infinity
                    }
                    return player;
                }).forEach(p=>{
                    playerMap[p.uid] = p;
                });

                
                
                
                //get records by round
                const roundMatchesMap: Record<string, any[]> = {};
                //diving awkwardly to make brakets later
                const rounds = forceArray(tournamentData.pods.pod.rounds.round);
                rounds.forEach(round => {
                    const matches = forceArray(round.matches.match);
                    roundMatchesMap[round['@_number']] = matches;
                });

                rounds.flatMap(round => forceArray(round.matches.match)).forEach(match=>{
                    switch(match['@_outcome']){
                        case "1":
                            playerMap[match.player1['@_userid']].wins! += 1;
                            playerMap[match.player2['@_userid']].losses! += 1;
                            break;
                        case "2":
                            playerMap[match.player2['@_userid']].wins! += 1;
                            playerMap[match.player1['@_userid']].losses! += 1;
                            break;
                        case "5": //bye
                            playerMap[match.player['@_userid']].wins! += 1;
                            break;
                        default:
                            playerMap[match.player1['@_userid']].ties! += 1;
                            playerMap[match.player2['@_userid']].ties! += 1;
                            break;
                    }
                });
                
                let ps = playerMap ? Object.values(playerMap) : [];
                ps.forEach(p=>{
                    p.record = `${p.wins}-${p.losses}-${p.ties}`;
                });
                
                //keep only masters and sort by final standing
                ps = ps.filter(p=>p.division == 'masters')
                    .sort((a, b) => a.finalStanding! - b.finalStanding!)
                    .slice(0, top);
                
                setState((s) => ({ ...s 
                    ,tournament: { ...s.tournament, ...t }
                    ,players: ps
                    // ,players: result.players
                    // , bracket: result.bracket
                }))
                setError("");
            } catch (err) {
                alert(err);
                setError("Failed to parse TDF Data. Please ensure the file is valid.");
                setXmlData(null);
            }
        };

        reader.onerror = () => {
            setError("Error reading the file.");
        };

        reader.readAsText((file as Blob));
    };

  return (
    <div className="space-y-3">
        <p className="text-sm text-slate-600">Parses standings from a .tdf (XML) file for events run via TOM. All data is processed locally and not retained.</p>
        <div className="flex flex-col items-start gap-2" style={{width: '100%'}}>
            <Field label="File Selection">
                <div className="flex flex-row gap-2" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                    <Button variant='primary'>
                        <label htmlFor="fileSelect" style={{textWrap: 'nowrap' }}>Select File</label>
                        <input id="fileSelect" name="fileSelect" style={{ display: 'none' }} type="file" onChange={onFileChange} accept='.tdf' />
                    </Button>
                    <p>{xmlFile ? ` ${xmlFile.name}` : ' No file selected'}</p>
                </div>
            </Field>
            <div className="flex flex-row align-items" style={{width: '100%', display: 'flex', alignItems: 'end', justifyContent: 'space-between'}}>   
                <Field label="Type" className="w-90">
                    <Select value={type.id} onChange={(e) => setSelectedType(e.target.value)}>
                        {TOURNAMENT_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </Select>
                </Field>
                <Field label="Top" className="w-20">
                    <Input type="number" min={1} max={64} value={top} onChange={(e) => setTop(Math.max(1, Number(e.target.value) || 1))} />
                </Field>
                <Button variant="primary" style={{ height: 'fit-content'}} disabled={!xmlFile} onClick={onImport}>{'Import'}</Button>
            </div>
        </div>     
        
    </div>
  )
}
