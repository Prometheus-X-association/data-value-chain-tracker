"use client";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { useUseCase } from "@/hooks/use-use-case";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UseCaseOverview } from "@/components/use-case/use-case-overview";
import { UseCaseParticipants } from "@/components/use-case/use-case-participants";
import { UseCaseActions } from "@/components/use-case/use-case-actions";
import { UseCaseDeposit } from "@/components/use-case/use-case-deposit";
import { Loader2 } from "lucide-react";

export default function UseCasePage() {
  const { id } = useParams();
  const { address } = useAccount();
  const { useCase, isLoading, error } = useUseCase(id as string);

  if (isLoading) {
    return (
      <Container className="flex min-h-[80vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading use case...</p>
        </div>
      </Container>
    );
  }

  if (error) return <div>Error: {error.message}</div>;
  if (!useCase) return <div>Use case not found</div>;

  const isOwner = address?.toLowerCase() === useCase.owner.toLowerCase();

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
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            {isOwner && <TabsTrigger value="manage">Manage</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview">
            <UseCaseOverview useCase={useCase} />
          </TabsContent>

          <TabsContent value="participants">
            <UseCaseParticipants useCaseId={id as string} isOwner={isOwner} />
          </TabsContent>

          <TabsContent value="deposit">
            <UseCaseDeposit useCaseId={id as string} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="manage">
              <UseCaseActions useCaseId={id as string} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Container>
  );
}
