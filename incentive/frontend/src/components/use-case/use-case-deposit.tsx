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

const depositSchema = z.object({
  depositAmount: z.number().min(0),
});

type DepositForm = z.infer<typeof depositSchema>;

export function UseCaseDeposit({ useCaseId }: { useCaseId: string }) {
  const { actions, refetch } = useUseCase(useCaseId);
  const { handleTransaction } = useTransaction();

  const form = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      depositAmount: 0,
    },
  });

  const onSubmit = async (data: DepositForm) => {
    await handleTransaction(
      () => actions.depositRewards(parseEther(data.depositAmount.toString())),
      {
        successMessage: "Rewards deposited successfully",
        errorMessage: "Failed to deposit rewards",
        onSuccess: () => refetch(),
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={async (e) => {
        e.preventDefault();
        await form.handleSubmit(onSubmit)(e);
      }} className="space-y-6">
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
            <Button type="submit" className="mt-4">
              Deposit
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
