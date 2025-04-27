"use client";

import {
  useAccount,
  useDisconnect,
  useWatchContractEvent,
  useChainId,
} from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import {
  User,
  LogOut,
  ChevronDown,
  Plus,
  Home,
  Wallet,
  Coins,
} from "lucide-react";
import { usePtxToken } from "@/hooks/use-ptx-token";
import { useEthBalance } from "@/hooks/use-eth-balance";
import {
  formatEther,
  parseEther,
  createWalletClient,
  http,
  getContract,
} from "viem";
import { TOKEN_ABI, TOKEN_ADDRESS } from "@/config/contracts";
import { useToast } from "@/hooks/use-toast";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

// Hardhat's first account private key
const FUNDER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export function Header() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const { balance: ptxBalance, refetch: refetchPtxBalance } = usePtxToken();
  const { balance: ethBalance, refetch: refetchEthBalance } = useEthBalance();
  const chainId = useChainId();
  const { toast } = useToast();

  // Watch for any reward transfers to update the balance
  useWatchContractEvent({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    eventName: "RewardTransfer",
    onLogs() {
      refetchPtxBalance();
    },
  });

  const handleDisconnect = () => {
    void disconnect?.();
    router.push("/");
  };

  const handleFund = async () => {
    if (!address) return;

    try {
      // Create a wallet client from the private key
      const account = privateKeyToAccount(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      );
      const client = createWalletClient({
        account,
        chain: hardhat,
        transport: http(),
      });

      toast({
        title: "Transaction Pending",
        description: "Please wait while your transaction is being processed...",
      });

      // Send the transaction using the wallet client
      const hash = await client.sendTransaction({
        to: address,
        value: parseEther("1"),
      });

      // Wait for transaction to be mined
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Success",
        description: "You've been funded with 1 ETH",
      });

      // Refresh ETH balance
      await refetchEthBalance();
    } catch (error) {
      console.error("Funding error:", error);
      toast({
        title: "Error",
        description: "Failed to fund account",
        variant: "destructive",
      });
    }
  };

  const handleFundPtx = async () => {
    if (!address) return;

    try {
      // Create a wallet client from the private key
      const account = privateKeyToAccount(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      );
      const client = createWalletClient({
        account,
        chain: hardhat,
        transport: http(),
      });

      toast({
        title: "Transaction Pending",
        description: "Please wait while your transaction is being processed...",
      });

      // Send PTX tokens using the token contract
      const tokenContract = getContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        client,
      });

      const hash = await tokenContract.write.transfer([
        address,
        parseEther("1000"),
      ]);

      // Wait for transaction to be mined
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Success",
        description: "You've been funded with 1000 PTX",
      });

      // Refresh PTX balance
      await refetchPtxBalance();
    } catch (error) {
      console.error("PTX funding error:", error);
      toast({
        title: "Error",
        description: "Failed to fund account with PTX",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) return null;

  return (
    <div className="border-b">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Navigation */}
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/events">
                <Wallet className="h-4 w-4" />
                Events
              </Link>
            </Button>
            <Button onClick={() => router.push("/create")} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Use Case
            </Button>
          </div>

          {/* Right side - Wallet & Balance */}
          <div className="flex items-center gap-4">
            {chainId === 31337 && (
              <>
                <Button
                  onClick={handleFund}
                  variant="outline"
                  className="gap-2"
                >
                  <Coins className="h-4 w-4" />
                  Fund with ETH
                </Button>
                <Button
                  onClick={handleFundPtx}
                  variant="outline"
                  className="gap-2"
                >
                  <Coins className="h-4 w-4" />
                  Fund with PTX
                </Button>
              </>
            )}
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <Wallet className="h-4 w-4" />
              <span>
                {Number(formatEther(ethBalance ?? 0n)).toFixed(4)} ETH
              </span>
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <Wallet className="h-4 w-4" />
              <span>
                {Number(formatEther(ptxBalance ?? 0n)).toFixed(4)} PTX
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline-block">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Disconnect</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Container>
    </div>
  );
}
