import { useState } from 'react'
import type { AppState, Mon, Player } from '../types'
import { Button, Field, Input, Select } from './ui'
import { XMLParser } from 'fast-xml-parser'
import type { Tournament } from '../types'
import { TOURNAMENT_TYPES, eventTypeKey } from '../data/options'
import { t } from '../i18n'


function forceArray(val: any[]) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export function TdfUpload({ setState }: { setState: (fn: (s: AppState) => AppState) => void }) {
    const [xmlFile, setXmlData] = useState<File | null>(null);
    const [top, setTop] = useState(8)
    const [type, setType] = useState<{ id: string, name:string }>(TOURNAMENT_TYPES[1]);
    
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setXmlData(e.target.files[0]);
        }
	};
    
    const setSelectedType = (e:string) =>{
        setType(TOURNAMENT_TYPES.find(x=>x.id == e) ?? TOURNAMENT_TYPES[1]);
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
                
                const finishedPods = tournamentData.standings.pod.filter((x: { [x: string]: string })=> x['@_type'] == 'finished');
                
                // get tournament data
                const tournament:Tournament = {
                    name: tournamentData.data.name
                    ,type: type.id
                    ,date: new Date(tournamentData.data.startdate).toISOString().split('T')[0]
                    ,format: ""
                    ,customFormat: ""
                    ,divisions: { 
                        masters: forceArray(finishedPods.filter((x: { [x: string]: string })=>x['@_category'] == '2')[0].player).length ?? 0
                        ,seniors: forceArray(finishedPods.filter((x: { [x: string]: string })=>x['@_category'] == '1')[0].player).length ?? 0
                        ,juniors: forceArray(finishedPods.filter((x: { [x: string]: string })=>x['@_category'] == '0')[0].player).length ?? 0
                    }
                }

                const today = new Date();

                //get players
                const placements = finishedPods.flatMap((x: { player: any[] })=>forceArray(x.player));
                const playerMap: Record<string, Player> = {};
                tournamentData.players.player?.map((p: { [x: string]: any; birthdate: string | number | Date; firstname: string; lastname: string })=>{
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
                    const standing = placements.find((x: { [x: string]: string })=>x['@_id'] == player.uid)
                    if(standing){
                        player.finalStanding = standing['@_place'] ?? Infinity
                    }
                    return player;
                }).forEach((p: Player)=>{
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
                    ,tournament: { ...s.tournament, ...tournament }
                    ,players: ps
                    // ,players: result.players
                    // , bracket: result.bracket
                }))
            } catch (err) {
                alert(err);
                setXmlData(null);
            }
        };

        reader.onerror = () => {
            alert(t('ui.import.tdf.readError'));
        };

        reader.readAsText((file as Blob));
    };

  return (
    <div className="space-y-3">
        <p className="text-sm text-slate-600">{t('ui.import.tdf.intro')}</p>
        <div className="flex flex-col items-start gap-2" style={{width: '100%'}}>
            <Field label={t('ui.import.tdf.fileSelection')}>
                <div className="flex flex-row gap-2" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                    <Button variant='primary'>
                        <label htmlFor="fileSelect" style={{textWrap: 'nowrap' }}>{t('ui.import.tdf.selectFile')}</label>
                        <input id="fileSelect" name="fileSelect" style={{ display: 'none' }} type="file" onChange={onFileChange} accept='.tdf' />
                    </Button>
                    <p>{xmlFile ? ` ${xmlFile.name}` : ` ${t('ui.import.tdf.noFile')}`}</p>
                </div>
            </Field>
            <div className="flex flex-row align-items" style={{width: '100%', display: 'flex', alignItems: 'end', justifyContent: 'space-between'}}>   
                <Field label={t('ui.tournament.type')} className="w-90">
                    <Select value={type.id} onChange={(e) => setSelectedType(e.target.value)}>
                        {TOURNAMENT_TYPES.map((type) => (
                            <option key={type.id} value={type.id}>{t(eventTypeKey(type.id))}</option>
                        ))}
                    </Select>
                </Field>
                <Field label={t('ui.common.top')} className="w-20">
                    <Input type="number" min={1} max={64} value={top} onChange={(e) => setTop(Math.max(1, Number(e.target.value) || 1))} />
                </Field>
                <Button variant="primary" style={{ height: 'fit-content'}} disabled={!xmlFile} onClick={onImport}>{t('ui.common.import')}</Button>
            </div>
        </div>     
        
    </div>
  )
}
