import {
  encodeBase64,
  decodeBase64,
} from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { Peer } from "./peer.ts";

async function wait(): Promise<void> {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res();
    }, 1000);
  });
}

export function encodeTextToBase64(input: string): string {
  return encodeBase64(new TextEncoder().encode(input));
}

export function decodeBase64ToText(input: string): string {
  return new TextDecoder().decode(decodeBase64(input));
}
