import { PeerTable } from "./routing.ts";
import { ByteArray } from "https://deno.land/x/tweetnacl_deno/src/nacl.ts";
import { Peer } from "./peer.ts";
import { KEY_LENGTH } from "./config.ts";
import { decodeUint8Array } from "./util.ts";
import { randomBytes } from "../../Library/Caches/deno/deps/https/raw.githubusercontent.com/d39d22728f58f36b8975f69b08cc6e80fa0692149bdab7a0ac366b13c6dce7fa.ts";

export class Worker {
  publicKey: ByteArray;
  proofOfWork: ByteArray;
  serverPort: number;
  peerTable: PeerTable;

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
    // send request to closest peers
    let ramdomBytes = ByteArray(KEY_LENGTH);
    crypto.getRandomValues(ramdomBytes);
    const requestId = decodeUint8Array(randomBytes);
    const findPeerRequest = {
      request: {
        id: requestId,
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
    const closestPeers = await this.peerTable.getClosestPeers(publicKey);
    for await (const p of closestPeers) {
      p.socket.send(JSON.stringify(findPeerRequest));
      for await (const msg of p.socket) {
        if (typeof msg === "string") {
          try {
            const data = JSON.parse(msg);
            if (
              data.response && data.response.id === requestId &&
              data.response.peers && data.response.peers.length > 0
            ) {
              // got response
              if (
                data.response.peers[0].publicKey.toString() ===
                  publicKey.toString()
              ) {
                // found peer
                return data.response.peers[0];
              }
              // connect to new peers?
              // then
              // recursively call this function to get closer to target peer...
            }
          }
        }
      }
    }
    // listen for responses

    return undefined;

    /*for await (const msg of socket) {
      if (typeof msg === "string") {
        try {
          const data = JSON.parse(msg);

          if (data.request) {
            // handle request
          } else if (data.response) {
            // handle response
            switch (data.response.type) {
              case "find_peer":
                this.handleFindPeerResponse(data.response.body);
                break;
              default:
                console.log("unknown response", data);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    }*/
  }
}
