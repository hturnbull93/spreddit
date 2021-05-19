import React from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/layout";
import { withUrqlClient } from "next-urql";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { usePostQuery } from "../../generated/graphql";
import { createUrqlClient } from "../../utils/createUrqlClient";
import Error from "next/error";
import { formatDistanceToNow } from "date-fns";
import VoteControl from "../../components/VoteControl";
import LargeLoadingSpinner from "../../components/LargeLoadingSpinner";

interface PostProps {}

const Post: React.FC<PostProps> = () => {
  const router = useRouter();
  const { id } = router.query;
  const intId = typeof id === "string" ? parseInt(id) : NaN;

  const [{ fetching, error, data }] = usePostQuery({
    pause: isNaN(intId),
    variables: {
      id: intId,
    },
  });

  if (fetching) {
    return (
      <Layout>
        <LargeLoadingSpinner />
      </Layout>
    );
  }

  const errorPage = (
    <Error statusCode={404} title="This post could not be found" />
  );
  if (error) return errorPage;
  if (!data?.post) return errorPage;

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
