import { serve, ServerRequest } from "https://deno.land/std/http/server.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket,
} from "https://deno.land/std/ws/mod.ts";
import { verifyWork } from "./pow.ts";
import { ByteArray } from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { Peer } from "./peer.ts";
import { blue, green, red, yellow } from "https://deno.land/std/fmt/colors.ts";
import { RoutingTable } from "./routing.ts";

export class Server {
  port: number;
  publicKey: ByteArray;
  proofOfWork: ByteArray;
  routingTable: RoutingTable;
  peers: Peer[];

  constructor(
    port: number,
    publicKey: ByteArray,
    proofOfWork: ByteArray,
    routingTable: RoutingTable,
  ) {
    this.port = port;
    this.publicKey = publicKey;
    this.proofOfWork = proofOfWork;
    this.routingTable = routingTable;
    this.peers = [];
  }

  async listen() {
    console.log(`websocket server is running on :${this.port}`);
    for await (const req of serve({ port: this.port })) {
      this.handleRequest(req);
    }
  }

  async handleRequest(req: ServerRequest): Promise<void> {
    const { conn, r: bufReader, w: bufWriter, headers } = req;

    try {
      const socket = await acceptWebSocket({
        conn,
        bufReader,
        bufWriter,
        headers,
      });
      const peer = new Peer(socket);

      // exchange keys & poof of work
      if (await this.shakeHand(peer, conn) === false) {
        peer.socket.close();
        console.log(red("handshake failed"));
        return;
      }

      await this.sendRoutingTable(peer);

      this.addPeer(peer);

      await this.listenForMore(peer);
    } catch (err) {
      console.error(`failed to accept websocket: ${err}`);
      await req.respond({ status: 400 });
    }
  }

  async shakeHand(peer: Peer, conn: Deno.Conn): Promise<Boolean> {
    // wait for initial message
    for await (const ev of peer.socket) {
      if (typeof ev === "string") {
        try {
          const data = JSON.parse(ev);
          if (
            data.proofOfWork && data.publicKey && data.serverPort &&
            verifyWork(data.proofOfWork, data.publicKey)
          ) {
            peer.isVerified = true;
            peer.publicKey = data.publicKey;
            peer.address = `ws://${
              (conn.remoteAddr as Deno.NetAddr).hostname
            }:${data.serverPort}`;
            await peer.socket.send(
              JSON.stringify(
                {
                  publicKey: [...this.publicKey],
                  proofOfWork: [...this.proofOfWork],
                },
              ),
            );
            return true;
          } else {
            console.log(red("verification failed"));
            return false;
          }
        } catch {
          console.warn("msg not JSON", ev);
          return false;
        }
      }
    }
    return false;
  }

  async sendRoutingTable(peer: Peer): Promise<void> {
    await peer.socket.send(JSON.stringify(this.routingTable));
  }

  async listenForMore(peer: Peer): Promise<void> {
    for await (const ev of peer.socket) {
      console.log(ev);
      if (isWebSocketCloseEvent(ev)) {
        this.removePeer(peer);
      }
    }
  }

  addPeer(peer: Peer) {
    this.peers.push(peer);
    this.routingTable.addPeer(peer);
    console.log("peer added", peer.address, this.routingTable);
  }

  removePeer(peer: Peer) {
    this.peers.splice(this.peers.indexOf(peer), 1);
    this.routingTable.removePeer(peer);
    console.log("peer removed", peer.address, this.routingTable);
  }
}
