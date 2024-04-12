use crate::{error::*, utils::*};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{get_associated_token_address_with_program_id, AssociatedToken},
    metadata::mpl_token_metadata::{
        instructions::{CreateV1CpiBuilder, MintV1CpiBuilder},
        types::{PrintSupply, TokenStandard},
    },
    token::Token,
};

/// If you do not have a Collection NFT yet, you can create one using the ix
pub(crate) fn handle_create_collection_nft(
    ctx: Context<CreateCollectionNftCpi>,
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

#[derive(Accounts)]
pub struct CreateCollectionNftCpi<'info> {
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
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}
