defmodule ThexrWeb.EntitiesComponentLive do
  use ThexrWeb, :live_component

  embed_templates "components/*"

  def update(assigns, socket) do
    socket =
      socket
      |> assign(assigns)
      |> assign(entities: Thexr.Worlds.list_entities(assigns.space.id))

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div>
      <h1>Entities for <%= @space.name %></h1>
      <.entity :for={entity <- @entities} entity={entity} />
    </div>
    """
  end

  def entity(assigns) do
    ~H"""
    <.button phx-click="inspect_entity" phx-value-entity={@entity.id}><%= @entity.id %></.button>
    """
  end
end
