import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../generated/graphql";
import Layout from "../components/Layout";
import NextLink from "next/link";
import { Center, Flex, Heading, Stack } from "@chakra-ui/layout";
import { Spinner } from "@chakra-ui/spinner";
import { Button } from "@chakra-ui/button";
import { useState } from "react";
import { POSTS_PAGINATION_LIMIT } from "../constants";
import PostCard from "../components/PostCard";

const Index = () => {
  const [variables, setVariables] = useState({
    limit: POSTS_PAGINATION_LIMIT,
    cursor: null as null | string,
  });
  const [{ fetching, data }] = usePostsQuery({ variables });
  return (
    <Layout>
      <Flex align="center" mb={8}>
        <Heading>Spreddit</Heading>
        <NextLink href="/create-post">
          <Button colorScheme="teal" ml="auto">
            Create post
          </Button>
        </NextLink>
      </Flex>
      {!data && fetching ? (
        <Center>
          <Spinner size="xl" />
        </Center>
      ) : (
        <>
          <Stack spacing={8}>
            {data!.posts.posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </Stack>
          <Flex>
            {data!.posts.hasMore ? (
              <Button
                isLoading={fetching}
                mx="auto"
                my={8}
                colorScheme="teal"
                onClick={() => {
                  setVariables({
                    limit: variables.limit,
                    cursor: data!.posts.posts[data!.posts.posts.length - 1]
                      .createdAt,
                  });
                }}
              >
                Load more
              </Button>
            ) : (
              <Center my={8} mx="auto">
                No more posts!
              </Center>
            )}
          </Flex>
        </>
      )}
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
