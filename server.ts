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
import { PeerTable } from "./routing.ts";

export class Server {
  port: number;
  publicKey: ByteArray;
  proofOfWork: ByteArray;
  peerTable: PeerTable;

  constructor(
    port: number,
    publicKey: ByteArray,
    proofOfWork: ByteArray,
    peerTable: PeerTable,
  ) {
    this.port = port;
    this.publicKey = publicKey;
    this.proofOfWork = proofOfWork;
    this.peerTable = peerTable;
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
      const peer = new Peer(
        socket,
        true,
        `ws://${(conn.remoteAddr as Deno.NetAddr).hostname}`,
      );

      // exchange keys & poof of work
      if (await this.shakeHand(peer) === false) {
        if (!socket.isClosed) {
          socket.close();
        }
        console.log(red("handshake failed"));
        return;
      }

      await this.sendPeerList(socket);

      await this.peerTable.addPeer(peer);

      //await this.listenForMore(socket);
    } catch (err) {
      console.error(`failed to accept websocket: ${err}`);
      await req.respond({ status: 400 });
    }
  }

  async shakeHand(peer: Peer): Promise<Boolean> {
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
            peer.port = data.serverPort;
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
            return false;
          }
        } catch (err) {
          console.error(err);
          return false;
        }
      }
    }
    return false;
  }

  async sendPeerList(socket: WebSocket): Promise<void> {
    await socket.send(JSON.stringify(this.peerTable.getPeerList()));
  }

  /*async listenForMore(socket: WebSocket): Promise<void> {
    for await (const msg of socket) {
      if (typeof msg === "string") {
        try {
          const data = JSON.parse(msg);

          if (data.request) {
            // handle request
            switch (data.request.type) {
              case "find_peer":
                await socket.send(
                  JSON.stringify(
                    {
                      response: {
                        type: "find_peer",
                        body: [
                          ...await this.peerTable.findPeer(
                            data.request.params.publicKey,
                          ),
                        ],
                      },
                    },
                  ),
                );
              default:
                console.log(msg);
            }
          } else if (data.response) {
            // handle response
          }
        } catch (err) {
          console.log("bad request", err, msg);
        }
      }
    }
  }*/
}
