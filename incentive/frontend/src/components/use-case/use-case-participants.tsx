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
import { useBlockTime } from "@/hooks/use-block-time";
import { useUseCaseClaims } from "@/hooks/use-use-case-claims";

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
  const currentTime = useBlockTime();
  const { claimedByParticipant } = useUseCaseClaims(useCaseId);

  if (!useCase) return null;

  const metadataByAddress = new Map(
    (useCase.metadata?.participants || [])
      .filter((participant) => participant.walletAddress)
      .map((participant) => [
        participant.walletAddress.toLowerCase(),
        participant,
      ]),
  );

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
              <Button
                onClick={async () => {
                  await handleClaimRewards();
                }}
                disabled={isClaimLoading}
              >
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
                <TableHead>Raw Weight</TableHead>
                <TableHead>Share</TableHead>
                <TableHead>Claimed</TableHead>
                <TableHead>Fixed Reward</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {useCase.participants.map((participant, index) => {
                const participantAddress = participant.participant.toLowerCase();
                const participantMetadata = metadataByAddress.get(participantAddress);
                const claimedAmount = claimedByParticipant.get(participantAddress) || 0n;

                return (
                <TableRow key={`${participant.participant}-${index}`}>
                  <TableCell className="font-medium">
                    {participant.participant.slice(0, 6)}...
                    {participant.participant.slice(-4)}
                  </TableCell>
                  <TableCell>
                    {participantMetadata ? participantMetadata.numOfShare : "N/A"}
                  </TableCell>
                  <TableCell>
                    {Number(participant.rewardShare) / 100}%
                  </TableCell>
                  <TableCell>{formatEther(claimedAmount)} PTX</TableCell>
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
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
