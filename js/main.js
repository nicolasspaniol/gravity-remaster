"use strict";

// modules
import * as util from "./util.js";
import Point from "./point.js";
import parseCfg from "./parse_cfg.js";

// global constants
const SIZE = 512;
const LAYER_NAMES = ["lighting", "tail", "body"];
const GRAVITATIONAL_CONST = .001;
const MOUSE_FORCE = 10000;

// create canvases
util.storeElementsWithId();
util.storedElements.renderRegion.style.cssText = `
  width: ${SIZE}px;
  height: ${SIZE}px;
`;

let layers = [];
for (let layer of LAYER_NAMES) {
  const cnv = document.createElement("canvas");
  cnv.width = SIZE;
  cnv.height = SIZE;
  cnv.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
  `;
  layers[layer] = cnv;
  util.storedElements.renderRegion.appendChild(cnv);
}

// create contexts
const bodyCtx = layers["body"].getContext("2d");
const tailCtx = layers["tail"].getContext("2d");
const lightCtx = layers["lighting"].getContext("2d", { alpha: false });

tailCtx.lineWidth = 2;
tailCtx.strokeStyle = "#aaa";
tailCtx.fillRect(0, 0, SIZE, SIZE);

// main objects
const halfScreenSize = Point.new(SIZE >> 1, SIZE >> 1);

class Body {
  force;

  constructor(pos, size, mass, movement) {
    this.pos = pos;
    this.size = size;
    this.mass = mass;
    this.movement = movement;
    this.force = Point.new();
  }

  render() {
    bodyCtx.strokeStyle = "#f00";
    bodyCtx.beginPath();
    bodyCtx.arc(this.pos.x, this.pos.y, this.size, 0, 2 * Math.PI);
    bodyCtx.closePath();
    bodyCtx.stroke();

    bodyCtx.strokeStyle = "#0f0";
    bodyCtx.beginPath();
    const forceLine = Point.multiply(this.force, this.size / Point.hypotenuse(this.force));
    bodyCtx.moveTo(this.pos.x, this.pos.y);
    bodyCtx.lineTo(this.pos.x + forceLine.x, this.pos.y + forceLine.y);
    bodyCtx.closePath();
    bodyCtx.stroke();

    bodyCtx.strokeStyle = "#fff";
    bodyCtx.beginPath();
    const movementLine = Point.multiply(this.movement, this.size / Point.hypotenuse(this.movement));
    bodyCtx.moveTo(this.pos.x, this.pos.y);
    bodyCtx.lineTo(this.pos.x + movementLine.x, this.pos.y + movementLine.y);
    bodyCtx.closePath();
    bodyCtx.stroke();
  }
}

// scene composition
function translateCfg(cfg) {
  const bodies = [];

  for (let body of cfg) {
    translateBody(bodies, body, null);
  }

  return bodies;
}
function translateBody(arr, body, parent) {
  let pos, movement;

  if (parent == null) {
    pos = Point.new(body.x, body.y);
    movement = Point.new(body.mx, body.my);
  }
  else {
    const angle = body.rot * Math.PI / 180;
    pos = Point.new(Math.sin(angle) * body.dist, -Math.cos(angle) * body.dist);
    pos = Point.add(pos, parent.pos);

    const f = Math.sqrt(parent.mass * GRAVITATIONAL_CONST);
    movement = Point.new(Math.cos(angle) * f, Math.sin(angle) * f);

    if (!body.clwise) {
      movement = Point.inv(movement);
    }

    movement = Point.add(movement, parent.movement);

    // tests
    if (body.name == "moon") {
      movement.x = -1.16;
      movement.y = .01;
    }
  }

  const bodyObj = new Body(pos, body.size, body.mass, movement);

  for (let child of body.children) {
    translateBody(arr, child, bodyObj);
  }

  arr.push(bodyObj);
}

let scene = translateCfg(await parseCfg("/data/test.txt"));

for (let body of scene) {
  body.pos = Point.add(body.pos, halfScreenSize);
}

// input
const canvasRegion = util.storedElements.renderRegion;
let mouseLeft = false;
let mousePos = Point.new();

canvasRegion.addEventListener("mousedown", ev => {
  if (ev.button == 0) mouseLeft = true;
});
canvasRegion.addEventListener("mouseup", ev => {
  if (ev.button == 0) mouseLeft = false;
});
canvasRegion.addEventListener("mousemove", ev => {
  mousePos = Point.new(ev.offsetX, ev.offsetY);
});
canvasRegion.addEventListener("contextmenu", ev => ev.preventDefault());

// main loop
function loop() {
  // calculate gravitational forces applied to each body
  for (let a = 0; a < scene.length; a++) {
    for (let b = a + 1; b < scene.length; b++) {
      const objA = scene[a];
      const objB = scene[b];
      const diff = Point.subtract(objA.pos, objB.pos);
      const f = GRAVITATIONAL_CONST * objA.mass * objB.mass / (diff.x ** 2 + diff.y ** 2);
      const force = Point.multiply(diff, f);
      scene[a].force = Point.subtract(scene[a].force, force);
      scene[b].force = Point.add(scene[b].force, force);
    }
  }

  // add mouse force
  if (mouseLeft) {
    for (let body of scene) {
      const diff = Point.subtract(mousePos, body.pos);
      const f = GRAVITATIONAL_CONST * body.mass * MOUSE_FORCE / (diff.x ** 2 + diff.y ** 2);
      const mouseForce = Point.multiply(diff, f);
      body.force = Point.add(body.force, mouseForce);
    }
  }

  // clear tail context
  let imgData = tailCtx.getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < imgData.data.length; i += 4) {
    imgData.data[i]--;
    imgData.data[i + 1]--;
    imgData.data[i + 2]--;
  }
  tailCtx.fillRect(0, 0, SIZE, SIZE);
  tailCtx.putImageData(imgData, 0, 0);

  // render bodies and tails
  bodyCtx.clearRect(0, 0, SIZE, SIZE);
  for (let body of scene) {
    tailCtx.beginPath();
    tailCtx.moveTo(body.pos.x, body.pos.y);

    body.movement = Point.add(body.movement, Point.divide(body.force, body.mass));
    body.pos = Point.add(body.pos, body.movement);
    body.render();
    body.force = Point.new();

    tailCtx.lineTo(body.pos.x, body.pos.y);
    tailCtx.closePath();
    tailCtx.stroke();
  }

  requestAnimationFrame(loop);
}
loop();