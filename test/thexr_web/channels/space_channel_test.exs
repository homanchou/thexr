defmodule ThexrWeb.SpaceChannelTest do
  use ThexrWeb.ChannelCase

  setup do
    {:ok, _, socket} =
      ThexrWeb.UserSocket
      |> socket("user_id", %{some: :assign})
      |> subscribe_and_join(ThexrWeb.SpaceChannel, "space:lobby")

    %{socket: socket}
  end

  # test "shout broadcasts to space:lobby", %{socket: socket} do
  #   push(socket, "shout", %{"hello" => "all"})
  #   assert_broadcast "shout", %{"hello" => "all"}
  # end
end
