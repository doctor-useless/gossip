import {
  connectWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  isWebSocketPongEvent,
  WebSocket
} from "https://deno.land/std/ws/mod.ts";
import { blue, green, red, yellow } from "https://deno.land/std/fmt/colors.ts";
import { ByteArray } from "https://raw.githubusercontent.com/doctor-useless/tweetnacl-deno/master/src/nacl.ts";
import { encodeTextToBase64 } from "./util.ts";

class PeerConnection {
  socket: WebSocket;
  endpoint: string;
  //messagesOut: AsyncIterableIterator<any>;

  constructor (socket: WebSocket, endpoint: string /*, messagesOut: AsyncIterableIterator<any>*/) {
    this.socket = socket;
    this.endpoint = endpoint;
    //this.messagesOut = messagesOut;
  }
}

export class Client {
  peerConnections: PeerConnection[];
  publicKey: ByteArray;
  proofOfWork: ByteArray;

  constructor (publicKey: ByteArray, proofOfWork: ByteArray) {
    this.peerConnections = [];
    this.publicKey = publicKey;
    this.proofOfWork = proofOfWork;
  }

  async addConnection(endpoint: string /*, messagesOut: AsyncIterableIterator<any>*/) {
    try {
      const socket = await connectWebSocket(endpoint);
      const connection = new PeerConnection(socket, endpoint /*, messagesOut*/);
      this.peerConnections.push(connection);

      this.listen(connection);

      let initialMessage = JSON.stringify({publicKey: [...this.publicKey], proofOfWork: [...this.proofOfWork]});
      socket.send(initialMessage);

      console.log(green("ws connected!"));
    } catch (err) {
      console.error(red(`Could not connect to WebSocket: '${err}'`));
    }
  }

  async listen(connection: PeerConnection) {
    const handleMessagesIn = async (): Promise<void> => {
      for await (const msg of connection.socket) {
        if (typeof msg === "string") {
          try {
            const json = JSON.parse(msg);
            console.log(yellow(JSON.stringify(json)));
          } catch {
            // just text
            console.log(yellow(`< ${msg}`));
          }
        } else if (isWebSocketPingEvent(msg)) {
          console.log(blue("< ping"));
        } else if (isWebSocketPongEvent(msg)) {
          console.log(blue("< pong"));
        } else if (isWebSocketCloseEvent(msg)) {
          console.log(red(`closed: code=${msg.code}, reason=${msg.reason}`));
        }
      }
    };

    /*const handleMessagesOut = async (): Promise<void> => {
      for await (const msg of connection.messagesOut) {
        console.log(red('message out:'), msg);
        if (typeof msg === "string") {
          connection.socket.send(msg);
        } else {
          connection.socket.send(JSON.stringify(msg));
        }
      }
    };*/

    //await Promise.race([handleMessagesIn(), handleMessagesOut()]).catch(console.error);
    await handleMessagesIn();

    if (!connection.socket.isClosed) {
      await connection.socket.close(1000).catch(console.error);
    }
  }
}