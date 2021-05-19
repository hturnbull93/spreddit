import React from "react";
import { Center, Spinner } from "@chakra-ui/react";

interface LargeLoadingSpinnerProps {}

const LargeLoadingSpinner: React.FC<LargeLoadingSpinnerProps> = ({}) => {
  return (
    <Center>
      <Spinner size="xl" />
    </Center>
  );
};

export default LargeLoadingSpinner;
