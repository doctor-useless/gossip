import {
  hash,
  box_keyPair_fromSecretKey,
  ByteArray,
} from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { doWork, verifyWork } from "./pow.ts";
import { Server } from "./server.ts";
import { Client } from "./client.ts";
import { SERVER_PORT } from "./config.ts";
import { RoutingTable } from "./routing.ts";

const keyPair = box_keyPair_fromSecretKey(
  hash(new TextEncoder().encode(Deno.args[0]), 32),
);
let proofOfWork = await doWork(keyPair.publicKey);

const serverPort = Number.parseInt(Deno.args[1]) || SERVER_PORT;

// init routing table
let routingTable = new RoutingTable();

// init server
let server = new Server(
  serverPort,
  keyPair.publicKey,
  proofOfWork,
  routingTable,
);
server.listen();

// init client
let client = new Client(
  keyPair.publicKey,
  proofOfWork,
  serverPort,
  routingTable,
);
if (Deno.args[2]) {
  client.addConnection(Deno.args[2]); // || `ws://127.0.0.1:${SERVER_PORT}`);
}
