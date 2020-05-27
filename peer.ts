import { WebSocket } from "https://deno.land/std/ws/mod.ts";
import { ByteArray } from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";

export class Peer {
  socket: WebSocket;
  isClient: Boolean;
  hostname: string | null;
  port: number | null;
  isVerified: Boolean;
  publicKey: ByteArray | null;
  dateAdded: number;

  constructor(
    socket: WebSocket,
    isClient: Boolean,
    hostname?: string,
    port?: number,
    publicKey?: ByteArray,
  ) {
    this.socket = socket;
    this.isClient = isClient;
    this.hostname = hostname || null;
    this.port = port || null;
    this.isVerified = false;
    this.publicKey = publicKey || null;
    this.dateAdded = Date.now();
  }
}
