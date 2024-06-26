use crate::error::*;
use anchor_lang::prelude::*;
use anchor_spl::metadata::mpl_token_metadata::{MAX_NAME_LENGTH, MAX_URI_LENGTH};
use url::Url;

pub fn validate_uri(uri: &str) -> Result<()> {
    require!(uri.len() <= MAX_URI_LENGTH, BubblegumCpiError::UriTooLong);
    Url::parse(uri).map_err(|_| BubblegumCpiError::InvalidUri)?;
    Ok(())
}

pub fn validate_name(name: &str) -> Result<()> {
    let name = name.trim();
    require!(
        !name.is_empty() && name.len() <= MAX_NAME_LENGTH,
        BubblegumCpiError::InvalidNftName
    );
    Ok(())
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
