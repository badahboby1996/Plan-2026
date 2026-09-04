/* ТРЕНИРОВЪЧЕН ДВИГАТЕЛ · дати, седмици, предписание и дневник.
   Всичко работи по локална дата YYYY-MM-DD в Europe/Sofia, не по UTC.
   Историята се пази по конкретна дата и не се презаписва при бъдещи редакции на плана. */

const TRAIN_TZ = trainingPlan.timeZone || 'Europe/Sofia';
const TRAIN_LOG_KEY = 'hustle-train-log-v1';
const TRAIN_LEGACY_FLAG = 'hustle-train-legacy-imported-v1';
const LEGACY_PLAN_START = '2026-08-02';
const LEGACY_PLAN_VERSION = 'legacy-8w-2026-08-02';

const sofiaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TRAIN_TZ, year: 'numeric', month: '2-digit', day: '2-digit'
});

/* --- дати --- */
function sofiaToday(){ return sofiaFormatter.format(new Date()) }
function localISO(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function isoToUTC(iso){ const [y,m,d]=iso.split('-').map(Number); return Date.UTC(y,m-1,d) }
function daysBetween(fromISO,toISO){ return Math.round((isoToUTC(toISO)-isoToUTC(fromISO))/86400000) }
function dayKeyOf(iso){ return dayKeys[new Date(isoToUTC(iso)).getUTCDay()] }
function sofiaDayKey(){ return dayKeyOf(sofiaToday()) }
function formatDateBG(iso){
  const d=new Date(isoToUTC(iso));
  const months=['януари','февруари','март','април','май','юни','юли','август','септември','октомври','ноември','декември'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/* Седмица 1–8 спрямо избраната дата, а не спрямо днешния ден. */
function planPhaseFor(iso){
  const diff = daysBetween(trainingPlan.start, iso);
  if(diff < 0) return {phase:'before', week:0, dayOfCycle:diff};
  const week = Math.floor(diff/7)+1;
  if(week > trainingPlan.weeksTotal) return {phase:'after', week:trainingPlan.weeksTotal, dayOfCycle:diff};
  return {phase:'active', week, dayOfCycle:diff};
}
/* За дати след цикъла показваме последната прогресивна седмица като ориентир. */
function prescriptionWeek(phase){ return phase.phase==='after' ? 7 : phase.week }

/* --- предписание --- */
function sessionFor(dayKey){ return trainingPlan.sessions[dayKey] || null }
function coreSessionFor(dayKey){ return trainingPlan.coreSessions[dayKey] || null }
function libEx(id){ return trainingPlan.library[id] }

function weekRir(item, week){
  if(week >= 8) return '4–5';
  if(Array.isArray(item.rir)){
    const ramp = trainingPlan.rirRamp[item.rir.join('|')];
    return ramp ? ramp[Math.min(week,7)-1] : item.rir[1];
  }
  if(week === 7 && item.failLast) return '1–2 · последната серия до 0–1';
  return item.rir;
}
function weekSets(item, week){
  let sets = item.sets;
  if(week === 5 && item.week5Extra) sets += 1;
  if(week >= 8) sets = Math.max(1, Math.round(sets/2));
  return sets;
}
function prescribe(item, week){
  const ex = libEx(item.ex);
  return {
    id:item.ex, name:ex.name, muscle:ex.muscle, group:ex.group, photo:ex.photo,
    warm:item.warm, sets:weekSets(item,week), reps:item.reps, rir:weekRir(item,week),
    rest:item.rest, restSec:item.restSec, time:item.time, tips:item.tips, alt:item.alt,
    extraSet: week===5 && !!item.week5Extra,
    deload: week>=8
  };
}
function coreRounds(week){ return week>=8 ? 1 : 2 }
function corePrescribe(item, week){
  const ex = libEx(item.ex);
  return {
    id:item.ex, name:ex.name, muscle:ex.muscle, group:ex.group, photo:ex.photo,
    warm:'0', rir:null, alt:null,
    sets:coreRounds(week), reps:item.reps, rest:`${item.rest} сек`, restSec:item.restSec,
    key:item.key, tips:item.tips, deload: week>=8
  };
}
/* Пълен списък от работни серии за деня — основата на снимката (snapshot) и на дневника. */
function daySnapshot(dayKey, week){
  const gym = sessionFor(dayKey), core = coreSessionFor(dayKey), out = [];
  if(gym) gym.blocks.forEach((block,bi)=>block.items.forEach(item=>{
    const p = prescribe(item, week);
    out.push({exId:p.id, name:p.name, block:bi, type:block.type, sets:p.sets, reps:p.reps, rir:p.rir, rest:p.rest, warm:p.warm});
  }));
  if(core) core.items.forEach(item=>{
    const p = corePrescribe(item, week);
    out.push({exId:p.id, name:p.name, block:0, type:'core', sets:p.sets, reps:p.reps, rir:'—', rest:p.rest, warm:'0'});
  });
  return out;
}

/* --- дневник --- */
function loadTrainLog(){
  try{ const raw=JSON.parse(localStorage.getItem(TRAIN_LOG_KEY)); if(raw&&raw.days) return raw }catch(e){}
  return {v:1, days:{}};
}
function saveTrainLog(log){
  try{ localStorage.setItem(TRAIN_LOG_KEY, JSON.stringify(log)) }
  catch(e){ console.error('Тренировъчен дневник:', e) }
}
function trainDay(iso){ return loadTrainLog().days[iso] || null }
/* Първият запис за дата заключва предписанието за нея. Миналото не се променя после. */
function ensureTrainDay(iso, meta){
  const log = loadTrainLog();
  if(!log.days[iso]){
    log.days[iso] = {
      planVersion: meta.planVersion, week: meta.week, sessionKey: meta.sessionKey,
      title: meta.title, snapshot: meta.snapshot, sets: {}, createdAt: new Date().toISOString()
    };
  }
  return log;
}
function setEntryId(exId, setIndex){ return `${exId}#${setIndex}` }
function logSet(iso, meta, exId, setIndex, patch){
  const log = ensureTrainDay(iso, meta);
  const day = log.days[iso], id = setEntryId(exId, setIndex);
  day.sets[id] = Object.assign({}, day.sets[id], patch);
  day.updatedAt = new Date().toISOString();
  saveTrainLog(log);
  return day.sets[id];
}
function getSet(iso, exId, setIndex){
  const day = trainDay(iso);
  return (day && day.sets[setEntryId(exId,setIndex)]) || null;
}
function daySummary(iso, planned){
  const day = trainDay(iso);
  const done = day ? Object.values(day.sets).filter(s=>s && s.done).length : 0;
  return {done, planned, hasLog: !!day, legacy: !!(day && day.legacy)};
}

/* --- еднократен внос на старата история, без да я изтриваме --- */
function importLegacyHistory(){
  if(localStorage.getItem(TRAIN_LEGACY_FLAG) === '1') return;
  const log = loadTrainLog();
  Object.keys(localStorage).forEach(key=>{
    const m = key.match(/^hustle-set-(\d+)-(sun|mon|tue|wed|thu|fri|sat)-([a-z]+)-(\d+)$/);
    if(!m) return;
    if(localStorage.getItem(key) !== '1') return;
    const [,week,day,exId,setIndex] = m;
    const offset = (Number(week)-1)*7 + dayKeys.indexOf(day);
    const iso = localISO(new Date(isoToUTC(LEGACY_PLAN_START) + offset*86400000 + 12*3600000));
    const legacyDay = legacyWorkoutData[day];
    const legacyEx = legacyDay && legacyDay.exercises.find(x=>x.id===exId);
    if(!log.days[iso]){
      log.days[iso] = {
        planVersion: LEGACY_PLAN_VERSION, week: Number(week), sessionKey: day,
        title: legacyDay ? legacyDay.title : 'Тренировка', legacy: true,
        snapshot: legacyDay ? legacyDay.exercises.map(x=>({exId:x.id, name:x.name, sets:x.sets, reps:x.reps, rir:'—', rest:`${x.rest} сек`, warm:'—'})) : [],
        sets: {}, createdAt: new Date().toISOString()
      };
    }
    log.days[iso].sets[setEntryId(exId, Number(setIndex))] = {
      done: true, legacy: true, name: legacyEx ? legacyEx.name : exId
    };
  });
  saveTrainLog(log);
  localStorage.setItem(TRAIN_LEGACY_FLAG, '1');
}

/* Локална дата от ISO низ, без UTC отместване. */
function isoToLocalDate(iso){ const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d,12,0,0,0) }
