import { Box, Button } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import { withUrqlClient } from "next-urql";
import Error from "next/error";
import { useRouter } from "next/router";
import React from "react";
import InputField from "../../../components/InputField";
import Layout from "../../../components/Layout";
import { useUpdatePostMutation } from "../../../generated/graphql";
import { createUrqlClient } from "../../../utils/createUrqlClient";
import { useGetPostFromUrl } from "../../../utils/useGetPostFromUrl";
import { useIsAuth } from "../../../utils/useIsAuth";
import LargeLoadingSpinner from "../../../components/LargeLoadingSpinner";

interface EditPostProps {}

const EditPost: React.FC<EditPostProps> = () => {
  const router = useRouter();
  const { isAuth, fetching: authFetching } = useIsAuth();
  const [{ fetching, error, data }] = useGetPostFromUrl();
  const [_data, updatePost] = useUpdatePostMutation();

  const layoutLoadingSpinner = (
    <Layout>
      <LargeLoadingSpinner />
    </Layout>
  );

  if (fetching || authFetching) return layoutLoadingSpinner;

  const notFoundError = (
    <Error statusCode={404} title="This post could not be found" />
  );
  if (error) return notFoundError;
  if (!data?.post) return notFoundError;

  const { post } = data;

  if (isAuth?.id !== post.creator.id) {
    router.replace(`/posts/${post.id}`);
    return layoutLoadingSpinner;
  }

  return (
    <Layout variant="small">
      <Formik
        initialValues={{ title: post.title, text: post.text }}
        onSubmit={async (values) => {
          const { error } = await updatePost({
            id: data!.post!.id,
            input: values,
          });
          if (!error) {
            router.push(`/posts/${post.id}`);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField name="title" placeholder="title" label="Title" />
            <Box mt={4}>
              <InputField
                name="text"
                placeholder="text..."
                label="Body"
                textArea
              />
            </Box>
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              colorScheme="teal"
            >
              Update post
            </Button>
          </Form>
        )}
      </Formik>
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient)(EditPost);
