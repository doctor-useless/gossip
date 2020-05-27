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
import { PeerTable } from "./routing.ts";

export class Client {
  serverPort: number;
  publicKey: ByteArray;
  proofOfWork: ByteArray;
  peerTable: PeerTable;

  constructor(
    serverPort: number,
    publicKey: ByteArray,
    proofOfWork: ByteArray,
    peerTable: PeerTable,
  ) {
    this.publicKey = publicKey;
    this.proofOfWork = proofOfWork;
    this.serverPort = serverPort;
    this.peerTable = peerTable;
  }

  async connect(
    hostname: string,
    port: number,
  ) {
    try {
      const socket = await connectWebSocket(`${hostname}:${port}`);
      const peer = new Peer(socket, false, hostname, port);

      if (await this.shakeHand(peer) === false) {
        socket.close();
        console.log(red("handshake failed"));
        return;
      }

      await this.peerTable.addPeer(peer);

      // wait for peer table
      await this.receivePeerList(socket);

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
        // remove peer
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

  async receivePeerList(socket: WebSocket): Promise<void> {
    for await (const msg of socket) {
      if (typeof msg === "string") {
        try {
          const peerList: Peer[] = JSON.parse(msg);

          console.log(
            (socket.conn.remoteAddr as Deno.NetAddr).port,
            "got peer list",
          );

          if (peerList) {
            peerList.forEach((peer) => {
              // if not self, add peer to own table
              if (
                peer.publicKey !== this.publicKey && peer.hostname &&
                peer.port && !this.peerTable.hasPeer(peer)
              ) {
                console.log(
                  "dont have",
                  peer.port,
                  peer.publicKey,
                  "connecting...",
                );
                this.connect(
                  (peer.hostname as string),
                  (peer.port as number),
                );
              }
            });
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
}
