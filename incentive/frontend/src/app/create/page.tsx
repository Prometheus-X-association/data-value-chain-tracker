"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";

const createUseCaseSchema = z.object({
  lockDuration: z.number().min(3600), // 1 hour minimum
  rewardPoolAmount: z.number().min(100), // Minimum pool size
  events: z.array(
    z.object({
      name: z.string().min(1),
      baseReward: z.number().min(1),
    }),
  ),
});

type CreateUseCaseForm = z.infer<typeof createUseCaseSchema>;

export default function CreateUseCasePage() {
  const { register, handleSubmit } = useForm<CreateUseCaseForm>();

  const onSubmit = async (data: CreateUseCaseForm) => {
    // Implement form submission
    console.log(data);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-3xl font-bold">Create Use Case</h1>
      {/* Add your form here */}
    </div>
  );
}
