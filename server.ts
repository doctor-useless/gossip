import { serve } from "https://deno.land/std/http/server.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
} from "https://deno.land/std/ws/mod.ts";
import { verifyWork } from "./pow.ts";
import { decodeBase64ToText } from "./util.ts";

export class Server {
    port: number;

    constructor (port: number) {
        this.port = port;
    }

    async listen() {
        console.log(`websocket server is running on :${this.port}`);
        for await (const req of serve({ port: this.port})) {
            const { conn, r: bufReader, w: bufWriter, headers } = req;

            try {
                const socket = await acceptWebSocket({
                  conn,
                  bufReader,
                  bufWriter,
                  headers,
                });
            
                console.log("socket connected!");
            
                // send initial message
                //await socket.send(JSON.stringify({id: "testId"}));
            
                try {
                  for await (const ev of socket) {
                    if (typeof ev === "string") {
                      try {

                          const data = JSON.parse(ev);
                          console.log(data);

                          const verified = verifyWork(data.proofOfWork, data.publicKey);
                          console.log('verified:', verified);
                          if (!verified) {
                              socket.close();
                          } else {
                            await socket.send(JSON.stringify({verified: verified}));
                          }
                      } catch {
                          console.warn('msg not JSON', ev);
                          socket.close();
                      }
                    } else if (ev instanceof Uint8Array) {
                      // binary message
                      console.log("ws:Binary", ev);
                    } else if (isWebSocketPingEvent(ev)) {
                      const [, body] = ev;
                      // ping
                      console.log("ws:Ping", body);
                    } else if (isWebSocketCloseEvent(ev)) {
                      // close
                      const { code, reason } = ev;
                      console.log("ws:Close", code, reason);
                    }
                  }
                } catch (err) {
                  console.error(`failed to receive frame: ${err}`);
            
                  if (!socket.isClosed) {
                    await socket.close(1000).catch(console.error);
                  }
                }
              } catch (err) {
                console.error(`failed to accept websocket: ${err}`);
                await req.respond({ status: 400 });
              }
        }
    }
}