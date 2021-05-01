import React, { useState } from "react";
import { Form, Formik } from "formik";
import { withUrqlClient } from "next-urql";
import { Alert, AlertIcon, Button } from "@chakra-ui/react";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { useForgotPasswordMutation } from "../generated/graphql";
import { createUrqlClient } from "../utils/createUrqlClient";

interface ForgotPasswordProps {}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({}) => {
  const [_data, forgotPassword] = useForgotPasswordMutation();
  const [success, setSuccess] = useState(false);
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: "" }}
        onSubmit={async (values) => {
          const response = await forgotPassword(values);
          if (response.data?.forgotPassword) {
            setSuccess(true);
          }
          return response;
        }}
      >
        {({ isSubmitting }) =>
          success ? (
            <Alert mt={4} mb={4} status="success">
              <AlertIcon />
              Password reset email sent!
            </Alert>
          ) : (
            <Form>
              <InputField
                name="email"
                placeholder="email"
                label="Email"
                type="email"
              />
              <Button
                mt={4}
                isLoading={isSubmitting}
                type="submit"
                colorScheme="teal"
              >
                Reset password
              </Button>
            </Form>
          )
        }
      </Formik>
    </Wrapper>
  );
};

export default withUrqlClient(createUrqlClient)(ForgotPassword);
