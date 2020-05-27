import {
  encodeBase64,
  decodeBase64,
} from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";

export async function wait(timeout: number): Promise<void> {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res();
    }, timeout);
  });
}

export function encodeTextToBase64(input: string): string {
  return encodeBase64(new TextEncoder().encode(input));
}

export function decodeBase64ToText(input: string): string {
  return new TextDecoder().decode(decodeBase64(input));
}
