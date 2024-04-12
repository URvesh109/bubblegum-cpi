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
  fetchLeafOwnerKeypair,
  getSimulationUnits,
  log,
} from "./utils";
import {
  // TOKEN_2022_PROGRAM_ID, mpl_bubblegum program dosen't support yet
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import Debug from "debug";

const computeLog = Debug("compute:");
const txIdLog = Debug("txId:");

describe("bubblegum-cpi", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BubblegumCpi as Program<BubblegumCpi>;

  it("Is initialized tree!", async () => {
    const maxDepth = 3;
    const maxBufferSize = 8;

    const creator = fetchCreatorKeypair();

    const feePayer = fetchFeePayerKeypair();

    const leafOwner = fetchLeafOwnerKeypair();

    await airdrop(provider, creator.publicKey, feePayer.publicKey);

    const merkleTree = anchor.web3.Keypair.generate();
    log("MerkleTree", merkleTree.publicKey.toBase58());

    const collectionMint = anchor.web3.Keypair.generate();
    log("collectionMint", collectionMint.publicKey.toBase58());

    const merkleTreeSize = getMerkleTreeSize(maxDepth, maxBufferSize);

    const [treeAuthority, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [merkleTree.publicKey.toBuffer()],
      MPL_BUBBLEGUM_PROGRAM_ID
    );
    log("treeAuthority", treeAuthority.toBase58());

    let transaction = new anchor.web3.Transaction();

    let accIx = anchor.web3.SystemProgram.createAccount({
      fromPubkey: creator.publicKey,
      newAccountPubkey: merkleTree.publicKey,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(
        merkleTreeSize
      ),
      space: merkleTreeSize,
      programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    });

    transaction.add(accIx);

    let createTreeIx = await program.methods
      .createTree(maxDepth, maxBufferSize, null)
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
      .instruction();

    // Simulate transaction to calculate the compute units
    let units = await getSimulationUnits(
      provider.connection,
      [accIx, createTreeIx],
      creator.publicKey
    );

    computeLog("Compute units required to create bubblegum tree ", units);

    transaction.add(createTreeIx);

    const txId = await provider.sendAndConfirm(
      transaction,
      [merkleTree, creator, feePayer],
      {
        commitment: "confirmed",
        skipPreflight: true,
      }
    );

    txIdLog(txId);

    const uri = "https://example.com/my-collection.json";
    const name = "My Collection";

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
      TOKEN_PROGRAM_ID
    );
    log("Ata ", ata.toBase58());

    try {
      transaction = new anchor.web3.Transaction();

      let collectionNftIx = await program.methods
        .createCollectionNft(uri, name)
        .accounts({
          collectionMint: collectionMint.publicKey,
          payer: creator.publicKey,
          wallet: creator.publicKey,
          tokenMetadata,
          masterEdition,
          associatedToken: ata,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          associatedProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .instruction();

      // Simulate transaction to calculate the compute units
      units = await getSimulationUnits(
        provider.connection,
        [collectionNftIx],
        creator.publicKey
      );

      computeLog("Compute units required for collectionNft ix", units);

      let computeIx = computeBudgetIx(units);

      transaction.add(computeIx);

      transaction.add(collectionNftIx);

      const collectionTxId = await provider.sendAndConfirm(
        transaction,
        [creator, collectionMint],
        {
          commitment: "confirmed",
          skipPreflight: true,
        }
      );
      txIdLog(collectionTxId);
    } catch (error) {
      log("Error ", error);
    }

    try {
      const uri = "https://example.com/my-collection-cNft.json";
      const name = "My Collection cNFT 1";

      transaction = new anchor.web3.Transaction();

      let mintToCollectionIx = await program.methods
        .mintCompNftToCollection(uri, name)
        .accounts({
          treeConfig: treeAuthority,
          leafOwner: leafOwner.publicKey,
          leafDelegate: leafOwner.publicKey,
          merkleTree: merkleTree.publicKey,
          payer: feePayer.publicKey,
          treeCreator: creator.publicKey,
          collectionAuthority: creator.publicKey,
          collectionMint: collectionMint.publicKey,
          collectionMetadata: tokenMetadata,
          editionAccount: masterEdition,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          mplBubblegumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
        })
        .instruction();

      // Simulate transaction to calculate the compute units
      units = await getSimulationUnits(
        provider.connection,
        [mintToCollectionIx],
        creator.publicKey
      );

      computeLog("Compute units required for mint to collection ix", units);

      transaction.add(mintToCollectionIx);

      const mintToColTxId = await provider.sendAndConfirm(
        transaction,
        [creator, feePayer],
        {
          commitment: "confirmed",
          skipPreflight: true,
        }
      );
      txIdLog(mintToColTxId);
    } catch (error) {
      log("mint to collection error ", error);
    }
  });
});
