import React from "react";
import { EditIcon, DeleteIcon } from "@chakra-ui/icons";
import {
  Menu,
  MenuButton,
  IconButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  useDeletePostMutation,
  PostActionFragment,
  useMeQuery,
} from "../generated/graphql";

interface PostActionMenuProps {
  post: PostActionFragment;
}

const PostActionMenu: React.FC<PostActionMenuProps> = ({ post }) => {
  const [{ data }] = useMeQuery();
  const [{ fetching }, deletePost] = useDeletePostMutation();

  if (data?.me?.id !== post.creator.id) return null;

  return (
    <Menu placement="bottom-end">
      <MenuButton
        size="sm"
        colorScheme="teal"
        as={IconButton}
        icon={<EditIcon />}
        aria-label="post menu"
      />
      <MenuList>
        <NextLink href="/posts/edit/[id]" as={`/posts/edit/${post.id}`}>
          <MenuItem icon={<EditIcon />}>Edit post</MenuItem>
        </NextLink>
        <MenuItem
          bg="red.100"
          _hover={{ bg: "red.200" }}
          icon={<DeleteIcon />}
          isLoading={fetching}
          onClick={() => deletePost({ id: post.id })}
        >
          Delete post
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

export default PostActionMenu;
