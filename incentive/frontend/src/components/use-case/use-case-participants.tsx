import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "../ui/badge";
import { Reward } from "@/types/types";
import {
  useAccount,
  useWatchContractEvent,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { USECASE_ABI } from "@/config/contracts";
import { config } from "@/providers/web3";
import { waitForTransactionReceipt } from "@wagmi/core";

interface UseCaseParticipantsProps {
  useCaseId: bigint;
  isOwner: boolean;
}

export function UseCaseParticipants({
  useCaseId,
  isOwner,
}: UseCaseParticipantsProps) {
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const { useCase, actions, refetch } = useUseCase(useCaseId);
  const { address } = useAccount();
  const { toast } = useToast();

  // Watch for reward claims and rejections to update the table
  useWatchContractEvent({
    address: useCase?.address as `0x${string}`,
    abi: USECASE_ABI,
    eventName: "RewardClaimed",
    onLogs() {
      refetch();
    },
  });

  useWatchContractEvent({
    address: useCase?.address as `0x${string}`,
    abi: USECASE_ABI,
    eventName: "RewardRejected",
    onLogs() {
      refetch();
    },
  });

  if (!useCase) return null;

  const handleRejectReward = async (
    participant: string,
    rewardIndex: number,
  ) => {
    try {
      const hash = await actions.rejectReward(participant, rewardIndex);
      await waitForTransactionReceipt(config, { hash });

      toast({
        title: "Reward rejected",
        description: "The reward has been successfully rejected.",
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject reward. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to reject reward:", error);
    }
  };

  const handleClaimRewards = async () => {
    try {
      setIsClaimLoading(true);
      const hash = await actions.claimRewards();
      await waitForTransactionReceipt(config, { hash });

      toast({
        title: "Rewards claimed",
        description: "Your rewards have been successfully claimed.",
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim rewards. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to claim rewards:", error);
    } finally {
      setIsClaimLoading(false);
    }
  };

  // Calculate total claimable rewards for the current user
  const claimableRewards = useCase.participantsRewards
    ?.filter(
      (reward) =>
        reward.participant === address && !reward.claimed && !reward.rejected,
    )
    .reduce((total, reward) => total + reward.amount, 0n);

  return (
    <div className="space-y-6">
      {/* Claim Button Section */}
      {address && claimableRewards > 0n && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Available Rewards</h3>
                <p className="text-sm text-muted-foreground">
                  You have {formatEther(claimableRewards)} PTX available to
                  claim
                </p>
              </div>
              <Button onClick={handleClaimRewards} disabled={isClaimLoading}>
                {isClaimLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim All Rewards"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Participants Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Rewards</TableHead>
                <TableHead>Claimed</TableHead>
                <TableHead>Lock Status</TableHead>
                {isOwner && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {useCase.participantsRewards?.map(
                (reward: Reward, index: number) => (
                  <TableRow key={`${reward.participant}-${index}`}>
                    <TableCell className="font-medium">
                      {reward.participant.slice(0, 6)}...
                      {reward.participant.slice(-4)}
                    </TableCell>
                    <TableCell>{formatEther(reward.amount)} PTX</TableCell>
                    <TableCell>{reward.claimed ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {reward.rejected ? (
                        <Badge variant="secondary">Locked</Badge>
                      ) : (
                        <Badge variant="default">Unlocked</Badge>
                      )}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={reward.rejected}
                            >
                              Reject Rewards
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Reject Participant Rewards
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>
                                Are you sure you want to reject the rewards for
                                this participant? This action cannot be undone.
                              </p>
                              <div className="flex justify-end gap-4">
                                <Button variant="outline">Cancel</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    handleRejectReward(reward.participant, 0)
                                  }
                                >
                                  Reject Rewards
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    )}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
