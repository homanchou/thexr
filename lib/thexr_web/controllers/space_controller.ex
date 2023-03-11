defmodule ThexrWeb.SpaceController do
  use ThexrWeb, :controller

  def show(conn, %{"space_id" => space_id}) do
    member_id = conn.assigns[:member_id]
    vars = Jason.encode!(%{space_id: space_id, member_id: member_id})

    Swarm.register_name(space_id, ThexrWeb.SpaceServer, :start_link, [space_id])

    render(conn, :show,
      vars: vars,
      space_id: space_id,
      layout: false
    )
  end
end
