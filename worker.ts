import { PeerTable } from "./routing.ts";
import {
  ByteArray,
  randomBytes,
} from "https://deno.land/x/tweetnacl_deno/src/nacl.ts";
import { Peer } from "./peer.ts";
import { KEY_LENGTH } from "./config.ts";
import { decodeUint8Array } from "./util.ts";
import { Client } from "./client.ts";
import { Server } from "./server.ts";

export class Worker {
  publicKey: ByteArray;
  proofOfWork: ByteArray;
  serverPort: number;
  peerTable: PeerTable;
  server: Server;
  client: Client;

  constructor(
    publicKey: ByteArray,
    proofOfWork: ByteArray,
    serverPort: number,
    peerTable: PeerTable,
  ) {
    this.publicKey = publicKey;
    this.proofOfWork = proofOfWork;
    this.serverPort = serverPort;
    this.peerTable = peerTable;
    this.server = new Server(serverPort, publicKey, proofOfWork, peerTable);
    this.server.listen();
    this.client = new Client(serverPort, publicKey, proofOfWork, peerTable);
  }

  /**
    * Find any peer in the network
    * @param publicKey id of target peer
    * @param peerTable
  */
  async initiatePeerSearch(publicKey: ByteArray): Promise<Peer | undefined> {
    // look in peer table
    const peer = await this.peerTable.findPeer(publicKey);
    if (peer) {
      return peer;
    }
    const closestPeers = await this.peerTable.getClosestPeers(publicKey);
    console.log("sending to", closestPeers.map((p) => p.port));
    const searchResult = await this.sendFindPeerRequests(
      publicKey,
      closestPeers,
    );
    if (searchResult && searchResult.length > 0) {
      return searchResult[0];
    }
    return undefined;
  }

  generateFindPeerRequestBody(publicKey: ByteArray): any {
    return {
      request: {
        id: decodeUint8Array(randomBytes(KEY_LENGTH)),
        type: "find_peer",
        params: {
          publicKey: [...publicKey],
        },
        origin: {
          publicKey: [...this.publicKey],
          proofOfWork: [...this.proofOfWork],
          serverPort: this.serverPort,
        },
      },
    };
  }

  async sendFindPeerRequests(
    publicKey: ByteArray,
    closestPeers: Peer[],
    previousPeers?: Peer[],
  ): Promise<Peer[] | undefined> {
    for await (const p of closestPeers) {
      const requestBody = this.generateFindPeerRequestBody(publicKey);
      p.socket.send(JSON.stringify(requestBody));
      for await (const msg of p.socket) {
        if (typeof msg === "string") {
          try {
            const data = JSON.parse(msg);
            if (
              data.response && data.response.id === requestBody.request.id
            ) {
              // got response
              console.log(data.response.peers.map((p: any) => p.port));
              if (!data.response.peers || data.response.peers.length < 1) {
                return undefined;
              }
              if (
                data.response.peers[0].publicKey.toString() ===
                  publicKey.toString()
              ) {
                // found peer
                return [data.response.peers[0]];
              }
              // make peers into real peers with sockets, then call myself...
              const peers: Peer[] = [];
              for await (const p of data.response.peers) {
                // connect, add returned peer to list
                const isAlreadyInTable =
                  this.peerTable.findPeer(p.publicKey) !== undefined;
                const isAlreadyInList = previousPeers?.find((prev) =>
                  prev.publicKey?.toString() === p.publicKey.toString()
                ) !== undefined;
                if (
                  p.hostname && p.port &&
                  !isAlreadyInTable &&
                  !isAlreadyInList &&
                  p.publicKey.toString() !== this.publicKey.toString()
                ) {
                  const newPeer = await this.client.connect(
                    p.hostname,
                    p.port,
                  );
                  if (newPeer) {
                    peers.push(newPeer);
                    previousPeers = previousPeers || [];
                    previousPeers.push(newPeer);
                  } else {
                    console.log("connection failed", p.hostname, p.port);
                  }
                } else {
                  console.log(
                    "peer not valid",
                    p.port,
                    isAlreadyInTable,
                    isAlreadyInList,
                  );
                }
              }
              return await this.sendFindPeerRequests(
                publicKey,
                peers,
                previousPeers,
              );
            }
          } catch (err) {
            console.log("invalid msg", err);
          }
        }
      }
    }
  }
}
