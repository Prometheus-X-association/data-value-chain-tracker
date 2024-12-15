"use client";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { useRewardTransfers } from "@/hooks/use-reward-transfers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatEther } from "viem";
import { formatDistanceToNow } from "date-fns";

export default function RewardsPage() {
  const { transfers, isLoading } = useRewardTransfers();

  if (isLoading) {
    return (
      <Container className="flex min-h-[80vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading reward transfers...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-8">
        <PageHeader
          title="Reward Transfers"
          description="Track all reward transfers in the system"
        />
        <Card>
          <CardHeader>
            <CardTitle>Recent Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transfers.map((transfer) => (
                <div
                  key={transfer.transactionHash}
                  className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      From: {transfer.from.slice(0, 6)}...
                      {transfer.from.slice(-4)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      To: {transfer.to.slice(0, 6)}...{transfer.to.slice(-4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(transfer.timestamp * 1000, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatEther(transfer.amount)} PTX
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transfer.incentiveType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
