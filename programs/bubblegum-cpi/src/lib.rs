mod error;
mod instructions;
mod utils;

use anchor_lang::prelude::*;

use instructions::*;

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
        handle_create_tree(ctx, max_depth, max_buffer_size, public)
    }

    pub fn create_collection_nft(
        ctx: Context<CreateCollectionNftCpi>,
        uri: String,
        name: String,
    ) -> Result<()> {
        handle_create_collection_nft(ctx, uri, name)
    }

    pub fn mint_comp_nft_to_collection(
        ctx: Context<MintCnftToCollectionCpi>,
        uri: String,
        name: String,
    ) -> Result<()> {
        hanlde_mint_comp_nft_to_collection(ctx, uri, name)
    }
}
