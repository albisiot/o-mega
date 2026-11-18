// The opening screen's subtitle: a different line of the world at every opening (SPEC §11.3).
//
// The splash is in the static HTML and plays before React, so the line is chosen by
// SPLASH_LINE_SCRIPT, inline in the root layout's <head>, before the first paint. Every line is
// in the HTML (app-splash.tsx); the script adds a style rule that shows the chosen one and keeps
// its index on the device for the next opening. React never sees the choice, so the hydrated
// splash matches the static HTML and its animation goes on undisturbed.

import { WORLD_SPLASH_LINES } from "@/config/world";

export const SPLASH_LINE_KEY = "o-mega.splash-line";

/**
 * The line to show out of `count`, given the stored index of the last one shown (`previous`)
 * and a random number in [0, 1): any line but the last one; any line at all when there is no
 * valid last one. Same rule as SPLASH_LINE_SCRIPT: keep the two in step.
 */
export function nextSplashLine(previous: string | null, count: number, random: number): number {
  if (count < 2) return 0;
  const last = previous === null || previous === "" ? NaN : Number(previous);
  if (!Number.isInteger(last) || last < 0 || last >= count) {
    return Math.min(count - 1, Math.floor(random * count));
  }
  const pick = Math.min(count - 2, Math.floor(random * (count - 1)));
  return pick >= last ? pick + 1 : pick;
}

/**
 * Runs while the page's HTML loads. Skipped on the return from Google (/auth/), which shows no
 * splash. Without storage it still shows a random line. Same rule as nextSplashLine().
 */
export const SPLASH_LINE_SCRIPT = `(function(){
if(location.pathname.indexOf("/auth/")>=0)return;
var key=${JSON.stringify(SPLASH_LINE_KEY)},count=${WORLD_SPLASH_LINES.length},last=null,pick=0;
try{last=localStorage.getItem(key)}catch(e){}
var n=last===null||last===""?NaN:Number(last);
if(count>1){
if(n!==Math.floor(n)||n<0||n>=count)pick=Math.min(count-1,Math.floor(Math.random()*count));
else{pick=Math.min(count-2,Math.floor(Math.random()*(count-1)));if(pick>=n)pick++}
}
try{localStorage.setItem(key,String(pick))}catch(e){}
var style=document.createElement("style");
style.textContent=".splash-lines>.splash-line{display:none}.splash-lines>.splash-line:nth-child("+(pick+1)+"){display:inline}";
document.head.appendChild(style);
})();`;
