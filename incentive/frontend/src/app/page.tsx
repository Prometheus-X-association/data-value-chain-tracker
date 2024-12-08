"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { UseCaseCard } from "@/components/use-case/use-case-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useUseCaseContracts } from "@/hooks/useUseCaseContracts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { ownedUseCases, participatedUseCases, useCases, ptxBalance } =
    useUseCaseContracts();

  if (!isConnected) {
    return (
      <Container className="flex min-h-[80vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <PageHeader
            title="Welcome to the PTX Incentive Protocol"
            description="Connect your wallet to get started"
          />
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description={`Address: ${address} | Balance: ${ptxBalance} PTX`}
        />

        <Tabs defaultValue="owned" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="owned">
              My Use Cases ({ownedUseCases.length})
            </TabsTrigger>
            <TabsTrigger value="participated">
              Participated ({participatedUseCases.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Use Cases ({useCases.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owned">
            {ownedUseCases.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don&apos;t have any use cases yet. Create one to get
                  started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ownedUseCases.map((useCase) => (
                  <UseCaseCard
                    key={useCase.id.toString()}
                    id={useCase.id}
                    rewardPool={useCase.rewardPool}
                    remainingRewardPool={useCase.remainingRewardPool}
                    lockDuration={useCase.lockDuration}
                    eventCount={useCase.eventCount}
                    isActive={useCase.isActive}
                    owner={useCase.owner}
                    currentAddress={address}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="participated">
            {participatedUseCases.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You haven&apos;t participated in any use cases yet.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {participatedUseCases.map((useCase) => (
                  <UseCaseCard
                    key={useCase.id.toString()}
                    id={useCase.id}
                    rewardPool={useCase.rewardPool}
                    remainingRewardPool={useCase.remainingRewardPool}
                    lockDuration={useCase.lockDuration}
                    eventCount={useCase.eventCount}
                    isActive={useCase.isActive}
                    owner={useCase.owner}
                    currentAddress={address}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <UseCaseCard
                  key={useCase.id.toString()}
                  id={useCase.id}
                  rewardPool={useCase.rewardPool}
                  remainingRewardPool={useCase.remainingRewardPool}
                  lockDuration={useCase.lockDuration}
                  eventCount={useCase.eventCount}
                  isActive={useCase.isActive}
                  owner={useCase.owner}
                  currentAddress={address}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}
