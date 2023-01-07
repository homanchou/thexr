defmodule ThexrWeb.SpaceController do
  use ThexrWeb, :controller

  def show(conn, %{"space_id" => space_id}) do
    member_id = conn.assigns[:member_id]
    member_token = Phoenix.Token.sign(conn, "salt", member_id)

    render(conn, :show,
      space_id: space_id,
      member_token: member_token,
      member_id: member_id,
      layout: false
    )
  end
end
