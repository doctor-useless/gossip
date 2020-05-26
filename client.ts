import {
  connectWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  isWebSocketPongEvent,
  WebSocket,
} from "https://deno.land/std/ws/mod.ts";
import { blue, green, red, yellow } from "https://deno.land/std/fmt/colors.ts";
import { ByteArray } from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { verifyWork } from "./pow.ts";
import { Peer } from "./peer.ts";
import { RoutingTable } from "./routing.ts";

export class Client {
  peers: Peer[];
  publicKey: ByteArray;
  proofOfWork: ByteArray;
  serverPort: number;
  routingTable: RoutingTable;

  constructor(
    publicKey: ByteArray,
    proofOfWork: ByteArray,
    serverPort: number,
    routingTable: RoutingTable,
  ) {
    this.peers = [];
    this.publicKey = publicKey;
    this.proofOfWork = proofOfWork;
    this.serverPort = serverPort;
    this.routingTable = routingTable;
  }

  async addConnection(
    address: string, /*, messagesOut: AsyncIterableIterator<any>*/
  ) {
    try {
      const socket = await connectWebSocket(address);
      const peer = new Peer(socket, address /*, messagesOut*/);

      if (await this.shakeHand(peer) === false) {
        socket.close();
        console.log(red("handshake failed"));
        return;
      }

      // wait for routing table
      await this.receiveRoutingTable(peer);

      this.addPeer(peer);

      this.listenForMore(peer);

      console.log(green("ws connected!"));
    } catch (err) {
      console.error(red(`Could not connect to WebSocket: '${err}'`));
    }
  }

  async listenForMore(peer: Peer): Promise<void> {
    for await (const ev of peer.socket) {
      console.log(ev);
      if (isWebSocketCloseEvent(ev)) {
        this.removePeer(peer);
      }
    }
  }

  async shakeHand(peer: Peer): Promise<Boolean> {
    // initiate handshake
    await peer.socket.send(
      JSON.stringify(
        {
          publicKey: [...this.publicKey],
          proofOfWork: [...this.proofOfWork],
          serverPort: this.serverPort,
        },
      ),
    );

    for await (const msg of peer.socket) {
      if (typeof msg === "string") {
        try {
          const data = JSON.parse(msg);
          if (
            data.proofOfWork && data.publicKey &&
            verifyWork(data.proofOfWork, data.publicKey)
          ) {
            peer.isVerified = true;
            peer.publicKey = data.publicKey;
            return true;
          } else {
            return false;
          }
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  async receiveRoutingTable(peer: Peer): Promise<void> {
    for await (const msg of peer.socket) {
      if (typeof msg === "string") {
        try {
          const data = JSON.parse(msg);
          if (data.routes && data.routes.length > 0) {
            this.routingTable.merge(new RoutingTable(data.routes));
            return;
          } else {
            return;
          }
        } catch {
          return;
        }
      }
    }
    return;
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
