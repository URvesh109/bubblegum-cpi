use crate::utils::*;
use anchor_lang::prelude::*;
use anchor_spl::{token::Token, token_interface::Mint};
use mpl_bubblegum::instructions::MintToCollectionV1CpiBuilder;
use mpl_bubblegum::types::{Collection, Creator, MetadataArgs};
use spl_account_compression::{program::SplAccountCompression, Noop};

/// This instruction mints a cNFT as a verified member of a collection. Note that Merkle proofs are not required for minting.
pub(crate) fn hanlde_mint_comp_nft_to_collection(
    ctx: Context<MintCnftToCollectionCpi>,
    uri: String,
    name: String,
) -> Result<()> {
    let all = ctx.accounts;

    let collect_mint = all.collection_mint.to_account_info();

    let collection = Collection {
        key: collect_mint.key(),
        verified: false,
    };

    let metadata = MetadataArgs {
        name,
        uri,
        symbol: "cNFT".into(),
        seller_fee_basis_points: 550,
        primary_sale_happened: false,
        is_mutable: true,
        edition_nonce: None,
        token_standard: Some(mpl_bubblegum::types::TokenStandard::NonFungible),
        collection: Some(collection),
        uses: None,
        token_program_version: mpl_bubblegum::types::TokenProgramVersion::Token2022,
        creators: vec![Creator {
            address: all.tree_creator.key(),
            verified: true,
            share: 100,
        }],
    };

    let mut mint_to_collection = MintToCollectionV1CpiBuilder::new(&all.mpl_bubblegum_program);
    mint_to_collection.tree_config(&all.tree_config);
    mint_to_collection.leaf_owner(&all.leaf_owner);
    mint_to_collection.leaf_delegate(&all.leaf_delegate);
    mint_to_collection.merkle_tree(&all.merkle_tree);
    mint_to_collection.payer(&all.payer);
    mint_to_collection.tree_creator_or_delegate(&all.tree_creator);
    mint_to_collection.collection_authority(&all.collection_authority);
    mint_to_collection.collection_mint(&collect_mint);
    mint_to_collection.collection_metadata(&all.collection_metadata);
    mint_to_collection.collection_edition(&all.edition_account);
    mint_to_collection.log_wrapper(&all.log_wrapper);
    mint_to_collection.compression_program(&all.compression_program);
    mint_to_collection.token_metadata_program(&all.token_metadata_program);
    mint_to_collection.system_program(&all.system_program);
    mint_to_collection.metadata(metadata);
    mint_to_collection.bubblegum_signer(&all.tree_creator);
    mint_to_collection.add_remaining_account(&all.tree_creator, false, true);

    mint_to_collection.invoke()?;

    Ok(())
}

#[derive(Accounts)]
pub struct MintCnftToCollectionCpi<'info> {
    /// CHECK: will used by mpl_bubblegum program
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,
    pub leaf_owner: SystemAccount<'info>,
    pub leaf_delegate: SystemAccount<'info>,
    /// CHECK: will used by mpl_bubblegum program
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub tree_creator: Signer<'info>,
    pub collection_authority: Signer<'info>,
    #[account(
        mint::token_program = Token::id(),
        mint::authority = edition_account
    )]
    pub collection_mint: InterfaceAccount<'info, Mint>,
    /// CHECK:
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,
    /// CHECK
    pub edition_account: UncheckedAccount<'info>,
    pub log_wrapper: Program<'info, Noop>,
    pub compression_program: Program<'info, SplAccountCompression>,
    pub token_metadata_program: Program<'info, TokenMetadataProgram>,
    pub system_program: Program<'info, System>,
    pub mpl_bubblegum_program: Program<'info, MplBubblegumProgram>,
}
