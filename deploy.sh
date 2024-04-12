#!/usr/bin/env bash
set -euo pipefail

solana airdrop --keypair keypairs/creator.json 100
solana airdrop --keypair keypairs/leaf-owner.json 100
solana airdrop --keypair keypairs/fee-payer.json 100

anchor build --arch sbf

anchor deploy -p bubblegum-cpi --program-keypair keypairs/deploy-key-bubblegum-cpi.json
