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

interface UseCaseCardProps {
  id: bigint;
  rewardPool: bigint;
  remainingRewardPool: bigint;
  lockDuration: bigint;
  eventCount: number;
  isActive: boolean;
  owner: string;
  currentAddress?: string;
}

export function UseCaseCard({
  id,
  rewardPool,
  remainingRewardPool,
  lockDuration,
  eventCount,
  isActive,
  owner,
  currentAddress,
}: UseCaseCardProps) {
  const isOwner = currentAddress === owner;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Use Case #{id.toString()}</CardTitle>
          <div className="flex gap-2">
            {isOwner && <Badge variant="secondary">Owner</Badge>}
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Lock Duration: {formatDuration(lockDuration)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Reward Pool</span>
              <span className="font-medium">{formatEther(rewardPool)} PTX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Rewards</span>
              <span className="font-medium">
                {formatEther(remainingRewardPool)} PTX
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event Types</span>
              <span className="font-medium">{eventCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner</span>
              <span className="font-medium">
                {owner.slice(0, 6)}...{owner.slice(-4)}
              </span>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link href={`/use-case/${id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
