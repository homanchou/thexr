defmodule ThexrWeb.EntityInspectorLive do
  use ThexrWeb, :live_component

  embed_templates "components/*"

  def update(assigns, socket) do
    entity_id = assigns.menu_state.subject
    space_id = assigns.space.id

    socket =
      socket
      |> assign(assigns)
      |> assign(entity_id: entity_id)
      |> assign(components: Thexr.Worlds.get_entity(space_id, entity_id))

    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div>
      <div>ID: <%= @entity_id %></div>
      <%= for {name, value} <- @components do %>
        <div><%= name %>: <pre><%= inspect(value) %></pre></div>
      <% end %>
    </div>
    """
  end
end
