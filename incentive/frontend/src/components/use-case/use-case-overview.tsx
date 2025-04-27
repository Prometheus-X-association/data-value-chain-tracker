import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEther } from "viem";
import { formatDuration } from "@/lib/utils";
import { UseCaseInfo } from "@/types/types";

interface UseCaseOverviewProps {
  useCase: UseCaseInfo;
}

export function UseCaseOverview({ useCase }: UseCaseOverviewProps) {
  // Calculate total fixed rewards
  const totalFixedRewards = useCase.participants.reduce(
    (sum, participant) => sum + participant.fixedReward,
    0n,
  );

  // Calculate remaining reward pool for shares, ensuring it never goes below 0
  const remainingRewardPoolForShares =
    useCase.remainingRewardPool > totalFixedRewards
      ? useCase.remainingRewardPool - totalFixedRewards
      : 0n;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={!useCase.rewardsLocked ? "default" : "secondary"}>
                {!useCase.rewardsLocked ? "Active" : "Locked"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Owner</p>
              <p className="text-lg font-medium">
                {useCase.owner.slice(0, 6)}...{useCase.owner.slice(-4)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lock Duration</p>
              <p className="text-lg font-medium">
                {formatDuration(useCase.lockupPeriod)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lock Time</p>
              <p className="text-lg font-medium">
                {useCase.lockTime > 0n
                  ? new Date(
                      Number(useCase.lockTime) * 1000,
                    ).toLocaleDateString()
                  : "Not locked"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reward Pool</p>
              <p className="text-lg font-medium">
                {formatEther(useCase.totalRewardPool)} PTX
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining Rewards</p>
              <p className="text-lg font-medium">
                {formatEther(useCase.remainingRewardPool)} PTX
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Fixed Rewards
              </p>
              <p className="text-lg font-medium">
                {formatEther(totalFixedRewards)} PTX
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Remaining for Shares
              </p>
              <p className="text-lg font-medium">
                {formatEther(remainingRewardPoolForShares)} PTX
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Shares</p>
              <p className="text-lg font-medium">
                {Number(useCase.totalShares) / 100}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {useCase.participants.map((participant, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">
                    {participant.participant.slice(0, 6)}...
                    {participant.participant.slice(-4)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {Number(participant.rewardShare) / 100}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatEther(participant.fixedReward)} PTX Fixed
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
