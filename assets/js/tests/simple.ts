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

  xrs.config = { space_id: "abc", member_id: "me", member_token: "..." };

  xrs.upsert("me", "pos", "set", [1, 2, 3]);
  xrs.upsert("me", "pos", "set", [4, 5, 6]);
  console.log(JSON.stringify(xrs.command_queue));
  xrs.upsert("me", "tag.1", "set", "hiya");

  test("commands should condense", xrs.command_queue.length === 1);
  test(
    "commands should override prev component",
    xrs.command_queue
      .find((item) => item.eid === "me")
      ?.cp.find((comp) => comp.path === "pos")?.value[0] === 4
  );
  test(
    "commands should merge new components into entities",
    xrs.command_queue.find((item) => item.eid === "me")?.cp.length === 2
  );

  xrs.apply_commands_to_store();
  test("apply commands to store", xrs.store["me"] !== undefined);
  test("command queue emptied", xrs.command_queue.length === 0);

  xrs.delete_component("me", "tag");
  xrs.apply_commands_to_store();
  test("has component removed", xrs.has_component("me", "tag") === false);
}
