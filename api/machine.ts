import http from "@/lib/httpAxios";
import { FreeMachine, MachineCapacity } from "@/schemaValidations/common.schema";

export const machineApi = {
    getFreeMachines: () =>
        http.get<FreeMachine[]>("/api/Machine/free-machines"),

    getCapacity: () =>
        http.get<MachineCapacity>("/api/Machine/capacity"),
};

export const config = {
  runtime: 'edge',
}