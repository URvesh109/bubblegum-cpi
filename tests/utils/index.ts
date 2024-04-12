import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import Debug from "debug";
import * as path from "path";
import { Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import {
  RequestPayload,
  ResponseData,
  EstimatePriorityFeesParams,
} from "./types";

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

export const computeBudgetIx = (units = COMPUTE_UNITS) =>
  anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units,
  });

export async function getSimulationUnits(
  connection: anchor.web3.Connection,
  instructions: anchor.web3.TransactionInstruction[],
  payer: anchor.web3.PublicKey
): Promise<number | undefined> {
  const testInstructions = [
    anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: COMPUTE_UNITS,
    }),
    ...instructions,
  ];

  const testVersionedTxn = new anchor.web3.VersionedTransaction(
    new anchor.web3.TransactionMessage({
      instructions: testInstructions,
      payerKey: payer,
      recentBlockhash: anchor.web3.PublicKey.default.toString(),
    }).compileToV0Message()
  );

  const simulation = await connection.simulateTransaction(testVersionedTxn, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  if (simulation.value.err) {
    return undefined;
  }

  return simulation.value.unitsConsumed;
}

export async function fetchEstimatePriorityFees({
  last_n_blocks,
  account,
  endpoint,
}: EstimatePriorityFeesParams): Promise<ResponseData> {
  const params: any = {};
  if (last_n_blocks !== undefined) {
    params.last_n_blocks = last_n_blocks;
  }
  if (account !== undefined) {
    params.account = account;
  }

  const payload: RequestPayload = {
    method: "qn_estimatePriorityFees",
    params,
    id: 1,
    jsonrpc: "2.0",
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: ResponseData = (await response.json()) as ResponseData;
  return data;
}
