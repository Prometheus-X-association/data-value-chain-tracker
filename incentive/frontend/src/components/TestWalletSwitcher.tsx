import { useAccount, useConnect } from "wagmi";
import { mock } from "wagmi/connectors";

interface TestWallet {
  address: string;
  role: "deployer" | "owner" | "participant";
  label: string;
}

const TEST_WALLETS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    role: "deployer",
    label: "Deployer",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    role: "owner",
    label: "Use Case Owner 1",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    role: "owner",
    label: "Use Case Owner 2",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    role: "participant",
    label: "Participant 1",
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    role: "participant",
    label: "Participant 2",
  },
  {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    role: "participant",
    label: "Participant 3",
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
              // Anvil signs for its unlocked dev accounts (requires RPC_ALLOW_DEV_SIGNING=true)
              connect({
                connector: mock({
                  accounts: [wallet.address as `0x${string}`],
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
