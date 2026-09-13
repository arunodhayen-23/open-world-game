export type Point = { x: number; z: number };
export type Vehicle = Point & { yaw: number; color: string; police?: boolean; hp: number; route?: Point };
export const roads = [-90, -60, -30, 0, 30, 60, 90];
export const buildings = roads.slice(0, -1).flatMap((x, i) => roads.slice(0, -1).flatMap((z, j) => {
  if (i === 5 || (i === 3 && j === 3)) return [];
  return [{ x: x + 15, z: z + 15, w: 20, d: 20, h: 8 + ((i * 13 + j * 7) % 5) * 5, color: ['#d3c0a4', '#b8c2ba', '#e1c5a3', '#a2b4b9', '#d4cabb'][(i + j) % 5] }];
}));
export const missions = [
  { name: 'Special delivery', tag: 'COURIER RUN', description: 'Take a car to the marina. Make the delivery before time runs out.', reward: 750, time: 100, points: [{ x: 60, z: -60 }] },
  { name: 'Coastal circuit', tag: 'CHECKPOINT RACE', description: 'Get behind the wheel and hit all four checkpoints along the coast.', reward: 1200, time: 150, points: [{ x: 60, z: 30 }, { x: 60, z: -60 }, { x: -30, z: -60 }, { x: -30, z: 30 }] },
  { name: 'Heat on the block', tag: 'COMBAT & ESCAPE', description: 'Take down three hostile guards at the marked block, then lose the police.', reward: 1800, time: 180, points: [{ x: 0, z: -30 }] },
];
export function createGame() {
  return { x: 63, z: 43, yaw: 0, look: 0, pitch: 0, speed: 0, car: -1, health: 100, ammo: 12, reload: 0, shot: 0, cash: 0, completed: [] as number[], quality: 'high', offenses: 0, wanted: 0, heat: 0, escape: 0, playing: false, started: false, dead: false, mission: -1, checkpoint: 0, timer: 0, message: 'Welcome to the coast.', messageTime: 0, time: 0, target: null as Point | null,
    cars: [{ x: 60, z: 40, yaw: 0, color: '#e6a52f', hp: 100 }, { x: -3, z: 16, yaw: Math.PI, color: '#7eafb0', hp: 100 }, { x: 33, z: -15, yaw: 0, color: '#ca6451', hp: 100 }, { x: -30, z: 36, yaw: 0, color: '#b7c6bd', hp: 100 }, { x: 63, z: -35, yaw: Math.PI, color: '#e7d9bd', hp: 100 }] as Vehicle[],
    police: [{ x: -60, z: -60, yaw: 0, color: '#eeeeee', police: true, hp: 100 }, { x: 60, z: -90, yaw: 0, color: '#eeeeee', police: true, hp: 100 }, { x: -90, z: 60, yaw: 0, color: '#eeeeee', police: true, hp: 100 }] as Vehicle[],
    guards: [{ x: -3, z: -29, hp: 100 }, { x: 3, z: -35, hp: 100 }, { x: 5, z: -24, hp: 100 }],
  };
}
export type Game = ReturnType<typeof createGame>;
export type Input = { keys: Set<string>; pressed: Set<string>; fire: boolean };
export function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.z - b.z); }
export function blocked(x: number, z: number, radius = 0.65) {
  return Math.abs(x) > 96 || Math.abs(z) > 96 || buildings.some(b => Math.abs(x - b.x) < b.w / 2 + radius && Math.abs(z - b.z) < b.d / 2 + radius);
}
function move(g: Point, x: number, z: number, radius = .65) {
  if (!blocked(x, g.z, radius)) g.x = x;
  if (!blocked(g.x, z, radius)) g.z = z;
}
function lineOfSight(a: Point, b: Point) {
  const steps = Math.ceil(distance(a, b));
  for (let i = 1; i < steps; i++) if (blocked(a.x + (b.x - a.x) * i / steps, a.z + (b.z - a.z) * i / steps, .1)) return false;
  return true;
}
export function notify(g: Game, text: string) { g.message = text; g.messageTime = 5; }
export function save(g: Game) { try { localStorage.setItem('coastline-heat-v1', JSON.stringify({ cash: g.cash, completed: g.completed, quality: g.quality })); } catch { /* Storage can be unavailable in private browsing. */ } }
export function load(g: Game) { try { const p = JSON.parse(localStorage.getItem('coastline-heat-v1') || '{}'); if (Number.isFinite(p.cash) && p.cash >= 0) g.cash = p.cash; if (Array.isArray(p.completed)) g.completed = p.completed.filter((n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < 3); if (p.quality === 'low') g.quality = 'low'; } catch { /* A corrupt save should never prevent playing. */ } }
export function startMission(g: Game, id: number) { if (g.mission >= 0) return; g.mission = id; g.checkpoint = 0; g.timer = missions[id].time; g.target = missions[id].points[0]; if (id === 2) g.guards.forEach(n => n.hp = 100); notify(g, missions[id].description); }
export function interact(g: Game) {
  if (g.car >= 0) {
    if (Math.abs(g.speed) > 5) { notify(g, 'Slow down before getting out.'); return; }
    const car = g.cars[g.car];
    for (const offset of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const x = car.x + Math.sin(car.yaw + offset) * 3; const z = car.z - Math.cos(car.yaw + offset) * 3;
      if (!blocked(x, z)) { g.x = x; g.z = z; g.car = -1; g.speed = 0; return; }
    }
    notify(g, 'No room to exit here.');
  } else {
    const index = g.cars.findIndex(c => distance(c, g) < 6);
    if (index >= 0) { g.car = index; g.yaw = g.cars[index].yaw; g.look = 0; g.x = g.cars[index].x; g.z = g.cars[index].z; g.wanted = Math.max(1, g.wanted); g.heat = 10; notify(g, 'Vehicle reported stolen. Stay ahead of the patrols.'); }
    else notify(g, 'Move closer to a parked car to enter.');
  }
}
export function tick(g: Game, input: Input, dt: number) {
  if (!g.playing || g.dead) return;
  dt = Math.min(dt, .04); g.time += dt; g.shot = Math.max(0, g.shot - dt); g.messageTime -= dt;
  const k = input.keys;
  if (input.pressed.has('KeyE')) interact(g);
  if (input.pressed.has('KeyR') && g.ammo < 12 && g.reload <= 0) g.reload = 1.4;
  input.pressed.clear();
  if (g.reload > 0) { g.reload -= dt; if (g.reload <= 0) g.ammo = 12; }
  const forward = Number(k.has('KeyW') || k.has('ArrowUp')) - Number(k.has('KeyS') || k.has('ArrowDown'));
  const side = Number(k.has('KeyD') || k.has('ArrowRight')) - Number(k.has('KeyA') || k.has('ArrowLeft'));
  if (g.car >= 0) {
    g.speed += forward * 23 * dt;
    g.speed *= Math.pow(k.has('Space') ? .08 : forward ? .88 : .38, dt);
    g.speed = Math.max(-12, Math.min(43, g.speed));
    g.yaw += side * dt * 1.8 * Math.min(1, Math.abs(g.speed) / 8) * (g.speed < 0 ? -1 : 1);
    const x = g.x + Math.sin(g.yaw) * g.speed * dt, z = g.z - Math.cos(g.yaw) * g.speed * dt;
    const carHit = g.cars.some((c, i) => i !== g.car && Math.hypot(c.x - x, c.z - z) < 2.8);
    if (blocked(x, z, 1.3) || carHit) { if (Math.abs(g.speed) > 9) g.health -= Math.abs(g.speed) * .2; g.speed *= -.22; } else { g.x = x; g.z = z; }
    Object.assign(g.cars[g.car], { x: g.x, z: g.z, yaw: g.yaw });
  } else {
    const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 10 : 5;
    const length = Math.max(1, Math.hypot(forward, side)); const angle = g.yaw + g.look;
    const x = g.x + (Math.sin(angle) * forward + Math.cos(angle) * side) * speed * dt / length;
    const z = g.z + (-Math.cos(angle) * forward + Math.sin(angle) * side) * speed * dt / length;
    if (!g.cars.some(c => Math.hypot(c.x - x, c.z - z) < 1.65)) move(g, x, z);
    g.speed = forward || side ? speed : 0;
  }
  if ((input.fire || k.has('KeyF')) && g.car < 0 && g.shot <= 0 && g.reload <= 0 && g.ammo > 0) {
    g.shot = .23; g.ammo--; g.offenses++; g.wanted = Math.min(5, Math.max(2 + Math.floor(g.offenses / 4), g.wanted)); g.heat = 14;
    const angle = g.yaw + g.look;
    const targets = [...g.guards, ...g.police].filter(n => n.hp > 0 && distance(n, g) < 48).sort((a, b) => distance(a, g) - distance(b, g));
    for (const n of targets) { const bearing = Math.atan2(n.x - g.x, -(n.z - g.z)); if (Math.cos(bearing - angle) > .975 && lineOfSight(g, n)) { n.hp -= 50; notify(g, n.hp <= 0 ? 'Target neutralized.' : 'Target hit.'); break; } }
  }
  g.heat = Math.max(0, g.heat - dt);
  if (g.wanted > 0) {
    let seen = false;
    g.police.slice(0, Math.min(3, g.wanted)).forEach(p => {
      if (p.hp <= 0) return;
      const d = distance(g, p); if (d < 35 && lineOfSight(p, g)) seen = true;
      // Road intersections keep pursuing cars out of solid city blocks.
      const snap = (v: number) => Math.max(-90, Math.min(90, Math.round(v / 30) * 30));
      let tx = g.x, tz = g.z;
      if (!lineOfSight(p, g)) {
        if (!p.route || distance(p, p.route) < .6) {
          const ix = snap(p.x), iz = snap(p.z);
          if (Math.abs(p.x - ix) > .8) p.route = { x: ix, z: p.z };
          else if (Math.abs(p.z - iz) > .8) p.route = { x: p.x, z: iz };
          else if (Math.abs(g.x - ix) > Math.abs(g.z - iz)) p.route = { x: ix + Math.sign(g.x - ix) * 30, z: iz };
          else p.route = { x: ix, z: iz + Math.sign(g.z - iz) * 30 };
        }
        tx = p.route.x; tz = p.route.z;
      } else p.route = undefined;
      const a = Math.atan2(tx - p.x, -(tz - p.z)); p.yaw = a;
      if (d > 2.8) move(p, p.x + Math.sin(a) * (12 + g.wanted * 2) * dt, p.z - Math.cos(a) * (12 + g.wanted * 2) * dt, 1.1);
      if (d < 4) g.health -= 12 * dt;
    });
    if (!seen && g.heat <= 0) { g.escape += dt; if (g.escape >= 12) { g.wanted = 0; g.offenses = 0; g.escape = 0; notify(g, 'Pursuit evaded. You are in the clear.'); } } else g.escape = 0;
  }
  g.guards.forEach(n => { if (n.hp > 0 && (g.mission === 2 || g.wanted >= 2) && distance(n, g) < 24 && lineOfSight(n, g)) { g.health -= 4 * dt; if (distance(n, g) > 10) { const a = Math.atan2(g.x - n.x, g.z - n.z); move(n, n.x + Math.sin(a) * dt * 2, n.z + Math.cos(a) * dt * 2); } } });
  if (g.mission >= 0) {
    const m = missions[g.mission]; g.timer -= dt;
    if (g.timer <= 0) { notify(g, 'Time is up. Open Missions to retry.'); g.mission = -1; g.target = null; }
    else {
      if (g.mission !== 2 && g.car >= 0 && g.target && distance(g, g.target) < 7) { g.checkpoint++; g.target = m.points[g.checkpoint] || null; }
      if (g.mission === 2 && g.guards.every(n => n.hp <= 0)) { g.target = null; g.checkpoint = 1; }
      if ((g.mission !== 2 && g.checkpoint >= m.points.length) || (g.mission === 2 && g.checkpoint === 1 && g.wanted === 0)) {
        g.cash += m.reward; if (!g.completed.includes(g.mission)) g.completed.push(g.mission); notify(g, `Mission complete. +$${m.reward.toLocaleString()}`); g.mission = -1; g.target = null; save(g);
      }
    }
  }
  if (g.health <= 0) { g.health = 0; g.dead = true; g.playing = false; }
}
