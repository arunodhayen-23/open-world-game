'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { Group, PCFShadowMap, Vector3 } from 'three';
import { Car, Person, World } from './world';
import { buildings, tick, type Game, type Input } from '@/lib/game/engine';
function Simulation({ game, input, update }: { game: MutableRefObject<Game>; input: MutableRefObject<Input>; update: () => void }) {
  const player = useRef<Group>(null), cars = useRef<Group>(null), patrols = useRef<Group>(null), guards = useRef<Group>(null), marker = useRef<Group>(null), flash = useRef<Group>(null);
  const elapsed = useRef(0), desired = useRef(new Vector3()), target = useRef(new Vector3());
  useFrame(({ camera }, delta) => {
    const g = game.current;
    let remaining = Math.min(delta, .2);
    while (remaining > 0) { const step = Math.min(remaining, 1 / 60); tick(g, input.current, step); remaining -= step; }
    player.current!.position.set(g.x, 0, g.z); player.current!.rotation.y = -g.yaw - g.look; player.current!.visible = g.car < 0;
    g.cars.forEach((c, i) => { const m = cars.current!.children[i]; m.position.set(c.x, 0, c.z); m.rotation.y = -c.yaw; });
    g.police.forEach((c, i) => { const m = patrols.current!.children[i]; m.position.set(c.x, 0, c.z); m.rotation.y = -c.yaw; m.visible = c.hp > 0; });
    g.guards.forEach((n, i) => { const m = guards.current!.children[i]; m.position.set(n.x, 0, n.z); m.rotation.y = Math.atan2(g.x - n.x, g.z - n.z) + Math.PI; m.visible = n.hp > 0; });
    marker.current!.visible = !!g.target;
    if (g.target) { marker.current!.position.set(g.target.x, .15, g.target.z); marker.current!.rotation.y += delta * .5; }
    flash.current!.visible = g.shot > .17 && g.car < 0;
    flash.current!.position.set(g.x + Math.sin(g.yaw + g.look) * 2, 1.1, g.z - Math.cos(g.yaw + g.look) * 2);
    const yaw = g.yaw + g.look + (g.started ? 0 : -.3);
    const dist = !g.started ? 22 : g.car >= 0 ? 10.5 : 7;
    desired.current.set(g.x - Math.sin(yaw) * dist, !g.started ? 13 : (g.car >= 0 ? 5.5 : 4) + g.pitch * 3, g.z + Math.cos(yaw) * dist);
    target.current.set(g.x, g.started ? 1.2 : 1, g.z - (g.started ? 0 : 5));
    for (let t = .05; t <= 1; t += .05) {
      const x = target.current.x + (desired.current.x - target.current.x) * t;
      const y = target.current.y + (desired.current.y - target.current.y) * t;
      const z = target.current.z + (desired.current.z - target.current.z) * t;
      if (buildings.some(b => Math.abs(x - b.x) < b.w / 2 + .4 && Math.abs(z - b.z) < b.d / 2 + .4 && y < b.h + 1)) { desired.current.lerpVectors(target.current, desired.current, Math.max(.08, t - .08)); break; }
    }
    camera.position.lerp(desired.current, 1 - Math.exp(-delta * 8)); camera.lookAt(target.current);
    elapsed.current += delta; if (elapsed.current > .1) { elapsed.current = 0; update(); }
  });
  return <><World /><group ref={player}><Person /></group><group ref={cars}>{game.current.cars.map((c, i) => <group key={i}><Car color={c.color} /></group>)}</group><group ref={patrols}>{game.current.police.map((c, i) => <group key={i}><Car color={c.color} police /></group>)}</group><group ref={guards}>{game.current.guards.map((_, i) => <group key={i}><Person hostile /></group>)}</group><group ref={marker}><mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[5, .17, 8, 48]} /><meshBasicMaterial color="#e7bd59" /></mesh><mesh position={[0, 5, 0]}><cylinderGeometry args={[5, 5, 10, 32, 1, true]} /><meshBasicMaterial color="#f5c664" transparent opacity={.09} depthWrite={false} /></mesh><mesh position={[0, 5.5, 0]}><octahedronGeometry args={[.8]} /><meshBasicMaterial color="#ffe39a" /></mesh></group><group ref={flash}><mesh><octahedronGeometry args={[.35]} /><meshBasicMaterial color="#fff4af" /></mesh></group></>;
}
export default function Scene({ game, input, update, ready }: { game: MutableRefObject<Game>; input: MutableRefObject<Input>; update: () => void; ready: () => void }) {
  useEffect(() => { ready(); }, [ready]);
  const low = game.current.quality === 'low';
  return <Canvas shadows={low ? false : { type: PCFShadowMap }} dpr={low ? 1 : [1, 1.5]} camera={{ position: [-10, 14, 65], fov: 53, near: .2, far: 450 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setClearColor('#b7d0d1'); }} fallback={<div className="render-error">Interactive 3D city. A WebGL-capable browser with hardware acceleration is required to play.</div>}>
    <color attach="background" args={['#b7d0d1']} /><fog attach="fog" args={['#b7d0d1', 75, 230]} />
    <ambientLight intensity={1.15} color="#e2e7db" /><hemisphereLight args={['#c4e4ed', '#c0a17e', 1.5]} />
    <directionalLight position={[-55, 90, 45]} color="#ffe0af" intensity={3.1} castShadow={!low} shadow-mapSize={[2048, 2048]} shadow-camera-left={-115} shadow-camera-right={115} shadow-camera-top={115} shadow-camera-bottom={-115} shadow-camera-far={240} shadow-bias={-.0004} />
    <Simulation game={game} input={input} update={update} />
  </Canvas>;
}
