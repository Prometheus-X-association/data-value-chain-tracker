import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEther } from "viem";
import { Eye } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { UseCaseInfo } from "@/types/types";
import { useBlockTime } from "@/hooks/use-block-time";

interface UseCaseCardProps {
  useCase: UseCaseInfo;
  currentAddress: `0x${string}` | undefined;
}

export function UseCaseCard({ useCase, currentAddress }: UseCaseCardProps) {
  const isOwner =
    currentAddress &&
    currentAddress.toLowerCase() === useCase.owner.toLowerCase();

  const currentTime = useBlockTime();
  const isFinished =
    useCase.rewardsLocked &&
    useCase.lockTime > 0n &&
    currentTime >= useCase.lockTime + useCase.lockupPeriod;

  const getStatus = () => {
    console.log(useCase.id, useCase.lockTime, useCase.lockupPeriod, currentTime);
    if (isFinished) return { label: "Finished", variant: "secondary" as const };
    if (useCase.rewardsLocked)
      return { label: "Locked", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  };

  const status = getStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Use Case #{useCase.id}</CardTitle>
          <div className="flex gap-2">
            {isOwner && <Badge variant="secondary">Owner</Badge>}
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
        <CardDescription>
          Lock Duration: {formatDuration(useCase.lockupPeriod)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Reward Pool</span>
              <span className="font-medium">
                {formatEther(useCase.totalRewardPool)} PTX
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Rewards</span>
              <span className="font-medium">
                {formatEther(useCase.remainingRewardPool)} PTX
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Shares</span>
              <span className="font-medium">
                {Number(useCase.totalShares) / 100}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lock Status</span>
              <span className="font-medium">
                {useCase.lockTime > 0n
                  ? new Date(
                      Number(useCase.lockTime) * 1000,
                    ).toLocaleDateString()
                  : "Not locked"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium">
                {useCase.owner.slice(0, 6)}...{useCase.owner.slice(-4)}
              </span>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link href={`/use-case/${useCase.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
