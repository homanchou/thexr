import { XRS } from "../xrs";

export class SystemEntry {
  name: "entry";
  xrs: XRS;
  init(xrs: XRS) {
    this.xrs = xrs;
    let loop = 0;
    document.addEventListener("click", () => {
      console.log("clicked screen");
      xrs.upsert(`${loop++}`, "pos", "set", [0.5, 1, 0.5]);
    });
  }
}
