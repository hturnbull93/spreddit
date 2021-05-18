import React from "react";
import {
  Box,
  Flex,
  Heading,
  LinkOverlay,
  LinkBox,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PostSnippetFragment } from "../generated/graphql";
import VoteControl from "./VoteControl";
import PostActionMenu from "./PostActionMenu";

interface PostCardProps {
  post: PostSnippetFragment;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const formattedDate = formatDistanceToNow(new Date(parseInt(post.createdAt)));

  return (
    <Box as="article" p={5} shadow="md" borderWidth="1px">
      <Flex justifyContent="space-between">
        <Box>
          <LinkBox>
            <Heading size="md">
              <NextLink href="/posts/[id]" as={`/posts/${post.id}`} passHref>
                <LinkOverlay>{post.title}</LinkOverlay>
              </NextLink>
            </Heading>
          </LinkBox>
          <Text>{`posted by ${post.creator.username} ${formattedDate} ago`}</Text>
          <Text mt={4}>{post.textSnippet}</Text>
        </Box>
        <Stack>
          <VoteControl post={post} />
          <PostActionMenu post={post} />
        </Stack>
      </Flex>
    </Box>
  );
};

export default PostCard;
