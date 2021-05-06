import React, { InputHTMLAttributes } from "react";
import { useField } from "formik";
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
} from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Textarea } from "@chakra-ui/textarea";

type InputFieldProps = InputHTMLAttributes<
  HTMLInputElement & HTMLTextAreaElement
> & {
  label: string;
  name: string;
  textArea?: boolean;
};

const InputField: React.FC<InputFieldProps> = ({
  label,
  size: _size,
  textArea,
  ...props
}) => {
  let InputOrTextarea = textArea ? Textarea : Input;
  const [field, { error }] = useField(props);
  return (
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <InputOrTextarea {...field} {...props} id={field.name} />
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
};

export default InputField;
