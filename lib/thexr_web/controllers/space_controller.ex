defmodule ThexrWeb.SpaceController do
  use ThexrWeb, :controller

  def show(conn, %{"space_id" => space_id}) do
    member_id = conn.assigns[:member_id]
    ThexrWeb.Space.GrandSupervisor.start_space(space_id)

    vars =
      Jason.encode!(%{
        space_id: space_id,
        member_id: member_id,
        snapshot: ThexrWeb.Space.Manager.get_snapshot(space_id)
      })

    render(conn, :show,
      vars: vars,
      space_id: space_id,
      layout: false
    )
  end
end
