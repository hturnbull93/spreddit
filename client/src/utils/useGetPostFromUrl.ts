import { useRouter } from "next/router";
import { usePostQuery } from "../generated/graphql";

export const useGetPostFromUrl = () => {
  const router = useRouter();
  const { id } = router.query;
  const intId = typeof id === "string" ? parseInt(id) : NaN;

  return usePostQuery({
    pause: isNaN(intId),
    variables: {
      id: intId,
    },
  });
};
