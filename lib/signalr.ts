import * as signalR from "@microsoft/signalr";
import { env } from "process";

let connection: signalR.HubConnection | null = null;
let isStarted = false;

export async function getSignalRConnection() {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(
        `${env.NEXT_PUBLIC_API_ENDPOINT}/hubs/realtime`,
        //`https://localhost:7109/hubs/realtime`,
        {
          accessTokenFactory: () =>
            localStorage.getItem("token") || "",
        }
      )
      .withAutomaticReconnect()
      .build();
  }

  if (!isStarted) {
    await connection.start();
    isStarted = true;
  }

  return connection;
}
