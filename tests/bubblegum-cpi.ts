import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BubblegumCpi } from "../target/types/bubblegum_cpi";
import { getMerkleTreeSize } from "@metaplex-foundation/mpl-bubblegum";
import {
  EDITION_SEED,
  METADATA_SEED,
  MPL_BUBBLEGUM_PROGRAM_ID,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  airdrop,
  computeBudgetIx,
  fetchCreatorKeypair,
  fetchFeePayerKeypair,
  log,
} from "./utils";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

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

    log("Create Bubblegum tree", txId);

    const uri = "https://example.com/my-collection.json";
    const name = "My Collection";

    const collectionMint = anchor.web3.Keypair.generate();
    log("collectionMint", collectionMint.publicKey.toBase58());

    const tokenMetadata = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    log("tokenMetadata ", tokenMetadata.toBase58());

    const masterEdition = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.publicKey.toBuffer(),
        Buffer.from(EDITION_SEED),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    log("masterEdition ", masterEdition.toBase58());

    const ata = await getAssociatedTokenAddress(
      collectionMint.publicKey,
      creator.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    log("Ata ", ata.toBase58());

    try {
      let colTxId = await program.methods
        .createCollectionNft(uri, name)
        .accounts({
          collectionMint: collectionMint.publicKey,
          payer: creator.publicKey,
          wallet: creator.publicKey,
          tokenMetadata,
          masterEdition,
          associatedToken: ata,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .preInstructions([computeBudgetIx])
        .signers([creator, collectionMint])
        .rpc();
      log("Create collection mint", colTxId);
    } catch (error) {
      log("Error ", error);
    }
  });
});
