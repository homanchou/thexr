/* tests the xrs
 * import this file into app.js
 */

import { XRS } from "../xrs";

let current_test_name = "none";

function assert(expression) {
  if (expression) {
  } else {
    console.error("FAIL - ", current_test_name);
  }
}

function test(name: string, callback) {
  current_test_name = name;
  callback();
}

export function tests() {
  const xrs = window["xrs"] as XRS;

  let system_was_initialized = false;

  // first we should add systems
  xrs.add_system({
    name: "test",
    init: () => {
      system_was_initialized = true;
      xrs.services.bus.on_set(["box"]).subscribe((cmd) => {
        assert(true);
      });
    },
  });

  test("system was initialized", () => {
    xrs.init({ space_id: "abc", member_id: "me", member_token: "..." });
    assert(system_was_initialized == true);
  });

  test("upsert some data", () => {
    xrs.send_command({ eid: "423", set: { box: true } });
  });

  /*
  
  // mock
  xrs.broker.dispatch_to_remote = (thing: any) => {};

  xrs.upsert("me", "pos", [1, 2, 3]);
  xrs.upsert("me", "pos", [4, 5, 6]);
  
  xrs.upsert("me", "tag.1", "hiya");

  test("commands should condense", xrs.command_queue.length === 1);
  const c = xrs.command_queue.find((item) => item.eid === "me");
  if (c === undefined) {
    test("command not found", c);
  } else {
    test(
      "commands should override prev component",
      get_command_value(c, "set", "pos")?.[0] === 4
    );
    test(
      "commands should merge new components into entities",
      get_command_value(c, "set", "tag.1") === "hiya"
    );
  }

  xrs.tick();
  
  test(
    "command can deeply update store",
    xrs.store["me"]["tag"]["1"] === "hiya"
  );
  test(
    "command path isn't directly stored",
    xrs.store["me"]["tag.1"] === undefined
  );
  test("apply commands to store", xrs.store["me"] !== undefined);
  test("command queue emptied", xrs.command_queue.length === 0);

  xrs.delete_component("me", "tag.1");
  xrs.tick();
  test("deletes value from path", xrs.store["me"]["tag"]["1"] === undefined);
  

  xrs.delete_component("me", "tag");
  xrs.tick();
  test("has component removed", xrs.has_component("me", "tag") === false);

  xrs.delete_entity("me");
  xrs.tick();
  test("removes entity", xrs.store["me"] === undefined);

  // create entity with a shape component -> creates a box
  xrs.upsert("box1", "shape", "box");
  xrs.tick();
  test("a box was created in 3d", xrs.scene.getMeshByName("box1") !== null);

  // add component pos to position the box
  xrs.upsert("box1", "pos", [0, 4, 0]);
  xrs.tick();
  test(
    "a box was positioned",
    xrs.scene.getMeshByName("box1")?.position.y === 4
  );
  // xrs.dispatch_commands_to_local(commands);

  // update component pos to reposition the box
  xrs.upsert("box1", "pos", [0, 1, 0]);
  xrs.tick();
  test(
    "a box was repositioned",
    xrs.scene.getMeshByName("box1")?.position.y === 1
  );

  // delete the entity, and it should remove the box
  */
}
