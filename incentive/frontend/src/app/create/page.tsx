"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { useToast } from "@/hooks/use-toast";
import { parseEther } from "viem";
import { useWriteContract } from "wagmi";
import { USECASE_CONTRACT_ADDRESS, USECASE_ABI } from "@/config/contracts";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { type Address } from "viem";

const createUseCaseSchema = z.object({
  useCaseId: z.string().min(1, "Use case ID is required"),
  advanced: z.boolean().default(false),
  participants: z
    .array(
      z.object({
        address: z
          .string()
          .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
          .transform((val): Address => val as Address),
        rewardShare: z.number().min(0).max(100),
        fixedReward: z.number().min(0),
      }),
    )
    .optional(),
});

type CreateUseCaseForm = z.infer<typeof createUseCaseSchema>;

export default function CreateUseCasePage() {
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();
  const [isAdvanced, setIsAdvanced] = useState(false);

  const form = useForm<CreateUseCaseForm>({
    resolver: zodResolver(createUseCaseSchema),
    defaultValues: {
      useCaseId: "",
      advanced: false,
      participants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const onSubmit = async (data: CreateUseCaseForm) => {
    try {
      if (!data.advanced) {
        // Simple creation
        await writeContractAsync({
          address: USECASE_CONTRACT_ADDRESS,
          abi: USECASE_ABI,
          functionName: "createUseCase",
          args: [data.useCaseId],
        });
      } else {
        // Advanced creation with participants
        const participants = data.participants?.map((p) => p.address) || [];
        const shares =
          data.participants?.map((p) => BigInt(p.rewardShare * 100)) || [];
        const fixedRewards =
          data.participants?.map((p) => parseEther(p.fixedReward.toString())) ||
          [];

        await writeContractAsync({
          address: USECASE_CONTRACT_ADDRESS,
          abi: USECASE_ABI,
          functionName: "createUseCaseWithParticipants",
          args: [data.useCaseId, participants, shares, fixedRewards],
        });
      }

      toast({
        title: "Success",
        description: "Use case created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create use case",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  return (
    <Container>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Fields */}
          <FormField
            control={form.control}
            name="useCaseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Use Case ID</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center space-x-2">
            <Switch
              checked={isAdvanced}
              onCheckedChange={(checked) => {
                setIsAdvanced(checked);
                form.setValue("advanced", checked);
              }}
            />
            <Label>Advanced Creation</Label>
          </div>

          {/* Advanced Fields */}
          {isAdvanced && (
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4">
                    <FormField
                      control={form.control}
                      name={`participants.${index}.address`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Address" {...field} />
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
                    <FormField
                      control={form.control}
                      name={`participants.${index}.fixedReward`}
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
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({ address: "0x", rewardShare: 0, fixedReward: 0 })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Participant
                </Button>
              </CardContent>
            </Card>
          )}

          <Button type="submit">Create Use Case</Button>
        </form>
      </Form>
    </Container>
  );
}
