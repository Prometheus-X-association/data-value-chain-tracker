import { useAccount, useConnect } from "wagmi";
import { mock } from "wagmi/connectors";
import { privateKeyToAccount } from "viem/accounts";

interface TestWallet {
  address: string;
  role: "owner" | "notifier" | "participant";
  label: string;
  privateKey: string;
}

const TEST_WALLETS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    role: "owner",
    label: "Owner",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    role: "notifier",
    label: "Notifier 1",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    role: "notifier",
    label: "Notifier 2",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    role: "participant",
    label: "Participant 1",
    privateKey:
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    role: "participant",
    label: "Participant 2",
    privateKey:
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  },
] as const;

export function TestWalletSwitcher() {
  const { address } = useAccount();
  const { connect } = useConnect();

  if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 rounded-lg bg-gray-800 p-4">
      <h3 className="mb-2 text-white">Test Wallets</h3>
      <div className="space-y-2">
        {TEST_WALLETS.map((wallet) => (
          <button
            key={wallet.address}
            className={`block w-full rounded px-4 py-2 ${
              address === wallet.address ? "bg-blue-500" : "bg-gray-700"
            } text-sm text-white`}
            onClick={() => {
              const account = privateKeyToAccount(
                wallet.privateKey as `0x${string}`,
              );
              connect({
                connector: mock({
                  accounts: [account.address],
                }),
              });
            }}
          >
            {wallet.label}
          </button>
        ))}
      </div>
    </div>
  );
}
