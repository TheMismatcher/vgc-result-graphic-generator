import { useState } from 'react'
import type { AppState, Mon, Player } from '../types'
import { Button, Card, Field, Select } from './ui'
import { XMLParser } from 'fast-xml-parser'
import type { Tournament } from '../types'
import { TOURNAMENT_TYPES } from '../data/options'


function forceArray(val: any[]) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export function TdfUpload({ setState }: { setState: (fn: (s: AppState) => AppState) => void }) {
    const [xmlFile, setXmlData] = useState<File | null>(null);
    const [error, setError] = useState("");
    let type = "challenge";
    
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setXmlData(e.target.files[0]);
        }
	};
    
    const setType = (e:string) =>{
        type = e;
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
                    ignoreAttributes: false, // Keeps your XML attributes
                    attributeNamePrefix: "@_", // Prefixes attributes so they don't collide with tags
                    parseTagValue: true,    // Converts numeric strings to numbers automatically
                };

                const parser = new XMLParser(options);
                const tournamentData = parser.parse(xmlText).tournament;
                
                const finishedPods = tournamentData.standings.pod.filter(x=> x['@_type'] == 'finished');
                
                const t:Tournament = {
                    name: tournamentData.data.name
                    ,type: type
                    ,date: new Date(tournamentData.data.startdate).toISOString().split('T')[0] // yyyy-mm-dd
                    ,format: "" // Format name
                    ,customFormat: ""
                    ,divisions: { 
                        masters: forceArray(finishedPods.filter(x=>x['@_category'] == '2')[0].player).length ?? 0
                        ,seniors: forceArray(finishedPods.filter(x=>x['@_category'] == '1')[0].player).length ?? 0
                        ,juniors: forceArray(finishedPods.filter(x=>x['@_category'] == '0')[0].player).length ?? 0
                    }
                }

                const placements = finishedPods.flatMap(x=>forceArray(x.player));
                
                let ps: Player[] = tournamentData.players.player?.map(p=>{
                    const player: Player = {
                        uid: p['@_userid'],
                        name: p.firstname + " " + p.lastname,
                        record: '',
                        social: '',
                        team: teamBuildFunction(['', ''],['', ''],['', ''],['', ''],['', ''],['', ''])
                    };
                    const standing = placements.find(x=>x['@_id'] == p.uid)
                    if(standing){
                        (player as any).finalStanding = standing['@_place'] ?? Infinity
                    }
                    return player;
                });

                ps.sort((a, b) => (a as any).finalStanding - (b as any).finalStanding);

                setState((s) => ({ ...s 
                    ,tournament: { ...s.tournament, ...t }
                    ,players: ps
                    // ,players: result.players
                    // , bracket: result.bracket
                }))
                setError("");
            } catch (err) {
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
        <p className="text-sm text-slate-600">Parses standings from a .tdf (XML) file for sanctioned events run via TOM. No data is retained locally.</p>
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
                <Field label="Type">
                    <Select value={type} onChange={(e) => setType(e.target.value)}>
                        {TOURNAMENT_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </Select>
                </Field>
                <Button variant="primary" style={{ height: 'fit-content'}} disabled={!xmlFile} onClick={onImport}>{'Import'}</Button>
            </div>
        </div>     
        
    </div>
  )
}
