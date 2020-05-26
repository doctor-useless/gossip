import { ByteArray } from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { Peer } from "./peer.ts";

export class Route {
  publicKey: ByteArray;
  address: string;

  constructor(publicKey: ByteArray, address: string) {
    this.publicKey = publicKey;
    this.address = address;
  }
}

export class RoutingTable {
  routes: Route[];

  constructor(routes?: Route[]) {
    this.routes = routes || [];
  }

  addPeer(peer: Peer) {
    const newRoute = new Route(
      (peer.publicKey as ByteArray),
      (peer.address as string),
    );
    if (
      !this.routes.find((route) =>
        [...route.publicKey] === [...newRoute.publicKey] ||
        route.address === newRoute.address
      )
    ) {
      this.routes.push(newRoute);
    }
  }

  removePeer(peer: Peer) {
    const route = this.routes.find((route) =>
      [...route.publicKey] === [...(peer.publicKey as ByteArray)] ||
      route.address === peer.address
    );
    if (route) {
      this.routes.splice(this.routes.indexOf(route), 1);
    } else {
      console.log("route not found");
    }
  }

  merge(routingTable: RoutingTable) {
    routingTable.routes.forEach((newRoute) => {
      if (
        !this.routes.find((route) =>
          [...route.publicKey] === [...newRoute.publicKey] ||
          route.address === newRoute.address
        )
      ) {
        this.routes.push(newRoute);
      }
    });
  }
}
