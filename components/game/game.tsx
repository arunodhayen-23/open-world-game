'use client';
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Flag, Gamepad2, Gauge, RotateCcw, Shield, X } from 'lucide-react';
import { createGame, load, missions, notify, save, startMission, type Input } from '@/lib/game/engine';
import Hud from './hud';
const Scene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="scene-loading"><span />BUILDING YOUR CITY</div> });
class SceneBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <div className="render-error"><h2>The city could not load.</h2><p>Enable hardware acceleration in your browser and try again.</p><button onClick={() => window.location.reload()}>Reload game</button></div> : this.props.children; }
}
export default function Game() {
  const game = useRef(createGame());
  const input = useRef<Input>({ keys: new Set(), pressed: new Set(), fire: false });
  const [, refresh] = useState(0); const [ready, setReady] = useState(false); const [panel, setPanel] = useState<string | null>(null); const [sceneKey, setSceneKey] = useState(0);
  const shell = useRef<HTMLElement>(null); const dialog = useRef<HTMLDivElement>(null);
  const update = useCallback(() => refresh(n => n + 1), []);
  const onReady = useCallback(() => setReady(true), []);
  const clear = useCallback(() => { input.current.keys.clear(); input.current.pressed.clear(); input.current.fire = false; }, []);
  const menu = useCallback((tab: string) => { if (!game.current.started) { setPanel(tab); return; } game.current.playing = false; clear(); setPanel(tab); document.exitPointerLock?.(); }, [clear]);
  const resume = useCallback(() => { game.current.started = true; game.current.playing = true; clear(); setPanel(null); shell.current?.focus(); update(); }, [clear, update]);
  useEffect(() => { load(game.current); update(); }, [update]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.code === 'Escape') { if (!game.current.started || game.current.dead) return; if (game.current.playing) menu('pause'); else resume(); return; }
      if (e.code === 'KeyM' && game.current.started && !game.current.dead) { if (game.current.playing) menu('missions'); else resume(); return; }
      if (!game.current.playing || e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) input.current.pressed.add(e.code); input.current.keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => input.current.keys.delete(e.code);
    const blur = () => { clear(); if (game.current.playing) menu('pause'); };
    const visibility = () => { if (document.hidden) blur(); };
    const look = (e: MouseEvent) => { if (!document.pointerLockElement || !game.current.playing) return; game.current.look += e.movementX * .004; game.current.pitch = Math.max(-.5, Math.min(1.5, game.current.pitch - e.movementY * .006)); };
    let wasLocked = false;
    const lockChange = () => { if (wasLocked && !document.pointerLockElement && game.current.playing) menu('pause'); wasLocked = !!document.pointerLockElement; };
    document.addEventListener('mousemove', look); document.addEventListener('pointerlockchange', lockChange);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('mousemove', look); document.removeEventListener('pointerlockchange', lockChange); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); clear(); };
  }, [clear, menu, resume]);
  useEffect(() => { if (panel || game.current.dead) dialog.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [panel, game.current.dead]);
  const reset = () => { const old = game.current; const fresh = createGame(); fresh.cash = old.cash; fresh.completed = old.completed; fresh.quality = old.quality; fresh.started = true; fresh.playing = true; game.current = fresh; clear(); setPanel(null); shell.current?.focus(); update(); };
  const g = game.current;
  const chooseMission = (id: number) => { startMission(g, id); resume(); };
  return <main ref={shell} className="game-shell" tabIndex={-1} aria-label="Coastline Heat open-world game" onContextMenu={e => e.preventDefault()}>
    <div className="scene-layer" onDoubleClick={async e => { if (!g.playing) return; try { await e.currentTarget.requestPointerLock?.(); } catch { notify(g, 'Mouse capture unavailable. Hold right mouse and drag to look.'); } }} onPointerDown={e => { if (!g.playing) return; shell.current?.focus(); if (e.button === 0) input.current.fire = true; if (e.button === 2) e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={() => { input.current.fire = false; }} onPointerLeave={() => { input.current.fire = false; }} onPointerMove={e => { if (!g.playing || !(e.buttons & 2)) return; g.look += e.movementX * .004; g.pitch = Math.max(-.5, Math.min(1.5, g.pitch - e.movementY * .006)); }}>
      <SceneBoundary><Scene key={sceneKey} game={game} input={input} update={update} ready={onReady} /></SceneBoundary>
    </div>
    <div className="scene-vignette" />
    <Hud g={g} menu={menu} />
    {!g.started && !panel && <section className="welcome"><div className="welcome-kicker"><span />SAN PACIFICO IS CALLING</div><h1>The city is yours<span>.</span></h1><p>Take the wheel. Make your name. Lose the heat.</p><button className="primary-action" disabled={!ready} onClick={resume}>{ready ? 'Enter the city' : 'Loading city…'}<ArrowRight size={18} /></button><div className="welcome-note"><Gamepad2 size={14} />KEYBOARD & MOUSE<span>•</span>SINGLE PLAYER</div></section>}
    {(panel || g.dead) && <div className="menu-backdrop"><div ref={dialog} className="game-menu" role="dialog" aria-modal="true" aria-labelledby="menu-title" onKeyDown={e => { if (e.key !== 'Tab') return; const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select'); if (!elements?.length) return; const first = elements[0], last = elements[elements.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }}>
      <div className="menu-heading"><div><span className="eyebrow">COASTLINE HEAT</span><h2 id="menu-title">{g.dead ? 'Busted.' : panel === 'missions' ? 'A little work. A lot of freedom.' : panel === 'restart' ? 'Back to the beginning?' : panel === 'audio' ? 'Enjoy the quiet.' : 'Take a breather.'}</h2></div>{!g.dead && <button className="icon-button" aria-label="Close menu" onClick={() => g.started ? resume() : setPanel(null)}><X size={20} /></button>}</div>
      {g.dead ? <><p className="menu-copy">The heat caught up with you. Respawn on Marina Promenade with full health. Your earnings and completed jobs are safe.</p><button className="primary-action" onClick={reset}>Back to the city <RotateCcw size={16} /></button></> : panel === 'restart' ? <><p className="menu-copy">Reset vehicles, health, and the current mission. Saved cash and completed missions will be kept.</p><div className="menu-buttons"><button className="primary-action" onClick={reset}>Restart session <RotateCcw size={16} /></button><button className="secondary-action" onClick={() => setPanel('pause')}>Cancel</button></div></> : panel === 'audio' ? <><p className="menu-copy">This prototype is silent. There is no music or game audio to enable.</p><button className="primary-action" onClick={() => g.started ? resume() : setPanel(null)}>Got it <Check size={17} /></button></> : panel === 'missions' ? <><p className="menu-copy">Three ways to make a name for yourself. Pick a job and follow the gold marker.</p><div className="mission-list">{missions.map((m, i) => <button key={m.name} className="mission-option" disabled={g.mission >= 0} onClick={() => chooseMission(i)}><span className="mission-icon">{i === 0 ? <Flag size={20} /> : i === 1 ? <Gauge size={20} /> : <Shield size={20} />}</span><span><small>{m.tag} · {m.time}s</small><strong>{m.name}{g.completed.includes(i) && <Check size={14} />}</strong><span>{m.description}</span></span><b>${m.reward.toLocaleString()}</b><ChevronRight size={17} /></button>)}</div>{g.mission >= 0 && <button className="secondary-action" onClick={() => { g.mission = -1; g.target = null; notify(g, 'Job abandoned. Choose a new mission.'); update(); }}>Abandon current job</button>}<p className="save-note">Progress saves on this browser. Jobs can be replayed.</p></> : <><div className="menu-buttons"><button className="primary-action" onClick={resume}>Resume game <ArrowRight size={18} /></button><button className="secondary-action" onClick={() => setPanel('missions')}>Find a mission <ArrowUpRight size={17} /></button></div><div className="controls-grid">{[['W A S D', 'Move / accelerate / steer'], ['SHIFT', 'Sprint on foot'], ['E', 'Enter or exit a nearby car'], ['SPACE', 'Handbrake'], ['RIGHT DRAG', 'Look around / aim'], ['CLICK / F', 'Fire sidearm on foot'], ['R', 'Reload (unlimited reserves)'], ['M / ESC', 'Missions / pause']].map(([key, text]) => <div key={key}><kbd>{key}</kbd><span>{text}</span></div>)}</div><div className="menu-settings"><label>Graphics <select value={g.quality} onChange={e => { g.quality = e.target.value; save(g); setSceneKey(k => k + 1); update(); }}><option value="high">High · shadows on</option><option value="low">Low · shadows off</option></select></label><button className="text-action" onClick={() => setPanel('restart')}><RotateCcw size={13} />Restart session</button></div><p className="save-note">Double-click the world to capture the mouse, or right-drag to look. Original prototype · Local saves · No multiplayer</p></>}
    </div></div>}
  </main>;
}
