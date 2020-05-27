import {
  hash,
  box_keyPair_fromSecretKey,
} from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { KEY_LENGTH } from "./config.ts";
import { calculateDistance, Bucket } from "./routing.ts";
import { Peer } from "./peer.ts";
import { createWebSocket } from "../../Library/Caches/deno/deps/https/deno.land/b6176dc18e9907eb0698fe98c937c935f0ede51c5251001d75ee1c02b4f277d7.ts";

const keyPairA = box_keyPair_fromSecretKey(
  hash(new TextEncoder().encode("iamalama"), KEY_LENGTH),
);

const keyPairB = box_keyPair_fromSecretKey(
  hash(new TextEncoder().encode("nici"), KEY_LENGTH),
);
