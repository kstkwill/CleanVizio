'use strict';
const https=require('https');
const cache=new Map();
function json(url,ttl){
 const old=cache.get(url);if(old&&Date.now()-old.at<ttl)return old.promise;
 const promise=new Promise((resolve,reject)=>{
  const req=https.get(url,{headers:{Accept:'application/json'},timeout:10000},res=>{
   if(res.statusCode!==200){res.resume();reject(Error('HTTP '+res.statusCode));return;}
   let body='';res.setEncoding('utf8');res.on('data',c=>{body+=c;if(body.length>6000000)req.destroy(Error('Response too large'));});
   res.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});
  });req.on('timeout',()=>req.destroy(Error('Timed out')));req.on('error',reject);
 });cache.set(url,{at:Date.now(),promise});return promise;
}
const feeds=[
 ['Hawks','NBA','basketball/nba/teams/atl'],
 ['Falcons','NFL','football/nfl/teams/atl'],['Braves','MLB','baseball/mlb/teams/atl'],
 ['Manchester United','Soccer','soccer/all/teams/360'],['Brighton & Hove Albion','Soccer','soccer/all/teams/331'],['AFC Wimbledon','Soccer','soccer/all/teams/3802'],
 ['Clemson','Football','football/college-football/teams/228'],['Clemson','Men’s basketball','basketball/mens-college-basketball/teams/228'],['Clemson','Women’s basketball','basketball/womens-college-basketball/teams/228'],
 ['Clemson','Baseball','baseball/college-baseball/teams/228'],['Clemson','Softball','softball/college-softball/teams/228'],['Clemson','Men’s soccer','soccer/usa.ncaa.1/teams/228']
];
let sportsCache=null;
function sports(){
 if(sportsCache&&Date.now()-sportsCache.at<60000)return sportsCache.promise;
 const promise=(async()=>{const events=[],failed=[];let next=0,successful=0;
  async function worker(){while(next<feeds.length){const [group,sport,path]=feeds[next++];
   const urls=[path+'/schedule'];if(path.startsWith('soccer/all'))urls.push(path+'/schedule?fixture=true');
   for(const endpoint of urls){try{
    const j=await json('https://site.api.espn.com/apis/site/v2/sports/'+endpoint,endpoint.includes('fixture')?300000:60000);
    if(!Array.isArray(j.events)||!j.team||(group==='Clemson'&&!/clemson/i.test(j.team.displayName)))throw Error('Unavailable');successful++;
    for(const e of j.events){const c=e.competitions?.[0],s=c?.status?.type||e.status?.type;if(!s||!c?.competitors||!Number.isFinite(Date.parse(e.date)))continue;
     events.push({id:e.id,group,sport,date:e.date,state:s.state,detail:s.shortDetail||s.description||'',names:c.competitors.map(p=>p.team?.shortDisplayName||p.team?.displayName||'Team'),scores:c.competitors.map(p=>typeof p.score==='object'?String(p.score?.displayValue??p.score?.value??'—'):String(p.score??'—'))});
    }
   }catch(e){failed.push(group+' · '+sport+(endpoint.includes('fixture')?' fixtures':''));}}
  }}
  await Promise.all([worker(),worker(),worker(),worker()]);return {events:Array.from(new Map(events.map(e=>[e.id,e])).values()),failed,successful,updated:new Date().toISOString()};
 })();sportsCache={at:Date.now(),promise};return promise;
}
async function weather(){
 const j=await json('https://api.open-meteo.com/v1/forecast?latitude=34.6834&longitude=-82.8374&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=1',600000);
 const c=j.current,d=j.daily;if(![c?.temperature_2m,c?.apparent_temperature,c?.weather_code,d?.temperature_2m_max?.[0],d?.temperature_2m_min?.[0]].every(Number.isFinite))throw Error('Weather unavailable');
 return {temp:Math.round(c.temperature_2m),feels:Math.round(c.apparent_temperature),code:c.weather_code,high:Math.round(d.temperature_2m_max[0]),low:Math.round(d.temperature_2m_min[0])};
}
module.exports={sports,weather};
