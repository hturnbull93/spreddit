import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../generated/graphql";
import Layout from "../components/Layout";
import NextLink from "next/link";
import { Box, Center, Flex, Heading, Stack, Text } from "@chakra-ui/layout";
import { Spinner } from "@chakra-ui/spinner";
import { Button } from "@chakra-ui/button";
import { useState } from "react";

const Index = () => {
  const [variables, setVariables] = useState({
    limit: 10,
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
              <Box key={p.id} p={5} shadow="md" borderWidth="1px">
                <Heading fontSize="xl">{p.title}</Heading>
                <Text mt={4}>{p.textSnippet}</Text>
              </Box>
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
