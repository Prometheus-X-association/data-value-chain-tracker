"use client";

import { useAccount, useDisconnect, useWatchContractEvent } from "wagmi";
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
import { User, LogOut, ChevronDown, Plus, Home, Wallet } from "lucide-react";
import { usePtxToken } from "@/hooks/use-ptx-token";
import { formatEther } from "viem";
import { TOKEN_ABI, TOKEN_ADDRESS } from "@/config/contracts";

export function Header() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const { balance, refetch: refetchBalance } = usePtxToken();

  // Watch for any reward transfers to update the balance
  useWatchContractEvent({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    eventName: "RewardTransfer",
    onLogs() {
      refetchBalance();
    },
  });

  const handleDisconnect = () => {
    disconnect();
    router.push("/");
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
              <Link href="/rewards">
                <Wallet className="h-4 w-4" />
                Rewards
              </Link>
            </Button>
            <Button onClick={() => router.push("/create")} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Use Case
            </Button>
          </div>

          {/* Right side - Wallet & Balance */}
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <Wallet className="h-4 w-4" />
              <span>{formatEther(balance ?? 0n)} PTX</span>
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
