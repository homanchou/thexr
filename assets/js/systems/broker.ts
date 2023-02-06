// NOTE: The contents of this file will only be executed if
// you uncomment its entry in "assets/js/app.js".

// Bring in Phoenix channels client library:
import { Socket, Channel } from "phoenix";
import { CondensedCommandQueue } from "../condensed_command_queue";
import { Command, XRS } from "../xrs";

const INTERVAL = 1000; // ms

export class SystemBroker {
  public name: "broker";
  public xrs: XRS;
  socket: Socket;
  channel: Channel;
  queued_commands: Command[] = [];
  timeout;
  last_sync = new Date().getTime();

  init(xrs: XRS) {
    this.xrs = xrs;
    this.xrs.broker = this;
    this.create_channel();
  }

  dispatch_to_remote(new_commands: Command[]) {
    for (let i = 0; i < new_commands.length; i++) {
      CondensedCommandQueue.upsert_command(
        this.queued_commands,
        new_commands[i]
      );
    }
    const now = new Date().getTime();
    const ms_since_last_sync = now - this.last_sync;
    console.log("ms", ms_since_last_sync);
    if (ms_since_last_sync < INTERVAL) {
      if (!this.timeout) {
        console.log(
          "setting timeout because",
          ms_since_last_sync,
          "> ",
          INTERVAL
        );
        this.timeout = setTimeout(() => {
          this.dispatch_to_remote([]);
        }, INTERVAL - ms_since_last_sync);
      }
      return;
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.queued_commands.length > 0) {
      const batch = [...this.queued_commands];
      if (batch.length > 0) {
        this.queued_commands.length = 0;
        this.channel.push("ctos", { batch });
        this.last_sync = new Date().getTime();
        console.log("sending batch", JSON.stringify(batch));
        // setTimeout(() => {
        //   this.locked = false;
        //   console.log("done sending batch");
        // }, 1000);
      }
    }
  }

  create_channel() {
    this.socket = new Socket("/socket", {
      params: { token: this.xrs.config.member_token },
    });

    // When you connect, you'll often need to authenticate the client.
    // For example, imagine you have an authentication plug, `MyAuth`,
    // which authenticates the session and assigns a `:current_user`.
    // If the current user exists you can assign the user's token in
    // the connection for use in the layout.
    //
    // In your "lib/thexr_web/router.ex":
    //
    //     pipeline :browser do
    //       ...
    //       plug MyAuth
    //       plug :put_member_token
    //     end
    //
    //     defp put_member_token(conn, _) do
    //       if current_user = conn.assigns[:current_user] do
    //         token = Phoenix.Token.sign(conn, "user socket", current_user.id)
    //         assign(conn, :member_token, token)
    //       else
    //         conn
    //       end
    //     end
    //
    // Now you need to pass this token to JavaScript. You can do so
    // inside a script tag in "lib/thexr_web/templates/layout/app.html.heex":
    //
    //     <script>window.userToken = "<%= assigns[:member_token] %>";</script>
    //
    // You will need to verify the user token in the "connect/3" function
    // in "lib/thexr_web/channels/user_socket.ex":
    //
    //     def connect(%{"token" => token}, socket, _connect_info) do
    //       # max_age: 1209600 is equivalent to two weeks in seconds
    //       case Phoenix.Token.verify(socket, "user socket", token, max_age: 1_209_600) do
    //         {:ok, user_id} ->
    //           {:ok, assign(socket, :user, user_id)}
    //
    //         {:error, reason} ->
    //           :error
    //       end
    //     end
    //
    // Finally, connect to the socket:
    this.socket.connect();

    // Now that you are connected, you can join channels with a topic.
    // Let's assume you have a channel with a topic named `room` and the
    // subtopic is its id - in this case 42:
    this.channel = this.socket.channel("space:" + this.xrs.config.space_id, {});
    this.channel
      .join()
      .receive("ok", (resp) => {
        console.log("Joined successfully", resp);
      })
      .receive("error", (resp) => {
        console.log("Unable to join", resp);
      });

    // bus.subscribe((msg) => {
    //   channel.push("person_moved", { ...msg, member_id: this.xrs.config.member_id });
    // });

    // channel.on("moved", (payload) => {
    //   console.log("receiving", payload);
    // });
    this.channel.on("stoc", (payload: { batch: Command[] }) => {
      console.log("receiving batch", JSON.stringify(payload));
      for (let i = 0; i < payload.batch.length; i++) {
        this.xrs.import_command(payload.batch[i]);
      }
    });
  }
}
