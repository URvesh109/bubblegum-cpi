use anchor_lang::prelude::*;

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
