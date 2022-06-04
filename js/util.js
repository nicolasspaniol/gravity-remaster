"use strict";

export const storedElements = {};

export function storeElementsWithId() {
  for (let elem of document.querySelectorAll("*[id]")) {
    storedElements[toCamelCase(elem.id)] = elem;
  }
}

export async function loadImage(path) {
  return await new Promise((res, rej = null) => {
    let img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = path;
  });
}

// private

function toCamelCase(id) {
  let result = "";
  let wasLastSpace = false;
  for (let letter of id) {
    if (letter == "-") {
      wasLastSpace = true;
      continue;
    }
    result += wasLastSpace ? letter.toUpperCase() : letter;
    wasLastSpace = false;
  }
  return result;
}