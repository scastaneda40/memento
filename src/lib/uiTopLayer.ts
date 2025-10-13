// uiTopLayer.ts
export function getUiTopLayer(): HTMLElement {
  const ID = "ui-toplayer";
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement("div");
    el.id = ID;
    document.body.appendChild(el);
  }
  return el;
}
