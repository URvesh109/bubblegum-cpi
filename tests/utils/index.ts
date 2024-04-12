import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import Debug from "debug";
import * as path from "path";

export const METADATA_SEED = "metadata";
export const EDITION_SEED = "edition";

export const log = Debug("log:");

export const MPL_BUBBLEGUM_PROGRAM_ID = new anchor.web3.PublicKey(
  "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY"
);

export const SPL_NOOP_PROGRAM_ID = new anchor.web3.PublicKey(
  "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"
);

export const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new anchor.web3.PublicKey(
  "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK"
);

export const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const fetchCreatorKeypair = (): anchor.web3.Keypair => {
  const creator = keypairFromFile(
    path.join(__dirname, "../../keypairs/creator.json")
  );
  log("Creator ", creator.publicKey.toBase58());
  return creator;
};

export const fetchFeePayerKeypair = (): anchor.web3.Keypair => {
  const feePayer = keypairFromFile(
    path.join(__dirname, "../../keypairs/fee-payer.json")
  );
  log("FeePayer ", feePayer.publicKey.toBase58());
  return feePayer;
};

export const fetchLeafOwnerKeypair = (): anchor.web3.Keypair => {
  const leafOwner = keypairFromFile(
    path.join(__dirname, "../../keypairs/leaf-owner.json")
  );
  log("leafOwner ", leafOwner.publicKey.toBase58());
  return leafOwner;
};

export function keypairFromFile(path: string): anchor.web3.Keypair {
  return anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(readFileSync(path).toString("utf-8")) as number[]
    )
  );
}

export async function airdrop(
  provider: anchor.AnchorProvider,
  ...addresses: anchor.web3.PublicKey[]
) {
  await Promise.all(
    addresses.map(async (address) => {
      const signature = await provider.connection.requestAirdrop(address, 10e9);
      const latestBlockHash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature,
      });
    })
  );
}

chai.use(chaiAsPromised);

export const { assert, expect } = chai;

const COMPUTE_UNITS = 500_000;

export const computeBudgetIx =
  anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: COMPUTE_UNITS,
  });
