// npx hardhat run scripts/check-balances.js --network localhost
async function main() {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    const balance = await account.getBalance();
    console.log(`${account.address}: ${ethers.utils.formatEther(balance)} ETH`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
