# Bubblegum-CPI

This program demonstrates the cpi usage for creating merkle tree, collection mint and mint cNft to collections.

# Setup

- [Rust](https://www.rust-lang.org/tools/install)
- [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-tools#use-solanas-install-tool)
- [Spl-token](https://spl.solana.com/token#setup)
- [Anchor](https://www.anchor-lang.com/docs/installation)
- [Yarn](https://yarnpkg.com/getting-started/install)

### Required Version

- rustc 1.77.0
- solana-cli 1.18.9
- anchor 0.29.0
- node v20.11.0
- yarn 1.22.19

### Steps to test the program on amman local validator:

```bash
   $ yarn  # only for the first time to install dependency
   $ yarn run validator # new terminal
   $ ./deploy.sh # to deploy program and some airdrop
   $ anchor run bubblegum
```

## Note

- **This code is not production ready. Use at your own risk.**

## Learning Resources

- [Solana Developers Guides](https://solana.com/developers/guides)
- [SolanaCookbook](https://solanacookbook.com/#contributing)
- [Anchor](https://www.anchor-lang.com/)
- [Bubblegum](https://developers.metaplex.com/bubblegum)
- [Token Metadata](https://developers.metaplex.com/token-metadata)
- [Amman](https://www.helius.dev/blog)
