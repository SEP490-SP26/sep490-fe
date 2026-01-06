import http from "@/lib/httpAxios";
import { NearestDeliveryResponse } from "@/schemaValidations/common.schema";
import { start } from "repl";

export const productionsApi = {
  getNearestDelivery: () =>
    http.get<NearestDeliveryResponse>("/api/productions/nearest-delivery"),

  getAllProcessTypes: () =>
    http.get<string[]>("/api/productions/get-all-process-type"),
  getAllProduction: () => http.get("/api/productions/get-all-production"),

  getProdyctionByOrderId: (id: string) =>
    http.get(`/api/Productions/detail/${id}`),

  startProduction: (orderId: string) =>
    http.post(`/api/Productions/start/${orderId}`, { orderId }),
};
