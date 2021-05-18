import React from "react";
import { Box, Flex, Heading, Link } from "@chakra-ui/layout";
import NextLink from "next/link";
import { useLogoutMutation, useMeQuery } from "../generated/graphql";
import { Button } from "@chakra-ui/button";
import { isServer } from "../utils/isServer";
import { MAX_PAGE_WIDTH } from "../constants";

interface NavBarProps {}

const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ fetching: logoutFetching }, logout] = useLogoutMutation();
  const [{ data, fetching }] = useMeQuery({
    pause: isServer(),
  });

  let body;
  if (fetching) {
    body = null;
  } else if (!data?.me) {
    body = (
      <Flex alignItems="center">
        <NextLink href="/login">
          <Link as={Button} colorScheme="white" mr={4} fontWeight="bold">
            Log in
          </Link>
        </NextLink>
        <NextLink href="/register">
          <Link color="white">Register</Link>
        </NextLink>
      </Flex>
    );
  } else {
    body = (
      <Flex alignItems="center">
        <NextLink href="/create-post">
          <Link as={Button} colorScheme="white" mx={4}>
            Create post
          </Link>
        </NextLink>
        <Box mx={2}>{data.me.username}</Box>
        <Button
          mx={2}
          variant="link"
          color="white"
          onClick={() => logout()}
          isLoading={logoutFetching}
        >
          Log out
        </Button>
      </Flex>
    );
  }

  return (
    <Flex zIndex={100} position="sticky" top={0} bg="teal" p={4}>
      <Flex flex={1} maxW={MAX_PAGE_WIDTH} mx="auto" alignItems="center">
        <NextLink href="/">
          <Link color="white">
            <Heading size="md">Spreddit</Heading>
          </Link>
        </NextLink>
        <Flex ml="auto">{body}</Flex>
      </Flex>
    </Flex>
  );
};

export default NavBar;
