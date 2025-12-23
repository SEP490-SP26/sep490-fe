import http from "@/lib/httpAxios";
import { NearestDeliveryResponse } from "@/schemaValidations/common.schema";

export const productionsApi = {
    getNearestDelivery: () =>
        http.get<NearestDeliveryResponse>("/api/productions/nearest-delivery"),

    getAllProcessTypes: () =>
        http.get<string[]>("/api/productions/get-all-process-type"),
};
