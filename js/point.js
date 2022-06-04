'use strict';

export default {
  new: (x = 0, y = 0) => ({x, y}),
  sum: (...points) => points.reduce((p, c) => ({x: p.x + c.x, y: p.y + c.y}), {x: 0, y: 0}),
  add: (a, b) => ({x: a.x + b.x, y: a.y + b.y}),
  subtract: (a, b) => ({x: a.x - b.x, y: a.y - b.y}),
  multiply: (p, n) => ({x: p.x * n, y: p.y * n}),
  divide: (p, n) => ({x: p.x / n, y: p.y / n}),
  round: p => ({x: p.x | 0, y: p.y | 0}),
  inv: p => ({x: -p.x, y: -p.y}),
  area: p => p.x * p.y,
  hypotenuse: p => (p.x*p.x + p.y*p.y) ** 0.5
}