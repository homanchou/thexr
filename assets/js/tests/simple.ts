/* tests the xrs
 * import this file into app.js
 */

import { XRS } from "../xrs";

function test(msg: string, truthy_expression: any) {
  if (truthy_expression) {
    console.log("PASS - ", msg);
  } else {
    console.error("FAIL - ", msg);
  }

  //   console.assert(truthy_expression, msg);
}

export function tests() {
  const xrs = window["xrs"] as XRS;

  // first we should add systems
  xrs.add_system({
    name: "test",
    init: () => {
      console.log("test system inited");
    },
  });

  xrs.init({ space_id: "abc", member_id: "me", member_token: "..." });

  // //   - set properties to the world (ecs) ->

  // xrs.add_entity("abc", {fly: true, gravity: 0.5});
  // xrs.add_component("abc", {grabbable: true})
  // xrs.update_component("abc")
  // xrs.define_component("fly");
  // xrs.set_component("abc", "fly", [1, 2, 3]);

  // test("has_component", xrs.has_component("abc", "fly"));
  // test(
  //   "prepares a payload for export",
  //   xrs.pop_export_patch()["abc"]["fly"][0] === 1
  // );
  // test("is in entered query", xrs.query_entered("fly").length === 1);
  // test(
  //   "is cleared from entered query on next call",
  //   xrs.query_entered("fly").length === 0
  // );
  // test("is in updated query", xrs.query_touched("fly").length === 1);
  // test(
  //   "is cleared from updated query on next call",
  //   xrs.query_touched("fly").length === 0
  // );
  // test("is not in exit query", xrs.query_exited("fly").length === 0);

  // - a payload is staged for export -> to sync with clients (every 50-100ms) -> serialize to json

  //- import properties (other's changed) from external clients (every 5-100ms) -> stash in world -> mark change
  // will show up in queries for enter, update, exit
  // will NOT update the payload for export

  //- on each frame, if something changed in the world (TM), process systems pipeline
  //   - go through each system in order: and process each of: on particular components it is interested in: enters, exits, changes
  //  - will clear the flags for changed

  // receive external updates,
}
