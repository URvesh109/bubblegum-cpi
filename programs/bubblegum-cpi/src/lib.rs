use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{get_associated_token_address_with_program_id, AssociatedToken},
    metadata::mpl_token_metadata::{
        instructions::{CreateV1CpiBuilder, MintV1CpiBuilder},
        types::{PrintSupply, TokenStandard},
    },
    token_2022::Token2022,
};
use mpl_bubblegum::instructions::CreateTreeConfigCpiBuilder;
use spl_account_compression::{program::SplAccountCompression, Noop};

mod utils;

use utils::*;

declare_id!("F7uCq1ZAShY1bjMiMMwRkMsCdpgTgwhYtaQorHE9snca");

#[program]
pub mod bubblegum_cpi {
    use super::*;

    pub fn create_tree(
        ctx: Context<CreateTreeCpi>,
        max_depth: u32,
        max_buffer_size: u32,
        public: Option<bool>,
    ) -> Result<()> {
        let all = ctx.accounts;

        let mut cpi_create_tree = CreateTreeConfigCpiBuilder::new(&all.mpl_bubblegum_program);
        cpi_create_tree.tree_config(&all.tree_authority);
        cpi_create_tree.merkle_tree(&all.merkle_tree);
        cpi_create_tree.payer(&all.payer);
        cpi_create_tree.tree_creator(&all.tree_creator);
        cpi_create_tree.log_wrapper(&all.log_wrapper);
        cpi_create_tree.compression_program(&all.compression_program);
        cpi_create_tree.system_program(&all.system_program);
        cpi_create_tree.max_depth(max_depth);
        cpi_create_tree.max_buffer_size(max_buffer_size);
        if let Some(value) = public {
            cpi_create_tree.public(value);
        }

        cpi_create_tree.invoke()?;
        Ok(())
    }

    pub fn create_collection_nft(
        ctx: Context<CreateCollectionNft>,
        uri: String,
        name: String,
    ) -> Result<()> {
        validate_name(&name)?;
        validate_uri(&uri)?;

        let all = ctx.accounts;

        let rent_info = all.rent.to_account_info();

        let mut create_cpi = CreateV1CpiBuilder::new(&all.token_metadata_program);
        create_cpi.metadata(&all.token_metadata);
        create_cpi.mint(&all.collection_mint, true);
        create_cpi.authority(&all.wallet);
        create_cpi.payer(&all.payer);
        create_cpi.update_authority(&all.wallet, false);
        create_cpi.master_edition(Some(&all.master_edition));
        create_cpi.system_program(&all.system_program);
        create_cpi.sysvar_instructions(&rent_info);
        create_cpi.spl_token_program(&all.token_program);
        create_cpi.token_standard(TokenStandard::NonFungible);
        create_cpi.name(name);
        create_cpi.uri(uri);
        create_cpi.seller_fee_basis_points(550);
        create_cpi.token_standard(TokenStandard::NonFungible);
        create_cpi.print_supply(PrintSupply::Zero);

        create_cpi.invoke()?;

        let mut mint_cpi = MintV1CpiBuilder::new(&all.token_metadata_program);
        mint_cpi.token(&all.associated_token);
        mint_cpi.token_owner(Some(&all.wallet));
        mint_cpi.metadata(&all.token_metadata);
        mint_cpi.master_edition(Some(&all.master_edition));
        mint_cpi.mint(&all.collection_mint);
        mint_cpi.payer(&all.payer);
        mint_cpi.authority(&all.wallet);
        mint_cpi.system_program(&all.system_program);
        mint_cpi.sysvar_instructions(&rent_info);
        mint_cpi.spl_token_program(&all.token_program);
        mint_cpi.spl_ata_program(&all.associated_program);
        mint_cpi.amount(1);

        mint_cpi.invoke()?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateTreeCpi<'info> {
    /// CHECK: will used by mpl_bubblegum program
    #[account(mut)]
    pub tree_authority: UncheckedAccount<'info>,
    /// CHECK: Zero initialized account
    #[account(zero, signer)]
    pub merkle_tree: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub tree_creator: Signer<'info>,
    pub log_wrapper: Program<'info, Noop>,
    pub compression_program: Program<'info, SplAccountCompression>,
    pub mpl_bubblegum_program: Program<'info, MplBubblegumProgram>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateCollectionNft<'info> {
    /// CHECK: Mint account create using cpi
    #[account(mut, signer)]
    pub collection_mint: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub wallet: SystemAccount<'info>,
    ///CHECK: account will be used and checked by metaplex in CPI call.
    #[account(
        mut,
        owner = System::id() @ BubblegumCpiError::InvalidAccountOwner,
        constraint = token_metadata.data_is_empty() @ BubblegumCpiError::MetadataAccountAlreadyInUse
    )]
    pub token_metadata: UncheckedAccount<'info>,
    ///CHECK: account will be used and checked by metaplex in CPI call.
    #[account(
        mut,
        owner = System::id() @ BubblegumCpiError::InvalidAccountOwner,
        constraint = master_edition.data_is_empty() @ BubblegumCpiError::MasterEditionAccountAlreadyInUse
    )]
    pub master_edition: UncheckedAccount<'info>,
    ///CHECK: Associated token account
    #[account(
        mut,
        address = get_associated_token_address_with_program_id(wallet.key, collection_mint.key, token_program.key) @ BubblegumCpiError::InvalidAssociatedTokenAccount
    )]
    pub associated_token: UncheckedAccount<'info>,
    pub token_metadata_program: Program<'info, TokenMetadataProgram>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub associated_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[error_code]
pub enum BubblegumCpiError {
    #[msg("Invalid Account Owner")]
    InvalidAccountOwner,
    #[msg("Token Metadata account must be empty")]
    MetadataAccountAlreadyInUse,
    #[msg("Master edition account must be empty")]
    MasterEditionAccountAlreadyInUse,
    #[msg("Uri is too long")]
    UriTooLong,
    #[msg("Uri is invalid")]
    InvalidUri,
    #[msg("Nft name is invalid")]
    InvalidNftName,
    #[msg("Associated token account is invalid")]
    InvalidAssociatedTokenAccount,
}

#[derive(Clone)]
pub struct MplBubblegumProgram;

impl anchor_lang::Id for MplBubblegumProgram {
    fn id() -> Pubkey {
        mpl_bubblegum::ID
    }
}

#[derive(Clone)]
pub struct TokenMetadataProgram;

impl anchor_lang::Id for TokenMetadataProgram {
    fn id() -> Pubkey {
        anchor_spl::metadata::ID
    }
}
