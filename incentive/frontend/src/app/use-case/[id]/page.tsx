"use client";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { useUseCaseContract } from "@/hooks/use-use-case-contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UseCaseOverview } from "@/components/use-case/use-case-overview";
import { UseCaseParticipants } from "@/components/use-case/use-case-participants";
import { UseCaseActions } from "@/components/use-case/use-case-actions";

export default function UseCasePage() {
  const { id } = useParams();
  const { address } = useAccount();
  const { useCase, isLoading } = useUseCaseContract();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!useCase) return <div>Use case not found</div>;

  const isOwner = address === useCase.owner;

  return (
    <Container>
      <div className="space-y-8">
        <PageHeader
          title={`Use Case #${id}`}
          description={`Created by ${useCase.owner}`}
        />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            {isOwner && <TabsTrigger value="actions">Actions</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview">
            <UseCaseOverview useCase={useCase} />
          </TabsContent>

          <TabsContent value="participants">
            <UseCaseParticipants
              useCaseId={BigInt(id as string)}
              isOwner={isOwner}
            />
          </TabsContent>

          {isOwner && (
            <TabsContent value="actions">
              <UseCaseActions useCaseId={BigInt(id as string)} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Container>
  );
}
