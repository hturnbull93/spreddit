import { Box, Flex, Heading, Link, Text } from "@chakra-ui/react";
import React from "react";
import { PostSnippetFragment } from "../generated/graphql";
import VoteControl from "./VoteControl";
import { formatDistanceToNow } from "date-fns";
import NextLink from "next/link";

interface PostCardProps {
  post: PostSnippetFragment;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const formattedDate = formatDistanceToNow(new Date(parseInt(post.createdAt)));
  return (
    <Box p={5} shadow="md" borderWidth="1px">
      <Flex justifyContent="space-between">
        <Box>
          <NextLink href="/posts/[id]" as={`/posts/${post.id}`}>
            <Link>
              <Heading size="md">{post.title}</Heading>
            </Link>
          </NextLink>
          <Text>{`posted by ${post.creator.username} ${formattedDate} ago`}</Text>
          <Text mt={4}>{post.textSnippet}</Text>
        </Box>
        <VoteControl post={post} />
      </Flex>
    </Box>
  );
};

export default PostCard;
