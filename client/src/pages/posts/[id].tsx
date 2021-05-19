import React from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/layout";
import { withUrqlClient } from "next-urql";
import Layout from "../../components/Layout";
import { createUrqlClient } from "../../utils/createUrqlClient";
import Error from "next/error";
import { formatDistanceToNow } from "date-fns";
import VoteControl from "../../components/VoteControl";
import { useGetPostFromUrl } from "../../utils/useGetPostFromUrl";
import LargeLoadingSpinner from "../../components/LargeLoadingSpinner";

interface PostProps {}

const Post: React.FC<PostProps> = () => {
  const [{ fetching, error, data }] = useGetPostFromUrl();

  if (fetching) {
    return (
      <Layout>
        <LargeLoadingSpinner />
      </Layout>
    );
  }

  const notFoundError = (
    <Error statusCode={404} title="This post could not be found" />
  );
  if (error) return notFoundError;
  if (!data?.post) return notFoundError;

  const { post } = data;
  const formattedDate = formatDistanceToNow(
    new Date(parseInt(post!.createdAt)),
  );
  return (
    <Layout>
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Heading size="xl">{post.title}</Heading>
          <Text>{`posted by ${post.creator.username} ${formattedDate} ago`}</Text>
          <Text my={8}>{post.text}</Text>
        </Box>
        <Box mx={8}>
          <Box position="fixed">
            <VoteControl post={post} />
          </Box>
        </Box>
      </Flex>
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Post);
