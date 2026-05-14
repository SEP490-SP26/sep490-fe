import * as signalR from "@microsoft/signalr";
import { env } from "process";

let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;

export async function getSignalRConnection() {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(
        `${process.env.NEXT_PUBLIC_API_ENDPOINT}/hubs/realtime`,
        //`https://localhost:7109/hubs/realtime`,
        {
          accessTokenFactory: () =>
            localStorage.getItem("token") || "",
        }
      )
      .withAutomaticReconnect()
      .build();
  }

  // ✅ Chỉ start khi disconnected
  if (connection.state === signalR.HubConnectionState.Disconnected) {
    // tránh gọi start nhiều lần cùng lúc
    if (!startPromise) {
      startPromise = connection.start()
        .then(() => {
          console.log("✅ SignalR connected");
        })
        .catch((err) => {
          console.error("❌ SignalR connect error:", err);
          throw err;
        })
        .finally(() => {
          startPromise = null;
        });
    }

    await startPromise;
  }

  return connection;
}
