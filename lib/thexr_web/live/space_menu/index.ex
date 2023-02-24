defmodule ThexrWeb.SpaceMenu.Index do
  use ThexrWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, count: 0), layout: false}
  end

  # @impl true
  # def handle_params(params, _url, socket) do
  #   {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  # end

  @impl true
  def handle_event("inc", _, socket) do
    {:noreply, assign(socket, count: socket.assigns.count + 1)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <h1>Menu goes here</h1>
    <button phx-click="inc"><%= @count %></button>
    """
  end
end
