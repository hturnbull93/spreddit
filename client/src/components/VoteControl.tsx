import { TriangleUpIcon, TriangleDownIcon } from "@chakra-ui/icons";
import { Flex, IconButton } from "@chakra-ui/react";
import React, { useState } from "react";
import { PostVoteControlFragment, useVoteMutation } from "../generated/graphql";

interface VoteControlProps {
  post: PostVoteControlFragment & { [key: string]: any };
}

enum VoteValues {
  UP = 1,
  DOWN = -1,
}

const VoteControl: React.FC<VoteControlProps> = ({ post }) => {
  const [loading, setLoading] = useState<VoteValues | false>(false);
  const [_data, vote] = useVoteMutation();

  const voteClickHandlerGenerator = (value: VoteValues) => async () => {
    if (value === post.voteStatus) return;

    setLoading(value);
    await vote({
      postId: post.id,
      value,
    });
    setLoading(false);
  };

  const voteStatusIsUpVote = post.voteStatus === VoteValues.UP;
  const voteStatusIsDownVote = post.voteStatus === VoteValues.DOWN;

  return (
    <Flex direction="column" alignItems="center">
      <IconButton
        colorScheme={voteStatusIsUpVote ? "green" : "black"}
        aria-label="upvote post"
        size="xs"
        variant={voteStatusIsUpVote ? "solid" : "outline"}
        icon={<TriangleUpIcon size="24px" />}
        isLoading={loading === VoteValues.UP}
        onClick={voteClickHandlerGenerator(VoteValues.UP)}
      />
      {post.points}
      <IconButton
        colorScheme={voteStatusIsDownVote ? "red" : "black"}
        aria-label="downvote post"
        size="xs"
        variant={voteStatusIsDownVote ? "solid" : "outline"}
        icon={<TriangleDownIcon size="24px" />}
        isLoading={loading === VoteValues.DOWN}
        onClick={voteClickHandlerGenerator(VoteValues.DOWN)}
      />
    </Flex>
  );
};

export default VoteControl;
