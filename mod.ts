import {
  hash,
  box_keyPair_fromSecretKey,
} from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { doWork } from "./pow.ts";
import { SERVER_PORT, KEY_LENGTH } from "./config.ts";
import { PeerTable } from "./routing.ts";
import { Worker } from "./worker.ts";

const keyPair = box_keyPair_fromSecretKey(
  hash(new TextEncoder().encode(Deno.args[0]), KEY_LENGTH),
);
let proofOfWork = await doWork(keyPair.publicKey);

const serverPort = Number.parseInt(Deno.args[1]) || SERVER_PORT;

// init peer table
let peerTable = new PeerTable(keyPair.publicKey);

// init worker
let worker = new Worker(keyPair.publicKey, proofOfWork, serverPort, peerTable);

if (Deno.args[2] && Deno.args[3]) {
  const firstPeer = await worker.client.connect(
    Deno.args[2],
    Number.parseInt(Deno.args[3]),
  );
  if (firstPeer) {
    worker.peerTable.addPeer(firstPeer);
  }
}

// test
if (serverPort === 3001) {
  const keyPairTest = box_keyPair_fromSecretKey(
    hash(new TextEncoder().encode("iamalama4"), KEY_LENGTH),
  );
  const peerSearch = await worker.initiatePeerSearch(keyPairTest.publicKey);
  console.log("peer search", peerSearch?.port);
}
