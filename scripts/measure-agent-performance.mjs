// Repeatable local lab comparison of the built site. No production analytics or runtime is needed.
// Usage: node scripts/measure-agent-performance.mjs /absolute/path/report.json
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import puppeteer from 'puppeteer-core';

const output = process.argv[2];
if (!output) throw Error('Usage: node scripts/measure-agent-performance.mjs /absolute/path/report.json');
const dist = resolve('dist');
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!executablePath) throw Error('Chrome is required for this local lab measurement');
const types = { '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.webp':'image/webp', '.png':'image/png', '.md':'text/markdown', '.txt':'text/plain' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(dist, '.' + path);
    if (!file.startsWith(dist + '/') && file !== dist) throw Error('Invalid path');
    if ((await stat(file)).isDirectory()) file += '/index.html';
    const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (file.endsWith('.html') && existsSync(file+'.br') && request.headers['accept-encoding']?.includes('br')) {
      headers['Content-Encoding'] = 'br'; file += '.br';
    }
    response.writeHead(200, headers); response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const cases = [
  { name:'home-human-desktop', path:'/', audience:'humans', width:1440, height:1000 },
  { name:'home-human-mobile', path:'/', audience:'humans', width:390, height:844 },
  { name:'home-agent-desktop', path:'/', audience:'agents', width:1440, height:1000 },
  { name:'home-agent-mobile', path:'/', audience:'agents', width:390, height:844 },
  { name:'docs-agent-desktop', path:'/docs/', audience:'agents', width:1440, height:1000 },
  { name:'services-agent-mobile', path:'/services/', audience:'agents', width:390, height:844 },
];
const results = [];
const browser = await puppeteer.launch({ executablePath, headless:true });
try {
  for (const scenario of cases.filter(item => !process.env.PERFORMANCE_CASE || item.name === process.env.PERFORMANCE_CASE)) {
    const runs=[];
    for (let index=0; index<3; index++) {
      const context=await browser.createBrowserContext(), page=await context.newPage();
      await page.setViewport({width:scenario.width,height:scenario.height});
      await page.setExtraHTTPHeaders({'Sec-GPC':'1'});
      const client=await page.createCDPSession();
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1_600_000/8,uploadThroughput:750_000/8,connectionType:'cellular4g'});
      await client.send('Emulation.setCPUThrottlingRate',{rate:4});
      await client.send('Performance.enable');
      await page.evaluateOnNewDocument(()=>{
        const value=window.__agentLab={lcp:0,cls:0,longTasks:[],events:[]};
        new PerformanceObserver(list=>{for(const entry of list.getEntries())value.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)value.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(list=>{for(const entry of list.getEntries())value.longTasks.push(entry.duration);}).observe({type:'longtask',buffered:true});
        new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.interactionId)value.events.push(entry.duration);}).observe({type:'event',durationThreshold:16,buffered:true});
      });
      const failures=[];
      page.on('pageerror',error=>failures.push(error.message));
      page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${new URL(response.url()).pathname}`);});
      await page.goto(`${origin}${scenario.path}?audience=${scenario.audience}`,{waitUntil:'load',timeout:60000});
      await page.waitForFunction(()=>document.documentElement.dataset.siteView!=='desktop'||document.documentElement.classList.contains('desktop-ready'),{timeout:15000});
      await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,1100)));
      const loading=await page.evaluate(()=>{
        const lab=window.__agentLab;
        return {lcpMs:lab.lcp,cls:lab.cls,loadLongTasks:lab.longTasks.length,loadBlockingMs:lab.longTasks.reduce((sum,duration)=>sum+Math.max(0,duration-50),0),resourceBodyBytes:performance.getEntriesByType('resource').reduce((sum,entry)=>sum+entry.encodedBodySize,0),htmlBodyBytes:performance.getEntriesByType('navigation')[0].encodedBodySize,requests:performance.getEntriesByType('resource').length,fonts:performance.getEntriesByType('resource').filter(entry=>entry.name.endsWith('.woff2')).map(entry=>new URL(entry.name).pathname)};
      });
      // A real audience switch exercises the most expensive shared theme interaction.
      await page.click('#lc-audience-switch');
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.click('#lc-audience-switch');
      await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,150)));
      const interaction=await page.evaluate(()=>({interactionMaxMs:Math.max(0,...window.__agentLab.events),overflow:document.documentElement.scrollWidth>innerWidth}));
      const metrics=Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(item=>[item.name,item.value]));
      runs.push({...loading,...interaction,layoutMs:metrics.LayoutDuration*1000,scriptMs:metrics.ScriptDuration*1000,failures});
      await context.close();
    }
    const median=key=>runs.map(run=>run[key]).sort((a,b)=>a-b)[1];
    const result={name:scenario.name,median:Object.fromEntries(['lcpMs','cls','loadBlockingMs','interactionMaxMs','resourceBodyBytes','htmlBodyBytes','requests','layoutMs','scriptMs'].map(key=>[key,Math.round(median(key)*100)/100])),runs};
    results.push(result);console.log(JSON.stringify({case:scenario.name,...result.median}));
  }
  await writeFile(output,JSON.stringify({recordedAt:new Date().toISOString(),profile:{network:'1.6 Mbps down / 750 Kbps up / 150 ms latency',cpuSlowdown:4,runsPerCase:3,analytics:'disabled using Sec-GPC; localhost preview',limits:'Local lab measurements, not field INP or live deployment qualification. interactionMaxMs=0 means no interaction event met the 16ms reporting threshold.'},results},null,2)+'\n');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
