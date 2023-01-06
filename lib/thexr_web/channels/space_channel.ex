defmodule ThexrWeb.SpaceChannel do
  use ThexrWeb, :channel

  @impl true
  def join("space:" <> space_id, payload, socket) do
    IO.inspect(socket, label: "socket in space channel")
    # socket = assign(socket, hi: "bye")
    {:ok, socket}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("person_moved", payload, socket) do
    IO.inspect(socket.assigns, label: "socket assigns")
    broadcast_from(socket, "moved", payload)
    {:noreply, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (space:lobby).
  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end
end
