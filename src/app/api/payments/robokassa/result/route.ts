import { handleRobokassaResult } from "@/server/services/robokassa-result-handler";
import { processRobokassaResult } from "@/server/services/order-service";

export const runtime = "nodejs";
export const maxDuration = 30;

export const GET = (request: Request) =>
  handleRobokassaResult(request, processRobokassaResult);
export const POST = GET;
