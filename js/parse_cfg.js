class ParsingContext {
  constructor(text) {
    this.text = text;
    this.index = 0;
  }

  canContinue() {
    return this.text.length - this.index > 1;
  }
  next() {
    return this.text[this.index];
  }

  getAll(condition, required = false) {
    let word = null;
    let c = this.next();
    while (condition(c)) {
      word = (word ?? "") + c;
      this.index++;
      c = this.next();
    }
    if (required && word == null) {
      throw new Error (`no character found that matches expected condition`);
    }
    return word;
  }
  getChar(condition, required = false) {
    const c = this.next();
    if (condition(c)) {
      this.index++;
      return c;
    }
    if (required) {
      throw new Error (`character "${c}" does not match expected condition`);
    }
    return null;
  }
}

export default async function parseCfg(path) {
  try {
    let text = await (await fetch(path)).text();
    text = text.replaceAll(/\s/g, "").toLowerCase();
    
    const ctx = new ParsingContext(text);

    return parseObjs(ctx, false);
  }
  catch (e) {
    throw new Error(`error parsing ${path}: ${e.message}`);
  }
}

const BASE_PARAMS = ["x", "y", "size", "mx", "my", "mass"];
const CHILDREN_PARAMS = ["dist", "rot", "size", "mass", "clwise"];

function parseObjs(ctx, isChildren) {
  const objs = [];

  while (ctx.canContinue() && ctx.next() != "}") {
    const name = ctx.getAll(isLetter, true);
    
    ctx.getChar(eq("("), true);
    const paramText = ctx.getAll(diff(")"), true);
    ctx.getChar(eq(")"), true);

    const obj = parseParams(paramText, isChildren);
    
    ctx.getChar(eq("{"), true);
    const children = parseObjs(ctx, true);
    ctx.getChar(eq("}"), true);

    obj.name = name;
    obj.children = children;
    objs.push(obj);
  }

  return objs;
}

function parseParams(text, isChildren) {
  const params = {};
  const splittedText = text.split(",");
  for (let slice of splittedText) {
    const [key, value] = slice.split("=");
    params[key] = parseParam(key, value);
    if (params[key] == null) {
      throw new Error(`invalid value for "${key}": "${value}"`);
    }
  }

  const requiredParams = isChildren? CHILDREN_PARAMS : BASE_PARAMS;

  for (let param of requiredParams) {
    if (!(param in params)) {
      throw new Error(`required parameter "${param}" not present`);
    }
  }

  return params;
}

function parseParam(name, value) {
  let v;

  switch (name) {
    case "x":
    case "y":
    case "mx":
    case "my":
      v = +value;
      return isNaN(v)? null : v;
    
    case "size":
    case "dist":
    case "mass":
      v = +value;
      return (isNaN(v) || v <= 0)? null : v;

    case "rot":
      v = +value;
      return (isNaN(v) || v < 0 || v >= 360)? null : v;

    case "clwise":
      return value == "true" || value == "false"? value == "true" : null;
  }
}

function isLetter(c) {
  c = c.charCodeAt(0);
  return c > 96 && c < 123;
}
const eq = (value) => (e => e === value);
const diff = (value) => (e => e !== value);