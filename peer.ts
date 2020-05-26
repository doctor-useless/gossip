import { WebSocket } from "https://deno.land/std/ws/mod.ts";
import { ByteArray } from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";

export class Peer {
  socket: WebSocket;
  address: string | null;
  isVerified: Boolean;
  publicKey: ByteArray | null;
  //messagesOut: AsyncIterableIterator<any>;

  constructor(
    socket: WebSocket,
    address?: string,
    publicKey?: ByteArray,
    /*, messagesOut: AsyncIterableIterator<any>*/
  ) {
    this.socket = socket;
    this.address = address || null;
    this.isVerified = false;
    this.publicKey = publicKey || null;
    //this.messagesOut = messagesOut;
  }
}

export class PeerList {
  peers: Peer[];

  constructor(peers?: Peer[]) {
    this.peers = peers || [];
  }
}
