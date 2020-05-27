import {
  WebSocket,
  isWebSocketPongEvent,
} from "https://deno.land/std/ws/mod.ts";
import { ByteArray } from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { Peer } from "./peer.ts";
import { KEY_LENGTH, BUCKET_SIZE_MAX, PING_TIMEOUT } from "./config.ts";
import { wait } from "./util.ts";

export class Bucket {
  peers: Peer[];

  constructor() {
    this.peers = [];
  }
}

export class PeerTable {
  publicKey: ByteArray;
  buckets: Bucket[];

  constructor(publicKey: ByteArray) {
    this.publicKey = publicKey;
    this.buckets = [];
    for (let i = 1; i < KEY_LENGTH * 8; i++) {
      this.buckets.push(new Bucket());
    }
  }

  async addPeer(newPeer: Peer): Promise<Boolean> {
    // choose bucket
    const distance = calculateDistance(
      this.publicKey,
      (newPeer.publicKey as ByteArray),
    );
    const bucket = this.buckets[distance];
    if (
      bucket.peers.find((p) =>
        p.publicKey?.toString() === newPeer.publicKey?.toString()
      ) === undefined
    ) {
      if (bucket.peers.length < BUCKET_SIZE_MAX) {
        bucket.peers.push(newPeer);
      } else { // bucket full, drop worst peer
        const worstPeer = await getWorstPeer(bucket);
        if (worstPeer) {
          if (!worstPeer.socket.isClosed) {
            try {
              worstPeer.socket.close();
            } catch {
            }
          }
          bucket.peers.splice(bucket.peers.indexOf(worstPeer), 1);
          bucket.peers.push(newPeer);
          console.log(
            "peer added to bucket",
            distance,
            bucket.peers.map((p) => p.port),
          );
          return true;
        } else {
          console.log("no bad peer in bucket");
          return false;
        }
      }
    }
    console.log(
      "peer already in bucket",
      distance,
      bucket.peers.map((p) => p.port),
    );
    return false;
  }

  getPeerList(): Peer[] {
    let list: Peer[] = [];
    this.buckets.forEach((bucket) => {
      bucket.peers.forEach((peer) => {
        list.push(peer);
      });
    });
    return list;
  }

  hasPeer(peer: Peer): Boolean {
    let distance = calculateDistance(
      this.publicKey,
      (peer.publicKey as ByteArray),
    );
    return this.buckets[distance].peers.find((p) =>
      p.publicKey?.toString() === peer.publicKey?.toString()
    ) !== undefined;
  }
}

/**
 * Returns the distance between two addresses
 * This is the MSB first numerical value of their XOR.
 */
export function calculateDistance(
  publicKeyA: Uint8Array,
  publicKeyB: Uint8Array,
): number {
  let bufferA: SharedArrayBuffer = new SharedArrayBuffer(1);
  let a = new Uint8Array(bufferA);
  let bufferB: SharedArrayBuffer = new SharedArrayBuffer(1);
  let b = new Uint8Array(bufferB);
  a.set([publicKeyA[0]], 0);
  b.set([publicKeyB[0]], 0);
  Atomics.xor(a, 0, b[0]);
  return a[0];
}

/**
 * Returns youngest peer found to be offline
 * If all peers are online, returns undefined
 * @param bucket
 */
export async function getWorstPeer(bucket: Bucket): Promise<Peer | undefined> {
  let offlinePeers: Peer[] = [];
  let onlinePeers: Peer[] = [];

  for await (let p of bucket.peers) {
    if (!p.socket || !p.socket.isClosed || !(await isOnline(p.socket))) {
      offlinePeers.push(p);
    } else {
      onlinePeers.push(p);
    }
  }

  if (offlinePeers.length > 0) {
    return offlinePeers.sort((a, b) => b.dateAdded - a.dateAdded)[0];
  }
  return undefined;
}

async function isOnline(socket: WebSocket): Promise<Boolean> {
  // ping him
  socket.ping();
  const pingPromise = async () => {
    for await (const ev of socket) {
      if (isWebSocketPongEvent(ev)) {
        return true;
      }
    }
  };
  await Promise.race([pingPromise, wait(PING_TIMEOUT)]);
  return false;
}
