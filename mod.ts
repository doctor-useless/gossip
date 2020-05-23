import { hash, box_keyPair_fromSecretKey, ByteArray } from "https://raw.githubusercontent.com/doctor-useless/tweetnacl-deno/master/src/nacl.ts";
import { doWork, verifyWork } from "./pow.ts";
import { Server } from "./server.ts";
import { Client } from "./client.ts";
import { SERVER_PORT } from "./config.ts";

const keyPair = box_keyPair_fromSecretKey(
    hash(new TextEncoder().encode("i am a lamaddddddddddddddddd"), 32)
);

const anotherKeyPair = box_keyPair_fromSecretKey(
    hash(new TextEncoder().encode("iamalama"), 32)
);

let proofOfWork = await doWork(keyPair.publicKey);


// init client
let client = new Client(keyPair.publicKey, proofOfWork);
client.addConnection(Deno.args[1] || `ws://127.0.0.1:${SERVER_PORT}`);