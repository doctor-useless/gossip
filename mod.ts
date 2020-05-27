import {
  hash,
  box_keyPair_fromSecretKey,
  ByteArray,
} from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { doWork, verifyWork } from "./pow.ts";
import { Server } from "./server.ts";
import { Client } from "./client.ts";
import { SERVER_PORT, KEY_LENGTH } from "./config.ts";
import { PeerTable } from "./routing.ts";

const keyPair = box_keyPair_fromSecretKey(
  hash(new TextEncoder().encode(Deno.args[0]), KEY_LENGTH),
);
let proofOfWork = await doWork(keyPair.publicKey);

const serverPort = Number.parseInt(Deno.args[1]) || SERVER_PORT;

// init peer table
let peerTable = new PeerTable(keyPair.publicKey);

// init server
let server = new Server(
  serverPort,
  keyPair.publicKey,
  proofOfWork,
  peerTable,
);
server.listen();

// init client
let client = new Client(
  serverPort,
  keyPair.publicKey,
  proofOfWork,
  peerTable,
);
if (Deno.args[2] && Deno.args[3]) {
  client.connect(Deno.args[2], Number.parseInt(Deno.args[3]));
}
