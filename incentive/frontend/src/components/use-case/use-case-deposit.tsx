import { useForm } from "react-hook-form";
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
import { useUseCase } from "@/hooks/use-use-case";
import { useTransaction } from "@/hooks/use-transaction";
import { parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import {
  TOKEN_ABI,
  TOKEN_ADDRESS,
  USECASE_CONTRACT_ADDRESS,
  USECASE_ABI,
} from "@/config/contracts";
import { useToast } from "@/hooks/use-toast";
import { waitForTransactionReceipt } from "@wagmi/core";
import { config } from "@/providers/web3";

const depositSchema = z.object({
  depositAmount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Amount must be a positive number"),
});

type DepositForm = z.infer<typeof depositSchema>;

export function UseCaseDeposit({ useCaseId }: { useCaseId: string }) {
  const { actions, refetch } = useUseCase(useCaseId);
  const { handleTransaction } = useTransaction();
  const { address } = useAccount();
  const { toast } = useToast();

  // Add check for use case existence
  const { data: useCaseInfo } = useReadContract({
    address: USECASE_CONTRACT_ADDRESS,
    abi: USECASE_ABI,
    functionName: "getUseCaseInfo",
    args: [useCaseId],
  });

  // Get user's token balance
  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const form = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      depositAmount: "0",
    },
  });

  // Get current allowance
  const { data: allowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: "allowance",
    args: address ? [address, USECASE_CONTRACT_ADDRESS] : undefined,
  });

  // Write contract for approval
  const { writeContractAsync: approve } = useWriteContract();

  const onSubmit = async (data: DepositForm) => {
    try {
      // Check if use case exists
      if (
        !useCaseInfo ||
        useCaseInfo.owner === "0x0000000000000000000000000000000000000000"
      ) {
        toast({
          title: "Error",
          description: "Use case does not exist",
          variant: "destructive",
        });
        return;
      }

      const amount = parseEther(data.depositAmount);

      // Check if user has enough tokens
      if (!tokenBalance || tokenBalance < amount) {
        toast({
          title: "Error",
          description: "Insufficient token balance",
          variant: "destructive",
        });
        return;
      }

      // Check if approval is needed
      if (!allowance || allowance < amount) {
        console.log(
          "Approval needed. Current allowance:",
          allowance?.toString(),
        );
        // Request approval
        try {
          const hash = await approve({
            address: TOKEN_ADDRESS,
            abi: TOKEN_ABI,
            functionName: "approve",
            args: [USECASE_CONTRACT_ADDRESS, amount],
            gas: 100000n, // Set a higher gas limit
          });

          console.log("Approval transaction hash:", hash);

          // Wait for the approval transaction to be mined
          await waitForTransactionReceipt(config, { hash });

          toast({
            title: "Success",
            description: "Token approval successful",
          });
        } catch (error) {
          console.error("Approval error:", error);
          toast({
            title: "Error",
            description: "Failed to approve tokens. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Proceed with deposit
      try {
        console.log("Attempting deposit with amount:", amount.toString());
        await handleTransaction(() => actions.depositRewards(amount), {
          successMessage: "Rewards deposited successfully",
          errorMessage: "Failed to deposit rewards",
          onSuccess: () => refetch(),
        });
      } catch (error) {
        console.error("Deposit error:", error);
        toast({
          title: "Error",
          description: "Failed to deposit rewards. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("General error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit(onSubmit)(e);
        }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Deposit Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="depositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Amount"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, "");
                          // Ensure only one decimal point
                          const parts = value.split(".");
                          if (parts.length > 2) {
                            field.onChange(
                              parts[0] + "." + parts.slice(1).join(""),
                            );
                          } else {
                            field.onChange(value);
                          }
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
            <Button type="submit" className="mt-4">
              Deposit
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
