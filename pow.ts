import { randomBytes, ByteArray, hash } from "https://raw.githubusercontent.com/dr-useless/tweetnacl-deno/master/src/nacl.ts";
import { POW_DIFICULTY } from "./config.ts";

const randomBytesLength = 32;

export async function doWork(publicKey: ByteArray): Promise<ByteArray> {
    let work = ByteArray(publicKey.length + randomBytesLength);
    work.set(publicKey, randomBytesLength);
    let workHash: ByteArray;
    let random;
    do {
        random = randomBytes(randomBytesLength);
        work.set(random);
        workHash = hash(work);
    } while(!checkWorkHash(workHash))
    return random;
}

export function checkWorkHash(workHash: ByteArray): Boolean {
    for (let i = 0; i < POW_DIFICULTY; i++) {
        if (workHash[i] !== 0) {
            return false;
        }
    }
    return true;
}

export function verifyWork(work: ByteArray, publicKey: ByteArray): Boolean {
    let proofOfWork = ByteArray(publicKey.length + randomBytesLength);
    proofOfWork.set(work);
    proofOfWork.set(publicKey, randomBytesLength);
    return checkWorkHash(hash(proofOfWork));
}