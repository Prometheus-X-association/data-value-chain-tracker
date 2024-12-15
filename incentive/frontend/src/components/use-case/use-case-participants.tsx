import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEther } from "viem";
import { useUseCase } from "@/hooks/use-use-case";
import { Badge } from "../ui/badge";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { useTransaction } from "@/hooks/use-transaction";

interface UseCaseParticipantsProps {
  useCaseId: string;
  isOwner: boolean;
}

export function UseCaseParticipants({
  useCaseId,
  isOwner,
}: UseCaseParticipantsProps) {
  const { useCase, actions, refetch } = useUseCase(useCaseId);
  const { address } = useAccount();
  const { handleTransaction, isLoading: isClaimLoading } = useTransaction();

  if (!useCase) return null;

  const handleClaimRewards = async () => {
    await handleTransaction(() => actions.claimRewards(), {
      successMessage: "Your rewards have been successfully claimed",
      errorMessage: "Failed to claim rewards. Please try again.",
      onSuccess: () => refetch(),
    });
  };

  // Find current user's rewards
  const currentParticipant = useCase.participants.find(
    (p) => p.participant.toLowerCase() === address?.toLowerCase(),
  );

  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const isLockPeriodOver =
    useCase.lockTime > 0n &&
    currentTime >= useCase.lockTime + useCase.lockupPeriod;

  const canClaim =
    currentParticipant &&
    (currentParticipant.rewardShare > 0n ||
      currentParticipant.fixedReward > 0n) &&
    useCase.rewardsLocked &&
    isLockPeriodOver;

  return (
    <div className="space-y-6">
      {canClaim && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Available Rewards</h3>
                <p className="text-sm text-muted-foreground">
                  You have rewards available to claim
                </p>
              </div>
              <Button onClick={handleClaimRewards} disabled={isClaimLoading}>
                {isClaimLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim Rewards"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Share</TableHead>
                <TableHead>Fixed Reward</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {useCase.participants.map((participant, index) => (
                <TableRow key={`${participant.participant}-${index}`}>
                  <TableCell className="font-medium">
                    {participant.participant.slice(0, 6)}...
                    {participant.participant.slice(-4)}
                  </TableCell>
                  <TableCell>
                    {Number(participant.rewardShare) / 100}%
                  </TableCell>
                  <TableCell>
                    {formatEther(participant.fixedReward)} PTX
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        participant.rewardShare > 0n ? "default" : "secondary"
                      }
                    >
                      {participant.rewardShare > 0n ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
