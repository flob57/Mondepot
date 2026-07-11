import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Bus, CalendarDays, CarFront, CheckCircle2, Clock3, Fuel, Gauge,
  Home, Pencil, Play, Plus, Save, Settings as SettingsIcon, Square, Trash2, WalletCards
} from 'lucide-react';
import { storage, defaultSettings } from './lib/storage';
import type { DayOff, DeclaredHours, DrivingSession, FuelEntry, Settings, WorkSession } from './lib/types';
import { createId, formatDateTime, formatDuration, formatMinutes, inRange, localDateValue, startOfWeek, timeRangeMinutes } from './lib/time';

type Page = 'home' | 'clock' | 'stats' | 'settings';

type AppData = {
  work: WorkSession[];
  driving: DrivingSession[];
  fuel: FuelEntry[];
  declared: DeclaredHours[];
  daysOff: DayOff[];
  settings: Settings;
};

function loadData(): AppData {
  return {
    work: storage.getWork(), driving: storage.getDriving(), fuel: storage.getFuel(),
    declared: storage.getDeclared(), daysOff: storage.getDaysOff(), settings: storage.getSettings(),
  };
}

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [data, setData] = useState<AppData>(loadData);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => { storage.setWork(data.work); }, [data.work]);
  useEffect(() => { storage.setDriving(data.driving); }, [data.driving]);
  useEffect(() => { storage.setFuel(data.fuel); }, [data.fuel]);
  useEffect(() => { storage.setDeclared(data.declared); }, [data.declared]);
  useEffect(() => { storage.setDaysOff(data.daysOff); }, [data.daysOff]);
  useEffect(() => { storage.setSettings(data.settings); }, [data.settings]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">☀</div><div><strong>DepotDash</strong><span>Centre opérationnel<br/>Océlorn</span></div></div>
        <nav>
          <NavButton active={page === 'home'} icon={<Home size={18}/>} label="Tableau de bord" onClick={() => setPage('home')} />
          <NavButton active={page === 'clock'} icon={<Clock3 size={18}/>} label="Ma pointeuse" onClick={() => setPage('clock')} />
          <NavButton active={page === 'stats'} icon={<BarChart3 size={18}/>} label="Statistiques" onClick={() => setPage('stats')} />
          <div className="nav-spacer" />
          <NavButton active={page === 'settings'} icon={<SettingsIcon size={18}/>} label="Paramètres" onClick={() => setPage('settings')} />
        </nav>
      </aside>
      <main className="content">
        {page === 'home' && <Dashboard data={data} now={now} setPage={setPage} />}
        {page === 'clock' && <ClockPage data={data} setData={setData} now={now} />}
        {page === 'stats' && <StatisticsPage data={data} now={now} />}
        {page === 'settings' && <SettingsPage data={data} setData={setData} />}
      </main>
    </div>
  );
}

function NavButton({active, icon, label, onClick}:{active:boolean;icon:React.ReactNode;label:string;onClick:()=>void}) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function Dashboard({data, now, setPage}:{data:AppData;now:number;setPage:(p:Page)=>void}) {
  const overtime = computeOvertime(data, now);
  const paidLeave = data.settings.paidLeaveN1 + data.settings.paidLeaveN;
  const activeWork = data.work.find(s => !s.end);
  return <>
    <PageHeader title="Tableau de bord" subtitle="Votre activité personnelle en un coup d’œil" />
    <section className="dashboard-grid">
      <article className="panel task-panel"><div className="panel-title"><CheckCircle2/><h3>Tâches du jour</h3></div><p className="muted">Aucune tâche restante pour aujourd’hui.</p></article>
      <article className="panel shortcut-panel"><button className="outline-button" onClick={() => setPage('settings')}><SettingsIcon size={18}/>Configurer Notion</button><button className="outline-button"><CalendarDays size={18}/>Vacances scolaires</button><div className="context-pill">Mode local actif · synchronisation Notion à configurer</div></article>
      <article className="metric-panel"><span>Heures supplémentaires</span><strong className={overtime >= 0 ? 'positive' : 'negative'}>{formatMinutes(overtime)}</strong></article>
      <article className="metric-panel"><span>Congés payés</span><strong>{paidLeave.toFixed(1)} j</strong><small>N-1 : {data.settings.paidLeaveN1.toFixed(1)} · N : {data.settings.paidLeaveN.toFixed(1)}</small></article>
    </section>
    <section className="panel hero-action"><div><span className="kicker">Aujourd’hui</span><h2>{activeWork ? 'Vous êtes en service' : 'Prêt à commencer ?'}</h2><p className="muted">{activeWork ? `Compteur en cours : ${formatDuration(now - new Date(activeWork.start).getTime())}` : 'Démarrez votre journée depuis la pointeuse.'}</p></div><button className="primary" onClick={() => setPage('clock')}>{activeWork ? 'Ouvrir la pointeuse' : 'Prendre mon service'}</button></section>
  </>;
}

