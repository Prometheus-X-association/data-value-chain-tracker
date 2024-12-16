import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useUseCase } from "@/hooks/use-use-case";
import { useTransaction } from "@/hooks/use-transaction";
import { parseEther } from "viem";

const managementSchema = z.object({
  lockupPeriod: z.number().min(3600, "Minimum 1 hour required"),
  participants: z.array(
    z.object({
      address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
      rewardShare: z.number().min(0).max(100),
    }),
  ),
  fixedRewards: z.array(
    z.object({
      address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
      fixedReward: z.number().min(0),
    }),
  ),
});

type ManagementForm = z.infer<typeof managementSchema>;

export function UseCaseActions({ useCaseId }: { useCaseId: string }) {
  const { useCase, actions, refetch } = useUseCase(useCaseId);
  const { handleTransaction } = useTransaction();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const form = useForm<ManagementForm>({
    resolver: zodResolver(managementSchema),
    defaultValues: {
      lockupPeriod: 3600,
      participants:
        useCase?.participants.map((p) => ({
          address: p.participant,
          rewardShare: Number(p.rewardShare) / 100,
        })) || [],
      fixedRewards: [],
    },
  });

  const {
    fields: participantFields,
    append: appendParticipant,
    remove: removeParticipant,
  } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const {
    fields: fixedRewardFields,
    append: appendFixedReward,
    remove: removeFixedReward,
  } = useFieldArray({
    control: form.control,
    name: "fixedRewards",
  });

  const onSubmit = async (data: ManagementForm) => {
    try {
      switch (activeAction) {
        case "lock":
          void handleTransaction(
            () => actions.lockRewards(BigInt(data.lockupPeriod)),
            {
              successMessage: "Rewards locked successfully",
              errorMessage: "Failed to lock rewards",
              onSuccess: () => refetch(),
            },
          );
          break;

        case "updateShares":
          const addresses = data.participants.map(
            (p) => p.address as `0x${string}`,
          );
          const shares = data.participants.map((p) =>
            BigInt(p.rewardShare * 100),
          );
          void handleTransaction(
            () => actions.updateRewardShares(addresses, shares),
            {
              successMessage: "Reward shares updated successfully",
              errorMessage: "Failed to update reward shares",
              onSuccess: () => refetch(),
            },
          );
          break;

        case "addFixedRewards":
          const rewardAddresses = data.fixedRewards.map(
            (p) => p.address as `0x${string}`,
          );
          const fixedRewards = data.fixedRewards.map((p) =>
            parseEther(p.fixedReward.toString()),
          );
          void handleTransaction(
            () => actions.addFixedRewards(rewardAddresses, fixedRewards),
            {
              successMessage: "Fixed rewards added successfully",
              errorMessage: "Failed to add fixed rewards",
              onSuccess: () => {
                refetch();
                form.setValue("fixedRewards", []); // Clear fixed rewards after successful addition
              },
            },
          );
          break;
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lock Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="lockupPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lockup Period (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="3600"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          field.onChange(Number(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="mt-4"
                onClick={() => setActiveAction("lock")}
                disabled={useCase?.rewardsLocked}
              >
                Lock Rewards
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Update Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {participantFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`participants.${index}.address`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`participants.${index}.rewardShare`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel>Reward Share</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Share"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^0-9.]/g,
                                  "",
                                );
                                field.onChange(Number(value));
                              }}
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <span className="text-sm text-muted-foreground">
                                %
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParticipant(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    appendParticipant({ address: "0x", rewardShare: 0 })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Participant
                </Button>
                <div>
                  <Button
                    type="submit"
                    onClick={() => setActiveAction("updateShares")}
                    disabled={useCase?.rewardsLocked}
                  >
                    Update Shares
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Fixed Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fixedRewardFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`fixedRewards.${index}.address`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`fixedRewards.${index}.fixedReward`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel>Fixed Reward</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Fixed"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^0-9.]/g,
                                  "",
                                );
                                field.onChange(Number(value));
                              }}
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <span className="text-sm text-muted-foreground">
                                PTX
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFixedReward(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    appendFixedReward({ address: "0x", fixedReward: 0 })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fixed Reward
                </Button>
                <div>
                  <Button
                    type="submit"
                    onClick={() => setActiveAction("addFixedRewards")}
                  >
                    Add Fixed Rewards
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
