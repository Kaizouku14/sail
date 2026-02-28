import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { registerFormSchema, type RegisterFormSchema } from "./schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageRoutes } from "@/utils/constants";
import { authService } from "@/service/auth.service";
import { getApiErrorMessage } from "@/service/api";
import { sileo } from "sileo";
import { SubmitButton } from "@/components/form/submit-button";

const RegisterForm = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const navigate = useNavigate();

  const form = useForm<RegisterFormSchema>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: RegisterFormSchema) => {
    try {
      const data = await authService.register(values);

      sileo.success({
        title: "Registration successful",
        description: data.message,
      });

      navigate(PageRoutes.GAME);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error);

      sileo.error({
        title: "Registration failed",
        description: message,
      });
    }
  };

  const handleGuestContinue = () => {
    authService.continueAsGuest();
    navigate(PageRoutes.GAME);
  };

  return (
    <Card className="w-full max-w-sm h-fit bg-main-foreground/20">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your details below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="i.e. johndoe"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="i.e. john@example.com"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    {field.value && field.value.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="size-5" />
                        ) : (
                          <Eye className="size-5" />
                        )}
                      </button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2">
              <SubmitButton
                isSubmitting={isSubmitting}
                loadingText="Creating account..."
              >
                Register
              </SubmitButton>
              <Button
                type="button"
                variant="neutral"
                className="w-full"
                disabled={isSubmitting}
                onClick={handleGuestContinue}
              >
                Continue as Guest
              </Button>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <a
                  href={PageRoutes.LOGIN}
                  className="underline underline-offset-4"
                >
                  Sign in
                </a>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default RegisterForm;
