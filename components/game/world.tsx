'use client';
import { useLayoutEffect, useRef } from 'react';
import { BoxGeometry, Color, InstancedMesh, Object3D } from 'three';
import { buildings, roads } from '@/lib/game/engine';

type Box = { p: [number, number, number]; s: [number, number, number]; c: string };
function Boxes({ items }: { items: Box[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => { const o = new Object3D(); items.forEach((b, i) => { o.position.set(...b.p); o.scale.set(...b.s); o.updateMatrix(); ref.current!.setMatrixAt(i, o.matrix); ref.current!.setColorAt(i, new Color(b.c)); }); ref.current!.instanceMatrix.needsUpdate = true; if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true; }, [items]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow castShadow><boxGeometry /><meshStandardMaterial roughness={.87} /></instancedMesh>;
}
const details: Box[] = [];
buildings.forEach((b, index) => {
  details.push({ p: [b.x, b.h / 2, b.z], s: [b.w, b.h, b.d], c: b.color });
  details.push({ p: [b.x, b.h + .25, b.z], s: [b.w + .5, .5, b.d + .5], c: '#e7dccc' });
  details.push({ p: [b.x, b.h + 1, b.z], s: [5, 1.6, 4], c: '#9a9c93' });
  details.push({ p: [b.x, .14, b.z], s: [24, .28, 24], c: '#c6bdab' });
  for (let y = 3; y < b.h - 1; y += 3.4) for (let t = -7; t <= 7; t += 3.5) {
    const c = (Math.floor(y) + index) % 4 === 0 ? '#d1b788' : '#527b83';
    details.push({ p: [b.x + t, y, b.z + 10.025], s: [1.9, 1.8, .08], c });
    details.push({ p: [b.x + t, y, b.z - 10.025], s: [1.9, 1.8, .08], c });
    details.push({ p: [b.x + 10.025, y, b.z + t], s: [.08, 1.8, 1.9], c });
    details.push({ p: [b.x - 10.025, y, b.z + t], s: [.08, 1.8, 1.9], c });
  }
  for (const t of [-5, 0, 5]) details.push({ p: [b.x + t, 1.3, b.z + 10.08], s: [3.5, 2.6, .12], c: '#355459' });
  details.push({ p: [b.x, 2.9, b.z + 10.7], s: [18, .2, 1.6], c: index % 3 === 0 ? '#b5684b' : '#547c71' });
});
roads.forEach(r => { for (let t = -94; t < 96; t += 6) { if (roads.some(n => Math.abs(n - t) < 5)) continue; details.push({ p: [r, .025, t], s: [.14, .025, 2.6], c: '#d7c58e' }); details.push({ p: [t, .025, r], s: [2.6, .025, .14], c: '#d7c58e' }); }
  roads.forEach(z => { for (let i = -3; i <= 3; i++) { details.push({ p: [r + i * .85, .032, z + 5], s: [.45, .025, 1.9], c: '#d4d0b9' }); details.push({ p: [r + 5, .032, z + i * .85], s: [1.9, .025, .45], c: '#d4d0b9' }); } });
});
const trunkGeometry = new BoxGeometry(.28, 6, .28);
export function Palm({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return <group position={[x, 0, z]} scale={scale}><mesh geometry={trunkGeometry} position={[0, 3, 0]} castShadow><meshStandardMaterial color="#92775a" /></mesh>{Array.from({ length: 7 }, (_, i) => <group key={i} position={[0, 6, 0]} rotation={[0, i * Math.PI * 2 / 7, 0]}><mesh position={[0, -.25, 1.6]} rotation={[-.23, 0, 0]} scale={[.75, .12, 3]} castShadow><octahedronGeometry args={[1, 0]} /><meshStandardMaterial color={i % 2 ? '#496e45' : '#63814e'} /></mesh></group>)}</group>;
}
export function World() {
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[196, 196]} /><meshStandardMaterial color="#696d68" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[150, -.35, 0]}><planeGeometry args={[105, 650]} /><meshStandardMaterial color="#72b1b1" roughness={.32} metalness={.22} /></mesh>
    <mesh position={[99, -.15, 0]}><boxGeometry args={[5, .3, 196]} /><meshStandardMaterial color="#dfceb1" /></mesh>
    <mesh position={[75, .12, 0]} receiveShadow><boxGeometry args={[23, .2, 195]} /><meshStandardMaterial color="#9aab7d" /></mesh>
    <mesh position={[15, .12, 15]} receiveShadow><boxGeometry args={[24, .2, 24]} /><meshStandardMaterial color="#8c9d6b" /></mesh>
    <Boxes items={details} />
    {Array.from({ length: 13 }, (_, i) => <Palm key={`coast${i}`} x={83} z={-90 + i * 15} scale={1.3} />)}
    {roads.slice(0, -1).flatMap((x, i) => roads.slice(0, -1).map((z, j) => <Palm key={`${i}-${j}`} x={x + 4.1} z={z + 11} scale={.85 + (i % 3) * .1} />))}
    {[-65, -25, 15, 55].map(z => <group key={z} position={[96, .3, z]}><mesh position={[10, 0, 0]} receiveShadow><boxGeometry args={[22, .35, 4]} /><meshStandardMaterial color="#a8987c" /></mesh>{[-1.5, 1.5].map(v => <mesh key={v} position={[19, -.5, v]}><boxGeometry args={[.3, 3, .3]} /><meshStandardMaterial color="#746957" /></mesh>)}</group>)}
    {roads.slice(0, -1).flatMap(x => [-60, 0, 60].map(z => <group key={`lamp${x}${z}`} position={[x - 4.5, 0, z + 8]}><mesh position={[0, 3.3, 0]}><cylinderGeometry args={[.09, .12, 6.6, 5]} /><meshStandardMaterial color="#535e58" /></mesh><mesh position={[.65, 6.6, 0]}><boxGeometry args={[1.6, .18, .35]} /><meshStandardMaterial color="#d5d0b6" /></mesh></group>))}
    {Array.from({ length: 12 }, (_, i) => <mesh key={`skyline${i}`} position={[-145 + i * 19, 10 + i % 4 * 8, -130]}><boxGeometry args={[12, 20 + i % 4 * 16, 15]} /><meshStandardMaterial color="#9daaaa" /></mesh>)}
  </group>;
}
export function Car({ color, police = false }: { color: string; police?: boolean }) {
  return <group>
    <mesh position={[0, .64, 0]} castShadow><boxGeometry args={[1.85, .6, 4]} /><meshStandardMaterial color={police ? '#e2e3d9' : color} metalness={.35} roughness={.3} /></mesh>
    <mesh position={[0, 1.05, .2]} castShadow><boxGeometry args={[1.58, .65, 1.85]} /><meshStandardMaterial color="#263b40" metalness={.4} roughness={.22} /></mesh>
    <mesh position={[0, 1.42, .23]} castShadow><boxGeometry args={[1.67, .13, 1.9]} /><meshStandardMaterial color={police ? '#263237' : color} metalness={.4} /></mesh>
    <mesh position={[0, .88, -1.45]}><boxGeometry args={[1.8, .16, .95]} /><meshStandardMaterial color={police ? '#263237' : color} /></mesh>
    <mesh position={[0, .5, -2.03]}><boxGeometry args={[1.65, .15, .1]} /><meshStandardMaterial color="#b0b5aa" metalness={.8} /></mesh>
    {[-.65, .65].map(x => <group key={x}><mesh position={[x, .7, -2.04]}><boxGeometry args={[.39, .2, .06]} /><meshStandardMaterial color="#fff1c5" emissive="#ffe8b0" emissiveIntensity={.8} /></mesh><mesh position={[x, .73, 2.02]}><boxGeometry args={[.4, .17, .07]} /><meshStandardMaterial color="#ac3828" emissive="#b93320" emissiveIntensity={.4} /></mesh></group>)}
    {[-1, 1].flatMap(x => [-1.3, 1.3].map(z => <group key={`${x}${z}`} position={[x * .94, .4, z]} rotation={[0, 0, Math.PI / 2]}><mesh castShadow><cylinderGeometry args={[.4, .4, .23, 12]} /><meshStandardMaterial color="#242b2b" /></mesh><mesh position={[0, x * -.13, 0]}><cylinderGeometry args={[.21, .21, .025, 8]} /><meshStandardMaterial color="#9badae" metalness={.7} /></mesh></group>))}
    {police && <><mesh position={[-.4, 1.57, .2]}><boxGeometry args={[.6, .18, .3]} /><meshStandardMaterial color="#e45c4c" emissive="#ff3322" emissiveIntensity={2} /></mesh><mesh position={[.4, 1.57, .2]}><boxGeometry args={[.6, .18, .3]} /><meshStandardMaterial color="#5598de" emissive="#2266ff" emissiveIntensity={2} /></mesh></>}
  </group>;
}
export function Person({ hostile = false }: { hostile?: boolean }) {
  return <group><mesh position={[0, 1.45, 0]} castShadow><boxGeometry args={[.42, .4, .4]} /><meshStandardMaterial color="#bb8e6e" /></mesh><mesh position={[0, .98, 0]} castShadow><boxGeometry args={[.64, .63, .35]} /><meshStandardMaterial color={hostile ? '#9a5143' : '#ece5cb'} /></mesh>{[-1, 1].map(s => <group key={s}><mesh position={[s * .18, .36, 0]} castShadow><boxGeometry args={[.24, .65, .26]} /><meshStandardMaterial color="#35444a" /></mesh><mesh position={[s * .43, 1, -.12]} rotation={[.3, 0, s * .12]} castShadow><boxGeometry args={[.17, .58, .2]} /><meshStandardMaterial color={hostile ? '#9a5143' : '#ece5cb'} /></mesh></group>)}<mesh position={[.42, .85, -.42]}><boxGeometry args={[.12, .16, .48]} /><meshStandardMaterial color="#333e3f" /></mesh></group>;
}
