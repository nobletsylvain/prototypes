import * as CANNON from './vendor/cannon-es.js';

const fixedStep = 1 / 120;
const maxSubsteps = 12;

function vector(value, name, fallback = [0, 0, 0]) {
  const result = value ?? fallback;
  if (!Array.isArray(result) || result.length !== 3 || !result.every(Number.isFinite)) {
    throw new TypeError(`${name} must contain three finite numbers`);
  }
  return new CANNON.Vec3(...result);
}

function rotation(value = [0, 0, 0, 1]) {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(Number.isFinite)
    || value.every(component => component === 0)) {
    throw new TypeError('Quaternion must contain four finite numbers and have nonzero length');
  }
  const result = new CANNON.Quaternion(...value);
  result.normalize();
  return result;
}

function box(size) {
  const dimensions = vector(size, 'Size');
  if (dimensions.x <= 0 || dimensions.y <= 0 || dimensions.z <= 0) {
    throw new RangeError('Box dimensions must be positive');
  }
  return new CANNON.Box(dimensions.scale(.5));
}

export class WorkshopPhysics {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0), allowSleep: true });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    // Thin stacks require converged contact constraints before they can settle naturally.
    this.world.solver.iterations = 100;
    this.world.solver.tolerance = 1e-7;
    this.world.defaultContactMaterial.friction = .48;
    this.world.defaultContactMaterial.restitution = .035;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
    this.world.defaultContactMaterial.contactEquationRelaxation = 3;
    this.bodies = new Map();
    this.accumulator = 0;
    this.fixedStep = fixedStep;
    this.maxSubsteps = maxSubsteps;
    this.environment = [];
    this.onContact = null;
    this.lastContactTime = -Infinity;

    this.addEnvironmentBox('table', [2.5, .09, 1.7], [0, -.045, .04]);
    const floor = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    floor.position.set(0, -.82, 0);
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    floor.workshopEnvironment = 'floor';
    this.world.addBody(floor);
    this.environment.push(floor);
    this.addEnvironmentBox('left-wall', [.1, 3, 6.1], [-3.05, .68, .5]);
    this.addEnvironmentBox('right-wall', [.1, 3, 6.1], [3.05, .68, .5]);
    this.addEnvironmentBox('back-wall', [6.1, 3, .1], [0, .68, -2.55]);
    this.addEnvironmentBox('front-wall', [6.1, 3, .1], [0, .68, 3.55]);
  }

  addEnvironmentBox(name, size, position) {
    const body = new CANNON.Body({ mass: 0, shape: box(size), position: vector(position, 'Position') });
    body.workshopEnvironment = name;
    this.world.addBody(body);
    this.environment.push(body);
  }

  add(id, options) {
    if (typeof id !== 'string' || !id.length) throw new TypeError('Body identity must be a nonempty string');
    if (this.bodies.has(id)) throw new Error(`Body already exists: ${id}`);
    const mass = options.mass ?? .1;
    if (!Number.isFinite(mass) || mass < 0) throw new RangeError('Mass must be finite and nonnegative');
    const position = vector(options.position, 'Position');
    const quaternion = rotation(options.quaternion);
    const velocity = vector(options.velocity, 'Velocity');
    const angularVelocity = vector(options.angularVelocity, 'Angular velocity');
    const shapes = options.shapes ?? [{ size: options.size, offset: [0, 0, 0] }];
    if (!Array.isArray(shapes) || !shapes.length) throw new TypeError('At least one collision shape is required');
    const prepared = shapes.map(shape => ({ shape: box(shape.size), offset: vector(shape.offset, 'Shape offset') }));
    const kinematic = !!options.kinematic;
    const body = new CANNON.Body({
      mass: kinematic ? 0 : mass,
      type: kinematic ? CANNON.Body.KINEMATIC : mass > 0 ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC,
      position, quaternion, velocity, angularVelocity,
      linearDamping: .12, angularDamping: .2,
      allowSleep: true, sleepSpeedLimit: .025, sleepTimeLimit: .8,
    });
    for (const preparedShape of prepared) body.addShape(preparedShape.shape, preparedShape.offset);
    body.workshopId = id;
    body.workshopMass = mass;
    body.addEventListener('collide', event => {
      if (typeof this.onContact !== 'function') return;
      const speed = Math.abs(event.contact.getImpactVelocityAlongNormal());
      if (speed <= .2 || this.world.time - this.lastContactTime < .09) return;
      this.lastContactTime = this.world.time;
      this.onContact({ id, otherId: event.body.workshopId ?? event.body.workshopEnvironment, speed });
    });
    if (kinematic) { body.velocity.setZero(); body.angularVelocity.setZero(); }
    this.world.addBody(body);
    this.bodies.set(id, body);
    this.wakeAll();
    return body;
  }

  get(id) { return this.bodies.get(id); }

  remove(id) {
    const body = this.bodies.get(id);
    if (!body) return false;
    this.world.removeBody(body);
    this.bodies.delete(id);
    this.wakeAll();
    return true;
  }

  wakeAll() {
    for (const body of this.bodies.values()) if (body.type === CANNON.Body.DYNAMIC) body.wakeUp();
  }

  setKinematic(id, kinematic) {
    const body = this.bodies.get(id);
    if (!body) return false;
    const type = kinematic ? CANNON.Body.KINEMATIC : body.workshopMass > 0 ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC;
    if (body.type === type) return body;
    body.type = type;
    body.mass = kinematic ? 0 : body.workshopMass;
    body.updateMassProperties();
    body.velocity.setZero();
    body.angularVelocity.setZero();
    body.force.setZero();
    body.torque.setZero();
    body.aabbNeedsUpdate = true;
    this.world.broadphase.dirty = true;
    this.wakeAll();
    return body;
  }

  setPose(id, position, quaternion) {
    const body = this.bodies.get(id);
    if (!body) return false;
    const nextPosition = vector(position, 'Position');
    const nextQuaternion = quaternion === undefined ? body.quaternion.clone() : rotation(quaternion);
    const unchanged = body.position.distanceSquared(nextPosition) < 1e-20
      && ['x', 'y', 'z', 'w'].every(axis => Math.abs(body.quaternion[axis] - nextQuaternion[axis]) < 1e-10);
    if (unchanged) return body;
    body.position.copy(nextPosition);
    body.previousPosition.copy(nextPosition);
    body.interpolatedPosition.copy(nextPosition);
    body.quaternion.copy(nextQuaternion);
    body.previousQuaternion.copy(nextQuaternion);
    body.interpolatedQuaternion.copy(nextQuaternion);
    body.updateInertiaWorld(true);
    body.aabbNeedsUpdate = true;
    this.world.broadphase.dirty = true;
    this.wakeAll();
    return body;
  }

  step(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Frame duration must be finite and nonnegative');
    this.accumulator += Math.min(dt, fixedStep * maxSubsteps);
    let count = 0;
    while (this.accumulator + 1e-12 >= fixedStep && count < maxSubsteps) {
      this.world.step(fixedStep);
      this.accumulator = Math.max(0, this.accumulator - fixedStep);
      count++;
    }
    return count;
  }

  clear() {
    for (const body of this.bodies.values()) this.world.removeBody(body);
    this.bodies.clear();
    this.accumulator = 0;
    this.lastContactTime = -Infinity;
  }
}
