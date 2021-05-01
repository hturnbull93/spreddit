import React from "react";
import { Form, Formik } from "formik";
import { NextPage } from "next";
import { Button } from "@chakra-ui/react";
import Wrapper from "../../components/Wrapper";
import InputField from "../../components/InputField";

const ChangePassword: NextPage<{ token: string }> = ({ token }) => {
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ newPassword: "" }}
        onSubmit={async (values) => {
          console.log("values", values);
          console.log("token", token);
          // const response = await forgotPassword(values);
          // if (response.data?.login.errors) {
          //   setErrors(toErrorMap(response.data.login.errors));
          // } else if (response.data?.login.user) {
          //   router.push("/");
          // }
          // return response;
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="newPassword"
              placeholder="new password"
              label="New password"
              type="password"
            />
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              colorScheme="teal"
            >
              Change password
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

ChangePassword.getInitialProps = ({ query }) => {
  return {
    token: query.token as string,
  };
};

export default ChangePassword;
