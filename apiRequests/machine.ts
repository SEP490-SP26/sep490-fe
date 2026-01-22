import { Machine } from "@/lib/estimation.types";
import http from "@/lib/httpAxios";
import { FreeMachine, MachineCapacity } from "@/schemaValidations/common.schema";

export const machineApi = {
    getFreeMachines: () =>
        http.get<FreeMachine[]>("/api/Machine/free-machines"),

    getCapacity: () =>
        http.get<MachineCapacity>("/api/Machine/capacity"),

    getAllMachine: () =>
        http.get<Machine[]>("/api/Machine/get-all-machines"),
};
