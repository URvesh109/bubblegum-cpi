import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BubblegumCpi } from "../target/types/bubblegum_cpi";
import { getMerkleTreeSize } from "@metaplex-foundation/mpl-bubblegum";
import {
  airdrop,
  fetchCreatorKeypair,
  fetchFeePayerKeypair,
  log,
} from "./utils";

const MPL_BUBBLEGUM_PROGRAM_ID = new anchor.web3.PublicKey(
  "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY"
);

const SPL_NOOP_PROGRAM_ID = new anchor.web3.PublicKey(
  "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"
);

const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new anchor.web3.PublicKey(
  "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK"
);

describe("bubblegum-cpi", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BubblegumCpi as Program<BubblegumCpi>;

  it("Is initialized tree!", async () => {
    const maxDepth = 3;
    const maxBufferSize = 8;

    const creator = fetchCreatorKeypair();
    log("Creator ", creator.publicKey.toBase58());
    const feePayer = fetchFeePayerKeypair();
    log("feePayer", feePayer.publicKey.toBase58());

    await airdrop(provider, creator.publicKey, feePayer.publicKey);

    const merkleTree = anchor.web3.Keypair.generate();
    log("MerkleTree", merkleTree.publicKey.toBase58());

    const merkleTreeSize = getMerkleTreeSize(maxDepth, maxBufferSize);

    const [treeAuthority, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [merkleTree.publicKey.toBuffer()],
      MPL_BUBBLEGUM_PROGRAM_ID
    );
    log("treeAuthority", treeAuthority.toBase58());

    const txId = await program.methods
      .createTree(maxDepth, maxBufferSize, null)
      .preInstructions([
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: creator.publicKey,
          newAccountPubkey: merkleTree.publicKey,
          lamports: await provider.connection.getMinimumBalanceForRentExemption(
            merkleTreeSize
          ),
          space: merkleTreeSize,
          programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        }),
      ])
      .accounts({
        treeAuthority,
        merkleTree: merkleTree.publicKey,
        payer: feePayer.publicKey,
        treeCreator: creator.publicKey,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        mplBubblegumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([merkleTree, creator, feePayer])
      .rpc();

    console.log("Transaction id ", txId);
  });
});
