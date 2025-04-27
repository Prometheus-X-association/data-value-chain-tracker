"use client";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { useContractEvents, type EventType } from "@/hooks/use-contract-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatEther } from "viem";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const EVENT_TYPES: EventType[] = [
  "RewardTransfer",
  "RewardsClaimed",
  "RewardsDeposited",
  "RewardsLocked",
  "UseCaseCreated",
  "EmergencyWithdrawal",
];

export default function EventsPage() {
  const [selectedEventType, setSelectedEventType] = useState<EventType | "all">(
    "all",
  );
  const { events, isLoading } = useContractEvents(
    selectedEventType === "all" ? undefined : [selectedEventType],
  );

  if (isLoading) {
    return (
      <Container className="flex min-h-[80vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading events...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-8">
        <PageHeader
          title="Contract Events"
          description="Track all events in the system"
        />
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Events</CardTitle>
              <Select
                value={selectedEventType}
                onValueChange={(value: EventType | "all") =>
                  setSelectedEventType(value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={`${event.eventName}-${event.blockNumber}-${event.transactionHash}`}
                  className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{event.eventName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const timestamp = Number(event.blockTimestamp);
                        if (isNaN(timestamp)) return "Invalid date";
                        const date = new Date(timestamp * 1000);
                        if (isNaN(date.getTime())) return "Invalid date";
                        return formatDistanceToNow(date, { addSuffix: true });
                      })()}
                    </p>
                    {event.eventName === "RewardTransfer" && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          From: {event.args.from.slice(0, 6)}...
                          {event.args.from.slice(-4)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          To: {event.args.to.slice(0, 6)}...
                          {event.args.to.slice(-4)}
                        </p>
                      </>
                    )}
                    {event.eventName === "RewardsClaimed" && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Use Case: {event.args.useCaseId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Participant: {event.args.participant.slice(0, 6)}...
                          {event.args.participant.slice(-4)}
                        </p>
                      </>
                    )}
                    {event.eventName === "RewardsDeposited" && (
                      <p className="text-sm text-muted-foreground">
                        Use Case: {event.args.useCaseId}
                      </p>
                    )}
                    {event.eventName === "RewardsLocked" && (
                      <p className="text-sm text-muted-foreground">
                        Use Case: {event.args.useCaseId}
                      </p>
                    )}
                    {event.eventName === "UseCaseCreated" && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          ID: {event.args.id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Owner: {event.args.owner.slice(0, 6)}...
                          {event.args.owner.slice(-4)}
                        </p>
                      </>
                    )}
                    {event.eventName === "EmergencyWithdrawal" && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Use Case: {event.args.useCaseId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Owner: {event.args.owner.slice(0, 6)}...
                          {event.args.owner.slice(-4)}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    {"amount" in event.args && (
                      <p className="font-medium">
                        {formatEther(event.args.amount)} PTX
                      </p>
                    )}
                    {"lockupPeriod" in event.args && (
                      <p className="text-sm text-muted-foreground">
                        Lockup:{" "}
                        {Number(event.args.lockupPeriod) / (24 * 60 * 60)} days
                      </p>
                    )}
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
