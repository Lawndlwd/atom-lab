import { hash as a2hash, verify as a2verify } from "@node-rs/argon2";

const opts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return a2hash(password, opts);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await a2verify(hash, password);
  } catch {
    return false;
  }
}
