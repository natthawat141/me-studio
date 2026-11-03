import {randomBytes} from 'node:crypto';
import {chromium} from 'playwright-core';
import type {PreviewAsset} from './project-workspace.mjs';
import {toolEnvironment} from '../../../scripts/local/tools.mjs';

type PreviewOptions={browser:string;width:number;height:number;timeMs?:number;path:string;assets?:Record<string,PreviewAsset>;signal?:AbortSignal};
/** The model authors declarative HTML/CSS/SVG, never executable JS. Chromium remains isolated from the app. */
export async function prepareHtmlPreview(markup:string,options:PreviewOptions){
 options.signal?.throwIfAborted();
 if(markup.length>48000)throw Error('HTML_TOO_LARGE');
 const browser=await chromium.launch({executablePath:options.browser,headless:true,chromiumSandbox:true,env:toolEnvironment(),timeout:20000});
 const abort=()=>void browser.close().catch(()=>{});options.signal?.addEventListener('abort',abort,{once:true});
 try{
  const context=await browser.newContext({viewport:{width:options.width,height:options.height},deviceScaleFactor:1,serviceWorkers:'block',acceptDownloads:false});
  const assets=options.assets??{};
  let renderedDocument='';const origin='https://preview.me-studio.invalid';
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort('blockedbyclient');if(url.pathname==='/index.html')return route.fulfill({status:200,contentType:'text/html',body:renderedDocument});const asset=assets[url.pathname.slice(1)];return asset?route.fulfill({status:200,contentType:asset.mime,body:asset.bytes}):route.abort('blockedbyclient');});
  const page=await context.newPage();
  // DOMParser creates an inert document. Reject active elements/attributes before putting anything on a page.
  const safe=await page.evaluate(({raw,names})=>{
   const doc=new DOMParser().parseFromString(raw,'text/html');
   const allowed=new Set('html head body title style div span p h1 h2 h3 h4 h5 h6 main section article header footer aside figure figcaption br strong b em i small ul ol li img svg g path rect circle ellipse line polyline polygon text tspan defs lineargradient radialgradient stop clippath mask filter fegaussianblur feoffset feblend fecolormatrix'.split(' '));
   const nodes=Array.from(doc.querySelectorAll('*'));if(nodes.length>2500)throw Error('HTML_NODE_LIMIT');
   for(const el of nodes){
    if(!allowed.has(el.localName.toLowerCase()))throw Error('HTML_ACTIVE_CONTENT');
    for(const a of Array.from(el.attributes)){
     const name=a.name.toLowerCase(),value=a.value.trim();
     if(name.startsWith('on')||['srcdoc','nonce','is','formaction','action'].includes(name))throw Error('HTML_ACTIVE_CONTENT');
     if(['href','xlink:href'].includes(name)&&!/^#[a-zA-Z0-9_-]+$/.test(value))throw Error('HTML_EXTERNAL_RESOURCE');
     if(name==='src'&&!names.includes(value)&&!/^data:image\/(png|jpeg|webp|gif|avif);base64,[a-zA-Z0-9+/=]+$/.test(value))throw Error('HTML_EXTERNAL_RESOURCE');
     if(['srcset','background','poster'].includes(name))throw Error('HTML_EXTERNAL_RESOURCE');
    }
   }
   const css=[...doc.querySelectorAll('style')].map(e=>e.textContent||'').concat(nodes.map(e=>e.getAttribute('style')||'')).join('\n');
   if(/@import|@font-face|expression\s*\(|javascript\s*:|url\s*\(\s*(?!['"]?#[a-zA-Z0-9_-]+['"]?\s*\))/i.test(css))throw Error('HTML_EXTERNAL_RESOURCE');
   return doc.head.innerHTML+doc.body.innerHTML;
  },{raw:markup,names:Object.keys(assets)});
  const nonce=randomBytes(18).toString('base64');
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;width:${options.width}px;height:${options.height}px;overflow:hidden}*{box-sizing:border-box}</style></head><body>${safe}<script nonce="${nonce}">window.seek=async function(ms){for(const a of document.getAnimations()){a.pause();a.currentTime=ms;}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};</script></body></html>`;
  renderedDocument=html;await page.goto(origin+'/index.html',{waitUntil:'load',timeout:10000});
  await page.evaluate(async time=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));await (window as unknown as {seek(ms:number):Promise<void>}).seek(time);},options.timeMs||0);
  options.signal?.throwIfAborted();
  await page.screenshot({path:options.path,type:'png',timeout:10000});
  return html;
 }finally{options.signal?.removeEventListener('abort',abort);await browser.close();}
}
