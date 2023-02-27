defmodule ThexrWeb.SpaceMenu.Index do
  use ThexrWeb, :live_view

  @impl true
  def mount(_params, %{"member_id" => member_id, "space_id" => space_id}, socket) do
    {:ok, assign(socket, entered: false, member_id: member_id, space_id: space_id), layout: false}
  end

  # @impl true
  # def handle_params(params, _url, socket) do
  #   {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  # end

  @impl true
  def handle_event("enter_space", _, socket) do
    ThexrWeb.Endpoint.broadcast_from!(self(), "space:#{socket.assigns.space_id}", "stoc", %{
      eid: socket.assigns.member_id,
      set: %{avatar: "box"}
    })

    {:noreply, assign(socket, entered: true)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <%= if !@entered do %>
      <h1>Welcome</h1>
      <button
        phx-click="enter_space"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Please click to enter the space
      </button>
    <% end %>
    """
  end
end
