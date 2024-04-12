use crate::utils::*;
use anchor_lang::prelude::*;
use mpl_bubblegum::instructions::CreateTreeConfigCpiBuilder;
use spl_account_compression::{program::SplAccountCompression, Noop};

/// This instruction creates a Merkle Tree.
pub(crate) fn handle_create_tree(
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
