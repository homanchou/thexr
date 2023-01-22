import { Subject } from "rxjs/internal/Subject";
import { createBroker } from "./broker";
import { makeScene } from "./scene";

export const xrs = {
  init: (vars: any) => {
    console.log("do something ehre");

    const canvas = document.createElement("canvas");
    canvas.id = vars.space_id;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "1";
    canvas.style.position = "absolute";
    canvas.style.touchAction = "none";
    canvas.style.outline = "none";

    document.body.append(canvas);

    const bus = new Subject();

    makeScene(vars.space_id, bus);
    createBroker(vars, bus);
  },
};
