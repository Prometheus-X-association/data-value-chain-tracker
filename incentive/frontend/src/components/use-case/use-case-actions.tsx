import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUseCase } from "@/hooks/use-use-case";
import { Pause, Play, Ban } from "lucide-react";

interface UseCaseActionsProps {
  useCaseId: bigint;
}

export function UseCaseActions({ useCaseId }: UseCaseActionsProps) {
  const { useCase, actions } = useUseCase(useCaseId);

  if (!useCase) return null;

  const handleToggleActive = async () => {
    try {
      if (useCase.stats.isActive) {
        await actions.pause();
      } else {
        await actions.unpause();
      }
      // Add toast notification for success
    } catch (error) {
      // Add toast notification for error
      console.error("Failed to toggle active state:", error);
    }
  };

  const handleBatchRejectRewards = async () => {
    try {
      const participants = useCase.participants?.map((p) => p.address) ?? [];
      const rewardIndices =
        useCase.participants?.map((p) => BigInt(p.rewardIndex)) ?? [];
      await actions.batchRejectRewards(participants, rewardIndices);
      // Add toast notification for success
    } catch (error) {
      // Add toast notification for error
      console.error("Failed to batch reject rewards:", error);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Use Case Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleToggleActive}
              variant={useCase.stats.isActive ? "destructive" : "default"}
              className="w-full"
            >
              {useCase.stats.isActive ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Use Case
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Activate Use Case
                </>
              )}
            </Button>
            <Button
              onClick={handleBatchRejectRewards}
              variant="destructive"
              className="w-full"
            >
              <Ban className="mr-2 h-4 w-4" />
              Reject All Pending Rewards
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
