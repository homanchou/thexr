defmodule ThexrWeb.SpaceChannel do
  use ThexrWeb, :channel

  @impl true
  def join("space:" <> space_id, _payload, socket) do
    {:ok, assign(socket, space_id: space_id)}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("ctos", payload, socket) do
    broadcast_from(socket, "stoc", payload)
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