function ClockPage({data, setData, now}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>;now:number}) {
  const activeWork = data.work.find(s => !s.end);
  const activeDriving = data.driving.find(s => !s.end);
  const [vehicle, setVehicle] = useState('');
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [fuelKm, setFuelKm] = useState('');
  const [litres, setLitres] = useState('');
  const [showFuel, setShowFuel] = useState(false);
  const [message, setMessage] = useState('');

  const totals = computePeriod(data, now, 'day');
  const startWork = () => setData(d => ({...d, work:[{id:createId(),start:new Date().toISOString()},...d.work]}));
  const stopWork = () => {
    if (!activeWork) return;
    if (activeDriving) return setMessage('Terminez d’abord la session de conduite.');
    setData(d => ({...d, work:d.work.map(s => s.id === activeWork.id ? {...s,end:new Date().toISOString()} : s)}));
  };
  const startDriving = () => {
    if (!activeWork) return setMessage('Prenez d’abord votre service.');
    const km = Number(startKm);
    if (!vehicle || !Number.isFinite(km)) return setMessage('Choisissez un véhicule et indiquez le kilométrage.');
    setData(d => ({...d, driving:[{id:createId(),workSessionId:activeWork.id,vehicle,start:new Date().toISOString(),startKm:km},...d.driving]}));
    setMessage('');
  };
  const stopDriving = () => {
    if (!activeDriving) return;
    const km = Number(endKm);
    if (!Number.isFinite(km) || km < activeDriving.startKm) return setMessage('Kilométrage d’arrivée invalide.');
    setData(d => ({...d, driving:d.driving.map(s => s.id === activeDriving.id ? {...s,end:new Date().toISOString(),endKm:km} : s)}));
    setVehicle('');setStartKm('');setEndKm('');setShowFuel(false);
  };
  const addFuel = () => {
    if (!activeDriving) return;
    const km = Number(fuelKm), l = Number(litres);
    if (!Number.isFinite(km) || !Number.isFinite(l) || l <= 0) return setMessage('Relevé de carburant invalide.');
    setData(d => ({...d, fuel:[{id:createId(),drivingSessionId:activeDriving.id,vehicle:activeDriving.vehicle,date:new Date().toISOString(),km,litres:l},...d.fuel]}));
    setFuelKm('');setLitres('');setShowFuel(false);setMessage('Plein enregistré.');
  };

  return <>
    <PageHeader title="Ma pointeuse" subtitle="Temps de travail, conduite et kilométrages" />
    <section className="summary-grid">
      <SummaryCard dark title="Temps de service aujourd’hui" value={formatDuration(totals.workMs)} subtitle={activeWork ? 'Session en cours' : 'Hors service'} />
      <SummaryCard title="Conduite aujourd’hui" value={formatDuration(totals.drivingMs)} subtitle={activeDriving ? activeDriving.vehicle : 'Aucune conduite en cours'} />
      <SummaryCard title="Distance aujourd’hui" value={`${totals.km} km`} subtitle="Kilométrages terminés" />
      <SummaryCard title="Conduite / service" value={`${totals.workMs ? Math.round(totals.drivingMs / totals.workMs * 100) : 0}%`} subtitle="Part de conduite" />
    </section>
    {message && <div className="alert">{message}</div>}
    <section className="panel clock-panel">
      <div className="panel-heading"><div><span className="kicker">Activité du jour</span><h2>Pointeuse personnelle</h2><p className="muted">Temps de présence, conduite, kilomètres et carburant.</p></div><span className={`status-pill ${activeWork ? 'on' : ''}`}>{activeWork ? '● En service' : 'Hors service'}</span></div>
      {!activeWork ? <button className="primary wide" onClick={startWork}><Play size={18}/>Prendre mon service</button> : <>
        {!activeDriving ? <div className="form-row"><Field label="Véhicule"><select value={vehicle} onChange={e=>setVehicle(e.target.value)}><option value="">Choisir un véhicule</option>{data.settings.vehicles.map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Kilométrage de départ"><input type="number" value={startKm} onChange={e=>setStartKm(e.target.value)} placeholder="Ex. 471448"/></Field><button className="primary align-end" onClick={startDriving}><CarFront size={18}/>Démarrer la conduite</button></div> : <>
          <div className="active-drive"><div><span>Véhicule en conduite</span><strong>{activeDriving.vehicle}</strong><small>Départ : {activeDriving.startKm.toLocaleString('fr-FR')} km · {formatDuration(now - new Date(activeDriving.start).getTime())}</small></div><Field label="Kilométrage d’arrivée"><input type="number" value={endKm} onChange={e=>setEndKm(e.target.value)} /></Field><button className="danger align-end" onClick={stopDriving}><Square size={18}/>Terminer</button></div>
          <button className="outline-button" onClick={()=>setShowFuel(!showFuel)}><Fuel size={18}/>Enregistrer un plein</button>
          {showFuel && <div className="form-row fuel-form"><Field label="Kilométrage"><input type="number" value={fuelKm} onChange={e=>setFuelKm(e.target.value)}/></Field><Field label="Litres"><input type="number" step="0.01" value={litres} onChange={e=>setLitres(e.target.value)}/></Field><button className="primary align-end" onClick={addFuel}><Plus size={18}/>Ajouter</button></div>}
        </>}
        <button className="outline-button wide top-gap" onClick={stopWork}><Square size={18}/>Quitter mon service</button>
      </>}
    </section>
    <SessionsEditor data={data} setData={setData}/>
    <DeclaredHoursPanel data={data} setData={setData}/>
    <DaysOffPanel data={data} setData={setData}/>
    <FuelPanel data={data} setData={setData}/>
  </>;
}

function SessionsEditor({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const [editWork,setEditWork]=useState<WorkSession|null>(null);
  const [editDrive,setEditDrive]=useState<DrivingSession|null>(null);
  const updateWork=(s:WorkSession)=>setData(d=>({...d,work:d.work.map(x=>x.id===s.id?s:x)}));
  const updateDrive=(s:DrivingSession)=>setData(d=>({...d,driving:d.driving.map(x=>x.id===s.id?s:x)}));
  return <section className="panel"><h2>Historique et corrections</h2><div className="tabs-title">Sessions de travail</div>{data.work.length===0?<p className="muted">Aucune session.</p>:data.work.map(s=><div className="list-row" key={s.id}><div><strong>{formatDateTime(s.start)}</strong><small>{s.end?`Fin : ${formatDateTime(s.end)}`:'En cours'}</small></div><RowActions onEdit={()=>setEditWork({...s})} onDelete={()=>setData(d=>({...d,work:d.work.filter(x=>x.id!==s.id),driving:d.driving.filter(x=>x.workSessionId!==s.id)}))}/></div>)}
  <div className="tabs-title">Sessions de conduite</div>{data.driving.length===0?<p className="muted">Aucune conduite.</p>:data.driving.map(s=><div className="list-row" key={s.id}><div><strong>{s.vehicle} · {formatDateTime(s.start)}</strong><small>{s.endKm!==undefined?`${s.startKm} → ${s.endKm} km`:`Départ ${s.startKm} km · en cours`}</small></div><RowActions onEdit={()=>setEditDrive({...s})} onDelete={()=>setData(d=>({...d,driving:d.driving.filter(x=>x.id!==s.id),fuel:d.fuel.filter(x=>x.drivingSessionId!==s.id)}))}/></div>)}
  {editWork&&<EditDialog title="Modifier la session de travail" onClose={()=>setEditWork(null)} onSave={()=>{updateWork(editWork);setEditWork(null)}}><Field label="Début"><input type="datetime-local" value={toLocalInput(editWork.start)} onChange={e=>setEditWork({...editWork,start:new Date(e.target.value).toISOString()})}/></Field><Field label="Fin"><input type="datetime-local" value={editWork.end?toLocalInput(editWork.end):''} onChange={e=>setEditWork({...editWork,end:e.target.value?new Date(e.target.value).toISOString():undefined})}/></Field></EditDialog>}
  {editDrive&&<EditDialog title="Modifier la conduite" onClose={()=>setEditDrive(null)} onSave={()=>{updateDrive(editDrive);setEditDrive(null)}}><Field label="Véhicule"><input value={editDrive.vehicle} onChange={e=>setEditDrive({...editDrive,vehicle:e.target.value})}/></Field><Field label="Début"><input type="datetime-local" value={toLocalInput(editDrive.start)} onChange={e=>setEditDrive({...editDrive,start:new Date(e.target.value).toISOString()})}/></Field><Field label="Fin"><input type="datetime-local" value={editDrive.end?toLocalInput(editDrive.end):''} onChange={e=>setEditDrive({...editDrive,end:e.target.value?new Date(e.target.value).toISOString():undefined})}/></Field><Field label="Km départ"><input type="number" value={editDrive.startKm} onChange={e=>setEditDrive({...editDrive,startKm:Number(e.target.value)})}/></Field><Field label="Km arrivée"><input type="number" value={editDrive.endKm??''} onChange={e=>setEditDrive({...editDrive,endKm:e.target.value?Number(e.target.value):undefined})}/></Field></EditDialog>}
  </section>;
}

function DeclaredHoursPanel({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const [date,setDate]=useState(localDateValue()); const [ms,setMs]=useState('06:30'); const [me,setMe]=useState('10:30'); const [as,setAs]=useState('14:30'); const [ae,setAe]=useState('18:00'); const [note,setNote]=useState('');
  const total=timeRangeMinutes(ms,me)+timeRangeMinutes(as,ae);
  const save=()=>setData(d=>({...d,declared:[{id:d.declared.find(x=>x.date===date)?.id??createId(),date,morningStart:ms,morningEnd:me,afternoonStart:as,afternoonEnd:ae,note},...d.declared.filter(x=>x.date!==date)]}));
  return <section className="panel"><div className="panel-title"><Clock3/><h2>Horaires déclarés</h2></div><div className="declared-form"><Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><div className="range-box"><strong>Matin</strong><Field label="Début"><input type="time" value={ms} onChange={e=>setMs(e.target.value)}/></Field><Field label="Fin"><input type="time" value={me} onChange={e=>setMe(e.target.value)}/></Field></div><div className="range-box"><strong>Après-midi / soirée</strong><Field label="Début"><input type="time" value={as} onChange={e=>setAs(e.target.value)}/></Field><Field label="Fin"><input type="time" value={ae} onChange={e=>setAe(e.target.value)}/></Field></div><Field label="Note facultative"><input value={note} onChange={e=>setNote(e.target.value)}/></Field><div className="save-line"><strong>Total : {formatMinutes(total).replace('+','')}</strong><button className="primary" onClick={save}><Save size={18}/>Enregistrer</button></div></div><div className="compact-list">{data.declared.slice(0,10).map(x=><div className="list-row" key={x.id}><div><strong>{x.date} · {formatMinutes(timeRangeMinutes(x.morningStart,x.morningEnd)+timeRangeMinutes(x.afternoonStart,x.afternoonEnd)).replace('+','')}</strong><small>{x.morningStart}–{x.morningEnd} · {x.afternoonStart}–{x.afternoonEnd}</small></div><RowActions onEdit={()=>{setDate(x.date);setMs(x.morningStart);setMe(x.morningEnd);setAs(x.afternoonStart);setAe(x.afternoonEnd);setNote(x.note)}} onDelete={()=>setData(d=>({...d,declared:d.declared.filter(v=>v.id!==x.id)}))}/></div>)}</div></section>;
}

function DaysOffPanel({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const [date,setDate]=useState(localDateValue()); const [type,setType]=useState<DayOff['type']>('public-holiday'); const [label,setLabel]=useState('');
  const add=()=>setData(d=>({...d,daysOff:[{id:createId(),date,type,label},...d.daysOff]}));
  return <section className="panel"><div className="panel-title"><CalendarDays/><h2>Jours non travaillés</h2></div><p className="muted">Les jours fériés et congés payés neutralisent les heures attendues.</p><div className="form-row"><Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="Type"><select value={type} onChange={e=>setType(e.target.value as DayOff['type'])}><option value="public-holiday">Jour férié</option><option value="paid-leave">Congé payé</option></select></Field><Field label="Libellé"><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Ex. Lundi de Pâques"/></Field><button className="primary align-end" onClick={add}><Plus size={18}/>Ajouter</button></div>{data.daysOff.map(x=><div className="list-row" key={x.id}><div><strong>{x.date} · {x.type==='public-holiday'?'Jour férié':'Congé payé'}</strong><small>{x.label||'Sans libellé'}</small></div><button className="icon-button danger-text" onClick={()=>setData(d=>({...d,daysOff:d.daysOff.filter(v=>v.id!==x.id)}))}><Trash2 size={18}/></button></div>)}</section>;
}

function FuelPanel({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const [edit,setEdit]=useState<FuelEntry|null>(null);
  return <section className="panel"><div className="panel-title"><Fuel/><h2>Pleins de carburant</h2></div>{data.fuel.length===0?<p className="muted">Aucun plein enregistré.</p>:data.fuel.map(f=><div className="fuel-row" key={f.id}><span>{formatDateTime(f.date)}</span><strong>{f.vehicle}</strong><span>{f.km.toLocaleString('fr-FR')} km</span><span>{f.litres.toFixed(2)} L</span><RowActions onEdit={()=>setEdit({...f})} onDelete={()=>setData(d=>({...d,fuel:d.fuel.filter(x=>x.id!==f.id)}))}/></div>)}{edit&&<EditDialog title="Modifier le plein" onClose={()=>setEdit(null)} onSave={()=>{setData(d=>({...d,fuel:d.fuel.map(x=>x.id===edit.id?edit:x)}));setEdit(null)}}><Field label="Date"><input type="datetime-local" value={toLocalInput(edit.date)} onChange={e=>setEdit({...edit,date:new Date(e.target.value).toISOString()})}/></Field><Field label="Véhicule"><input value={edit.vehicle} onChange={e=>setEdit({...edit,vehicle:e.target.value})}/></Field><Field label="Kilométrage"><input type="number" value={edit.km} onChange={e=>setEdit({...edit,km:Number(e.target.value)})}/></Field><Field label="Litres"><input type="number" step="0.01" value={edit.litres} onChange={e=>setEdit({...edit,litres:Number(e.target.value)})}/></Field></EditDialog>}</section>;
}

function StatisticsPage({data,now}:{data:AppData;now:number}) {
  const periods:[string,'day'|'week'|'month'|'year'][]=[['Aujourd’hui','day'],['Cette semaine','week'],['Ce mois','month'],['Cette année','year']];
  return <><PageHeader title="Statistiques" subtitle="Temps de travail, conduite, kilomètres et progression"/><section className="stats-grid">{periods.map(([label,key])=>{const t=computePeriod(data,now,key);const due=dueForPeriod(data,key,now);const pct=due?Math.min(100,Math.round(t.workMs/60000/due*100)):0;return <article className="stat-card" key={key}><span>{label}</span><div className="big-line"><strong>{formatMinutes(t.workMs/60000).replace('+','')}</strong><small>/ {formatMinutes(due).replace('+','')} attendues</small></div><div className="progress"><i style={{width:`${pct}%`}}/></div><div className={t.workMs/60000-due>=0?'positive':'negative'}>{formatMinutes(t.workMs/60000-due)} vs attendu</div><div className="stat-bottom"><div><span>Conduite</span><strong>{formatMinutes(t.drivingMs/60000).replace('+','')}</strong></div><div><span>Kilomètres</span><strong>{t.km} km</strong></div></div></article>})}</section><DailyTotals data={data} now={now}/></>;
}

function DailyTotals({data,now}:{data:AppData;now:number}) {
  const days=Array.from({length:14},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-i);return d;});
  return <section className="panel"><h2>Totaux quotidiens</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Service</th><th>Conduite</th><th>Conduite %</th><th>Km</th></tr></thead><tbody>{days.map(d=>{const t=computeDay(data,d,now);return <tr key={d.toISOString()}><td>{d.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'short'})}</td><td>{formatMinutes(t.workMs/60000).replace('+','')}</td><td>{formatMinutes(t.drivingMs/60000).replace('+','')}</td><td>{t.workMs?Math.round(t.drivingMs/t.workMs*100):0}%</td><td>{t.km}</td></tr>})}</tbody></table></div></section>;
}

function SettingsPage({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const [draft,setDraft]=useState<Settings>(structuredClone(data.settings)); const [saved,setSaved]=useState(false);
  const save=()=>{setData(d=>({...d,settings:draft}));setSaved(true);setTimeout(()=>setSaved(false),2000)};
  const notionFields:[keyof Settings['notion'],string][]=[['vehicles','Base Véhicules'],['workSessions','Sessions de travail'],['drivingSessions','Sessions de conduite'],['fuelEntries','Pleins de carburant'],['declaredHours','Horaires déclarés'],['daysOff','Jours non travaillés'],['servicesLMJV','Services LMJV période scolaire'],['servicesWednesday','Services mercredi période scolaire'],['servicesSaturdayVacation','Services samedi + vacances'],['schoolVacations','Périodes de vacances scolaires']];
  return <><PageHeader title="Paramètres" subtitle="Soldes initiaux, véhicules et liens Notion"/><section className="panel"><h2>Soldes de départ</h2><div className="form-grid"><Field label="Compteur d’heures actuel (minutes)"><input type="number" value={draft.overtimeStartingMinutes} onChange={e=>setDraft({...draft,overtimeStartingMinutes:Number(e.target.value)})}/><small>Ex. 690 pour +11h30</small></Field><Field label="Congés payés N-1"><input type="number" step="0.5" value={draft.paidLeaveN1} onChange={e=>setDraft({...draft,paidLeaveN1:Number(e.target.value)})}/></Field><Field label="Congés payés N"><input type="number" step="0.5" value={draft.paidLeaveN} onChange={e=>setDraft({...draft,paidLeaveN:Number(e.target.value)})}/></Field></div></section><section className="panel"><h2>Objectifs de travail</h2><div className="form-grid"><Field label="Jour (minutes)"><input type="number" value={draft.dailyTargetMinutes} onChange={e=>setDraft({...draft,dailyTargetMinutes:Number(e.target.value)})}/></Field><Field label="Semaine (minutes)"><input type="number" value={draft.weeklyTargetMinutes} onChange={e=>setDraft({...draft,weeklyTargetMinutes:Number(e.target.value)})}/></Field><Field label="Mois (minutes)"><input type="number" value={draft.monthlyTargetMinutes} onChange={e=>setDraft({...draft,monthlyTargetMinutes:Number(e.target.value)})}/></Field><Field label="Année (minutes)"><input type="number" value={draft.yearlyTargetMinutes} onChange={e=>setDraft({...draft,yearlyTargetMinutes:Number(e.target.value)})}/></Field></div></section><section className="panel"><h2>Véhicules</h2><p className="muted">Un véhicule par ligne. Cette liste sera remplacée plus tard par la base Notion.</p><textarea rows={9} value={draft.vehicles.join('\n')} onChange={e=>setDraft({...draft,vehicles:e.target.value.split('\n').map(v=>v.trim()).filter(Boolean)})}/></section><section className="panel"><h2>Liens des bases Notion</h2><div className="notice"><strong>Mode V1 :</strong> les liens sont enregistrés et ouvrables depuis l’application. Une synchronisation réelle nécessitera plus tard un Worker Cloudflare sécurisé et un jeton Notion.</div><div className="notion-grid">{notionFields.map(([key,label])=><Field key={key} label={label}><div className="link-input"><input value={draft.notion[key]} onChange={e=>setDraft({...draft,notion:{...draft.notion,[key]:e.target.value}})} placeholder="https://www.notion.so/..."/>{draft.notion[key]&&<a className="outline-button small" href={draft.notion[key]} target="_blank" rel="noreferrer">Ouvrir</a>}</div></Field>)}</div></section><div className="settings-actions"><button className="primary" onClick={save}><Save size={18}/>{saved?'Enregistré':'Enregistrer les paramètres'}</button><button className="danger" onClick={()=>{if(confirm('Effacer toutes les données locales ?')){storage.clearAll();location.reload()}}}><Trash2 size={18}/>Réinitialiser</button></div></>;
}

function PageHeader({title,subtitle}:{title:string;subtitle:string}) {return <header className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div><span className="local-badge">Fonctionnement local</span></header>}
function SummaryCard({title,value,subtitle,dark=false}:{title:string;value:string;subtitle:string;dark?:boolean}) {return <article className={`summary-card ${dark?'dark':''}`}><span>{title}</span><strong>{value}</strong><small>{subtitle}</small></article>}
function Field({label,children}:{label:string;children:React.ReactNode}) {return <label className="field"><span>{label}</span>{children}</label>}
function RowActions({onEdit,onDelete}:{onEdit:()=>void;onDelete:()=>void}) {return <div className="row-actions"><button className="icon-button" onClick={onEdit}><Pencil size={17}/></button><button className="icon-button danger-text" onClick={onDelete}><Trash2 size={17}/></button></div>}
function EditDialog({title,children,onClose,onSave}:{title:string;children:React.ReactNode;onClose:()=>void;onSave:()=>void}) {return <div className="modal-backdrop"><div className="modal"><h2>{title}</h2><div className="modal-fields">{children}</div><div className="modal-actions"><button className="outline-button" onClick={onClose}>Annuler</button><button className="primary" onClick={onSave}><Save size={18}/>Enregistrer</button></div></div></div>}

function toLocalInput(iso:string){const d=new Date(iso);const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)}
function sessionMs(start:string,end:string|undefined,now:number){return Math.max(0,(end?new Date(end).getTime():now)-new Date(start).getTime())}
function computeDay(data:AppData,date:Date,now:number){const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setHours(23,59,59,999);return computeRange(data,start,end,now)}
function computeRange(data:AppData,start:Date,end:Date,now:number){const workMs=data.work.filter(x=>inRange(x.start,start,end)).reduce((a,x)=>a+sessionMs(x.start,x.end,now),0);const drivingMs=data.driving.filter(x=>inRange(x.start,start,end)).reduce((a,x)=>a+sessionMs(x.start,x.end,now),0);const km=data.driving.filter(x=>inRange(x.start,start,end)&&x.endKm!==undefined).reduce((a,x)=>a+Math.max(0,(x.endKm??0)-x.startKm),0);return{workMs,drivingMs,km}}
function computePeriod(data:AppData,now:number,period:'day'|'week'|'month'|'year'){const d=new Date(now);let start:Date,end=new Date(d);end.setHours(23,59,59,999);if(period==='day'){start=new Date(d);start.setHours(0,0,0,0)}else if(period==='week'){start=startOfWeek(d)}else if(period==='month'){start=new Date(d.getFullYear(),d.getMonth(),1)}else{start=new Date(d.getFullYear(),0,1)}return computeRange(data,start,end,now)}
function dueForPeriod(data:AppData,period:'day'|'week'|'month'|'year',now:number){if(period==='day'){const today=localDateValue(new Date(now));return data.daysOff.some(x=>x.date===today)?0:data.settings.dailyTargetMinutes}if(period==='week')return data.settings.weeklyTargetMinutes;if(period==='month')return data.settings.monthlyTargetMinutes;return data.settings.yearlyTargetMinutes}
function computeOvertime(data:AppData,now:number){const year=computePeriod(data,now,'year').workMs/60000;const elapsedDue=calculateElapsedYearDue(data,now);return data.settings.overtimeStartingMinutes+year-elapsedDue}
function calculateElapsedYearDue(data:AppData,now:number){const d=new Date(now);let total=0;for(let day=new Date(d.getFullYear(),0,1);day<=d;day.setDate(day.getDate()+1)){const weekday=day.getDay();if(weekday>=1&&weekday<=5&&!data.daysOff.some(x=>x.date===localDateValue(day)))total+=data.settings.dailyTargetMinutes}return total}
