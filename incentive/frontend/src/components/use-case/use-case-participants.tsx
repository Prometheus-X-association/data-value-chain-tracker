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
import { useUseCase } from "@/hooks/useUseCase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "../ui/badge";

interface UseCaseParticipantsProps {
  useCaseId: bigint;
  isOwner: boolean;
}

interface Participant {
  address: string;
  pendingRewards: bigint;
  claimedRewards: bigint;
  isLocked: boolean;
  rewardIndex: number;
}

export function UseCaseParticipants({
  useCaseId,
  isOwner,
}: UseCaseParticipantsProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    null,
  );
  const { useCase, actions } = useUseCase(useCaseId);

  if (!useCase) return null;

  const handleRejectReward = async (
    participant: string,
    rewardIndex: number,
  ) => {
    try {
      await actions.rejectReward(participant, rewardIndex);
      // Add toast notification for success
    } catch (error) {
      // Add toast notification for error
      console.error("Failed to reject reward:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Pending Rewards</TableHead>
              <TableHead>Claimed Rewards</TableHead>
              <TableHead>Lock Status</TableHead>
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {useCase.participants?.map((participant: Participant) => (
              <TableRow key={participant.address}>
                <TableCell className="font-medium">
                  {participant.address.slice(0, 6)}...
                  {participant.address.slice(-4)}
                </TableCell>
                <TableCell>
                  {formatEther(participant.pendingRewards)} PTX
                </TableCell>
                <TableCell>
                  {formatEther(participant.claimedRewards)} PTX
                </TableCell>
                <TableCell>
                  {participant.isLocked ? (
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
                          disabled={!participant.isLocked}
                        >
                          Reject Rewards
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Participant Rewards</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>
                            Are you sure you want to reject the rewards for this
                            participant? This action cannot be undone.
                          </p>
                          <div className="flex justify-end gap-4">
                            <Button variant="outline">Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={() =>
                                handleRejectReward(
                                  participant.address,
                                  participant.rewardIndex,
                                )
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
