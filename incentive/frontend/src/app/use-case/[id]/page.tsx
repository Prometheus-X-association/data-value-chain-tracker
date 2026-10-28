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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

function UseCaseUnavailable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl space-y-4">
        <Alert>
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{children}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </Container>
  );
}

function getDisplayUseCaseName(id: string) {
  if (!id) return id;
  if (!id.startsWith("http://") && !id.startsWith("https://") && id.includes(":")) {
    return id.split(":")[0];
  }

  return id;
}

export default function UseCasePage() {
  const { id } = useParams();
  const { address } = useAccount();
  const decodedUseCaseId = decodeURIComponent(String(id));
  const { useCase, metadata, isLoading, error } = useUseCase(decodedUseCaseId);

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

  const notFound = error ? String(error.message).includes("UseCaseDoesNotExist") : !useCase;
  if (notFound) {
    return (
      <UseCaseUnavailable title="Use case not found">
        No use case <strong>{getDisplayUseCaseName(decodedUseCaseId)}</strong> exists on the current
        chain. It may never have been created, or the local demo chain was reset since then.
      </UseCaseUnavailable>
    );
  }
  if (error || !useCase) {
    return (
      <UseCaseUnavailable title="The use case could not be loaded">
        The blockchain node did not answer as expected. Try again in a moment.
      </UseCaseUnavailable>
    );
  }

  const isOwner = address?.toLowerCase() === useCase.owner.toLowerCase();
  const displayName = metadata?.useCaseName || getDisplayUseCaseName(decodedUseCaseId);

  return (
    <Container>
      <div className="space-y-8">
        <PageHeader
          title={`Use Case #${displayName}`}
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
            <UseCaseParticipants useCaseId={decodedUseCaseId} isOwner={isOwner} />
          </TabsContent>

          <TabsContent value="deposit">
            <UseCaseDeposit useCaseId={decodedUseCaseId} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="manage">
              <UseCaseActions useCaseId={decodedUseCaseId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Container>
  );
}
