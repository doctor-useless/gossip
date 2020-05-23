import { Server } from "./server.ts";
import { SERVER_PORT } from "./config.ts";

// init server
let server = new Server(Number.parseInt(Deno.args[0]) || SERVER_PORT);
server.listen();