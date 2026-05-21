import * as signalR from "@microsoft/signalr";

/** Hub group role khớp BE: RealtimeGroups.ByRole("production manager") */
export const PRODUCTION_MANAGER_HUB_ROLE = "production manager";

/** Các event SendAsync mà BE bắn cho production manager */
export const PRODUCTION_MANAGER_SIGNALR_EVENTS = [
  "scheduled",
  "approved-production",
  "production-ready-cancelled",
  "finishedProduction",
  "PendingPaid",
  "Paid",
  "group-production",
  "production",
  "update-ui",
] as const;

let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;
let joinedProductionGroup = false;

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

  if (!joinedProductionGroup) {
    joinedProductionGroup = true;
    await connection
      .invoke("JoinByRole", PRODUCTION_MANAGER_HUB_ROLE)
      .catch((err) => {
        joinedProductionGroup = false;
        console.error("❌ SignalR JoinByRole error:", err);
      });
  }

  return connection;
}
