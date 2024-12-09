import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEther } from "viem";
import { formatDuration } from "@/lib/utils";

interface UseCaseStats {
  totalAllocated: bigint;
  totalClaimed: bigint;
  totalRejected: bigint;
  totalPending: bigint;
  rewardPool: bigint;
  remainingRewardPool: bigint;
  isActive: boolean;
  lockDuration: bigint;
  eventCount: number;
}

interface UseCaseOverviewProps {
  useCase: {
    stats: UseCaseStats;
    events: {
      names: string[];
      rewards: bigint[];
    };
  };
}

export function UseCaseOverview({ useCase }: UseCaseOverviewProps) {
  const { stats, events } = useCase;

  return (
    <div className="grid gap-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={stats.isActive ? "default" : "secondary"}>
                {stats.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lock Duration</p>
              <p className="text-lg font-medium">
                {formatDuration(stats.lockDuration)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reward Pool</p>
              <p className="text-lg font-medium">
                {formatEther(stats.rewardPool)} PTX
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining Rewards</p>
              <p className="text-lg font-medium">
                {formatEther(stats.remainingRewardPool)} PTX
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Events */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {events.names.map((name, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatEther(events.rewards[index] ?? 0n)} PTX
                  </p>
                  <p className="text-sm text-muted-foreground">Base Reward</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
