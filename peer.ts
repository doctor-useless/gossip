import {
  WebSocket,
  isWebSocketPongEvent,
  connectWebSocket,
} from "https://deno.land/std/ws/mod.ts";
import { ByteArray } from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { PING_TIMEOUT } from "./config.ts";
import { wait } from "./util.ts";

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

  async isOnline(): Promise<Boolean> {
    if (this.socket.isClosed && this.isVerified) {
      // try to reconnect
      try {
        this.socket = await connectWebSocket(`${this.hostname}:${this.port}`);
      } catch {
        return false;
      }
    }
    // ping him
    const pingPromise = async () => {
      for await (const ev of this.socket) {
        if (isWebSocketPongEvent(ev)) {
          return true;
        }
      }
    };
    this.socket.ping();
    return await Promise.race([pingPromise, wait(PING_TIMEOUT)]) !== undefined;
  }
}
